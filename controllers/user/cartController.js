const ProductV2 = require('../../models/productsSchemaV2');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Coupon = require('../../models/couponSchema');

const loadCartPage = async (req, res) => {
    try {
        const userId = req.session.user;
        const [userData, cart] = await Promise.all([
            User.findById(userId),
            Cart.findOne({ userId }).populate('items.productId')
        ]);

        let outOfStockMessage = null;
        let cartItemCount = req.session.cartItemCount || 0;
        const message = req.flash('message')[0];

        let userCart = cart;
        if (!userCart) {
            userCart = new Cart({ userId, items: [] });
            await userCart.save();
            await User.findByIdAndUpdate(userId, { $push: { cart: userCart._id } });
        }

        if (userCart.items.length === 0) {
            if (userCart.coupon) {
                const coupon = await Coupon.findById(userCart.coupon);
                if (coupon) {
                    coupon.usedCount.set(userId.toString(), coupon.usedCount.get(userId.toString()) - 1);
                    coupon.totalUsed -= 1;
                    await coupon.save();
                }
                userCart.coupon = null;
                await userCart.save();
            }

            return res.render('cart', {
                user: userData,
                cartItems: [],
                subTotal: 0,
                total: 0,
                cartItemCount,
                couponDiscount: 0,
                couponName: 'NA',
                outOfStockMessage,
                deliveryCharge: 0,
                message: message,
            });
        }

        let newSubTotal = 0;
        const cartItems = userCart.items.map((item) => {
            const product = item.productId;
            const variant = product.variants[item.variantId];

            if (!variant || variant.stock <= 0) {
                item.quantity = 0;
                outOfStockMessage = "Some items in your cart are out of stock and have been set to zero.";
            } else if (item.quantity === 0 && variant.stock > 0) {
                item.quantity = 1;
            }

            if (item.quantity > variant.stock) {
                item.quantity = variant.stock;
            }

            const itemTotal = item.quantity * variant.salePrice;
            newSubTotal += itemTotal;

            return {
                productId: product._id,
                variantId: item.variantId,
                name: product.productName,
                color: variant.color,
                size: variant.size || 'NA',
                image: variant.images[0] || '/img/no-image.png',
                price: variant.salePrice,
                quantity: item.quantity,
                total: itemTotal,
            };
        });

        userCart.subTotal = newSubTotal;

        let couponDiscount = 0;
        let couponName = 'NA';
        let validCoupon = null;

        if (userCart.coupon) {
            validCoupon = await Coupon.findById(userCart.coupon);
            if (!validCoupon || !validCoupon.isActive) {
                userCart.coupon = null;
                if (validCoupon) {
                    validCoupon.usedCount.set(userId.toString(), validCoupon.usedCount.get(userId.toString()) - 1);
                    validCoupon.totalUsed -= 1;
                    await validCoupon.save();
                }
                await userCart.save();
            } else {
                couponName = validCoupon.name;

                const applicableCategories = validCoupon.applicableCategories.map(id => id.toString());
                const applicableProducts = validCoupon.applicableProducts.map(id => id.toString());

                let eligibleAmount = 0;

                cartItems.forEach(item => {
                    const productCategory = item.productId.categoryId ? item.productId.categoryId.toString() : null;
                    let isEligible = false;

                    if (applicableCategories.includes('all')) {
                        isEligible = applicableProducts.includes(item.productId._id.toString()) || applicableProducts.includes('all');
                    } else if (applicableProducts.includes('all')) {
                        isEligible = applicableCategories.includes(productCategory);
                    } else {
                        isEligible = applicableProducts.includes(item.productId._id.toString()) || applicableCategories.includes(productCategory);
                    }

                    if (isEligible) {
                        eligibleAmount += item.total;
                    }
                });

                if (eligibleAmount >= validCoupon.minimumOrderAmount) {
                    if (validCoupon.discountType === 'percentage') {
                        couponDiscount = (eligibleAmount * validCoupon.discountValue) / 100;
                    } else {
                        couponDiscount = validCoupon.discountValue;
                    }

                    if (validCoupon.maxDiscount && couponDiscount > validCoupon.maxDiscount) {
                        couponDiscount = validCoupon.maxDiscount;
                    }
                } else {
                    userCart.coupon = null;
                    validCoupon.usedCount.set(userId.toString(), validCoupon.usedCount.get(userId.toString()) - 1);
                    validCoupon.totalUsed -= 1;
                    await validCoupon.save();
                    await userCart.save();
                    couponName = null;
                }
            }
        }
        req.session.cartItemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
        cartItemCount = req.session.cartItemCount || 0;
        if (cartItems.length === 1 && cartItems[0].quantity === 0) {
            userCart.deliveryCharge = 0;
        } else {
            userCart.deliveryCharge = userCart.subTotal - couponDiscount < 10000 ? 79 : 0;
        }
        userCart.total = Math.max(userCart.subTotal - couponDiscount, 0) + userCart.deliveryCharge;
        await userCart.save();

        res.render('cart', {
            cartItems,
            subTotal: userCart.subTotal,
            total: userCart.total,
            user: userData,
            couponDiscount,
            outOfStockMessage,
            cartItemCount,
            couponName,
            deliveryCharge: userCart.deliveryCharge || 0,
            message: message,
        });
    } catch (error) {
        console.error("Error loading cart:", error);
        res.status(500).send('Error fetching cart data');
    }
};


const addToCart = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(400).json({ success: false, message: 'Please login to add products to cart' });
        }

        const { productId, variantId, quantity } = req.body;
        const userId = req.session.user;

        const product = await ProductV2.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const variant = product.variants[variantId];
        if (!variant) {
            return res.status(404).json({ success: false, message: 'Variant not found' });
        }

        if (quantity > variant.stock) {
            return res.status(400).json({
                success: false,
                message: `Not enough stock available for this variant. Only ${variant.stock} item(s) left in stock.`,
            });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
            await cart.save();
            await User.findByIdAndUpdate(userId, { $push: { cart: cart._id } });
        }

        let itemExists = false;

        cart.items = cart.items.map(item => {
            if (item.productId.toString() === productId && item.variantId === variantId) {
                itemExists = true;
                if (item.quantity + quantity > 5) {
                    return res.status(400).json({
                        success: false,
                        message: `Maximum cart quantity: 5`,
                    });
                }
                if (item.quantity + quantity > variant.stock) {
                    return res.status(400).json({
                        success: false,
                        message: `Item in cart! Insufficient stock`,
                    });
                }
                item.quantity += quantity;
            }
            return item;
        });

        if (!itemExists) {
            cart.items.push({ productId, variantId, quantity });
        }

        let cartSubTotal = 0;
        for (let item of cart.items) {
            const itemProduct = await ProductV2.findById(item.productId);
            if (itemProduct) {
                const itemVariant = itemProduct.variants[item.variantId];
                if (itemVariant) {
                    cartSubTotal += itemVariant.salePrice * item.quantity;
                }
            }
        }

        cart.subTotal = cartSubTotal;
        cart.deliveryCharge = cartSubTotal < 10000 ? 79 : 0;
        cart.total = cart.subTotal + cart.deliveryCharge;

        const updatedCart = await cart.save();

        const cartItemCount = cart.items.reduce((total, item) => total + item.quantity, 0);
        req.session.cartItemCount = cartItemCount;

        res.json({ success: true, message: 'Successfully added to cart.', cart });

    } catch (err) {
        console.error('Error adding to cart:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


const removeProductFromCart = async (req, res) => {
    try {
        const { productId } = req.params;
        const { variantId } = req.query;
        const userId = req.session.user;

        const parsedVariantId = isNaN(variantId) ? variantId : parseInt(variantId);

        await Cart.updateOne(
            { userId },
            { $pull: { items: { productId, variantId: parsedVariantId } } }
        );

        const updatedCart = await Cart.findOne({ userId });

        if (!updatedCart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        const productIds = updatedCart.items.map(item => item.productId);
        const products = await ProductV2.find({ _id: { $in: productIds } });

        let totalAmount = 0;
        updatedCart.items = updatedCart.items.filter(item => {
            const product = products.find(p => p._id.toString() === item.productId.toString());
            const variant = product?.variants[item.variantId];

            if (!variant || variant.stock <= 0) {
                return false;
            }

            totalAmount += item.quantity * variant.salePrice;
            return true;
        });

        updatedCart.subTotal = totalAmount;
        updatedCart.deliveryCharge = updatedCart.items.length === 0 ? 0 : (totalAmount < 10000 ? 79 : 0);
        updatedCart.total = totalAmount + updatedCart.deliveryCharge;

        await updatedCart.save();

        const cartItemCount = updatedCart.items.reduce((total, item) => total + item.quantity, 0);
        req.session.cartItemCount = cartItemCount;

        return res.status(200).json({ message: "Item removed successfully", cart: updatedCart });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: "Failed to remove item" });
    }
};


const applyCoupon = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Please log in to apply a coupon' });
        }

        const { couponCode } = req.body;
        const userId = req.session.user;

        let cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty' });
        }

        const coupon = await Coupon.findOne({ name: couponCode, isActive: true });
        if (!coupon) {
            return res.status(404).json({ success: false, message: 'Invalid or expired coupon' });
        }

        const now = new Date();
        if (now < coupon.startOn || now > coupon.expireOn) {
            return res.status(400).json({ success: false, message: 'Coupon has expired or is not yet active' });
        }

        if (coupon.totalUsageLimit !== null && coupon.totalUsed >= coupon.totalUsageLimit) {
            return res.status(400).json({ success: false, message: 'Coupon usage limit exceeded' });
        }

        const userUsage = coupon.usedCount.get(userId.toString()) || 0;
        if (userUsage >= coupon.usageLimitPerUser) {
            return res.status(400).json({ success: false, message: 'You have already used this coupon the maximum number of times' });
        }

        let eligibleAmount = 0;
        let newSubTotal = 0;
        const applicableCategories = coupon.applicableCategories.map(id => id.toString());
        const applicableProducts = coupon.applicableProducts.map(id => id.toString());

        cart.items.forEach(item => {
            const product = item.productId;
            const variant = product.variants[item.variantId];
            const salePrice = variant.salePrice;

            if (!product) return;

            newSubTotal += item.quantity * salePrice;

            const productCategory = product.categoryId ? product.categoryId.toString() : null;
            let isEligible = false;

            if (applicableCategories.includes('all')) {
                isEligible = applicableProducts.includes(product._id.toString()) || applicableProducts.includes('all');
            } else if (applicableProducts.includes('all')) {
                isEligible = applicableCategories.includes(productCategory);
            } else {
                isEligible = applicableProducts.includes(product._id.toString()) || applicableCategories.includes(productCategory);
            }

            if (isEligible) {
                eligibleAmount += item.quantity * salePrice;
            }
        });

        cart.subTotal = newSubTotal;

        if (eligibleAmount < coupon.minimumOrderAmount) {
            return res.status(400).json({ success: false, message: `Your cart does not meet the minimum order amount of ₹${coupon.minimumOrderAmount}` });
        }

        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (eligibleAmount * coupon.discountValue) / 100;
        } else {
            discountAmount = coupon.discountValue;
        }

        if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
            discountAmount = coupon.maxDiscount;
        }

        const newTotal = newSubTotal - discountAmount;

        cart.total = newTotal > 0 ? newTotal : 0;
        cart.coupon = coupon._id;

        await cart.save();

        coupon.usedCount.set(userId.toString(), userUsage + 1);
        coupon.totalUsed += 1;
        await coupon.save();

        return res.json({
            success: true,
            message: 'Coupon applied successfully',
            subTotal: cart.subTotal,
            discount: discountAmount,
            total: cart.total,
            cart
        });

    } catch (err) {
        console.error('Error applying coupon:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user;
        const cart = await Cart.findOne({ userId });

        if (!cart || !cart.coupon) {
            return res.status(400).json({ success: false, message: 'No coupon applied' });
        }

        const coupon = await Coupon.findById(cart.coupon);

        cart.coupon = null;
        cart.total = cart.subTotal;
        coupon.usedCount.set(userId.toString(), coupon.usedCount.get(userId.toString()) - 1);
        coupon.totalUsed -= 1;

        await coupon.save();
        await cart.save();

        res.json({ success: true, message: 'Coupon removed successfully' });
    } catch (error) {
        console.error("Error removing coupon:", error);
        res.status(500).json({ success: false, message: 'Failed to remove coupon' });
    }
}

const getCoupons = async (req, res) => {
    try {
        const currentDate = new Date();

        const availableCoupons = await Coupon.find({
            isActive: true,
            expireOn: { $gte: currentDate },
        }).select("name discountType discountValue minimumOrderAmount")
            .sort({ discountValue: -1 });

        res.json({ status: true, coupons: availableCoupons });
    } catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).json({ status: false, message: "Internal Server Error" });
    }
}


module.exports = {
    addToCart,
    loadCartPage,
    removeProductFromCart,
    applyCoupon,
    removeCoupon,
    getCoupons,
}