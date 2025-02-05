const ProductV2 = require('../../models/productsSchemaV2');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Orders = require('../../models/orderSchema');
const Coupon = require('../../models/couponSchema');

const placeOrder = async (req, res) => {
  try {
    const { selectedAddress, orderDetails, paymentMethod } = req.body;
    const additionalNote = orderDetails || 'No additional details provided.';

    if (!selectedAddress || !paymentMethod) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    const userId = req.session.user;
    const user = await User.findById(userId).populate('cart');

    if (!user || !user.cart || user.cart.length === 0 || user.cart[0].items.length === 0) {
      return res.status(400).json({ success: false, message: 'Your cart is empty or invalid.' });
    }

    const cart = user.cart[0];
    const cartItems = cart.items;
    let totalPrice = 0;
    const coupon = await Coupon.findById(cart.coupon);

    const products = await ProductV2.find({
      '_id': { $in: cartItems.map(item => item.productId) }
    });

    let subTotal = 0;

    for (const item of cartItems) {
      const productIdStr = item.productId.toString().trim();
      const product = products.find(p => p._id.toString().trim() === productIdStr);

      if (!product) {
        return res.status(400).json({ success: false, message: "One or more products not found." });
      }

      let variant = product.variants[item.variantId];
      if (!variant) {
        return res.status(400).json({ success: false, message: `Selected variant not found for ${product.name}.` });
      }

      if (item.quantity > 5) {
        return res.status(400).json({ success: false, message: `Maximum cart quantity for ${product.name}: 5` });
      }

      if (item.quantity > variant.stock) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
      }

      totalPrice += item.quantity * variant.salePrice;
      subTotal += item.quantity * variant.regularPrice;
    }

    let discountAmount = 0;
    let finalAmount = subTotal;
    let validCoupon = false;

    if (cart.coupon) {
      const coupon = await Coupon.findById(cart.coupon);

      if (!coupon || !coupon.isActive) {
        cart.coupon = null;
        coupon.usedCount.set(userId.toString(), coupon.usedCount.get(userId.toString()) - 1);
        coupon.totalUsed -= 1;
        await coupon.save();
        await cart.save();
        return res.status(400).json({ success: false, message: 'Coupon is no longer valid and has been removed.' });
      }

      const now = new Date();
      if (now < coupon.startOn || now > coupon.expireOn) {
        cart.coupon = null;
        coupon.usedCount.set(userId.toString(), coupon.usedCount.get(userId.toString()) - 1);
        coupon.totalUsed -= 1;
        await coupon.save();
        await cart.save();
        return res.status(400).json({ success: false, message: 'Coupon has expired and has been removed.' });
      }

      if (coupon.totalUsageLimit !== null && coupon.totalUsed >= coupon.totalUsageLimit) {
        cart.coupon = null;
        coupon.usedCount.set(userId.toString(), coupon.usedCount.get(userId.toString()) - 1);
        coupon.totalUsed -= 1;
        await coupon.save();
        await cart.save();
        return res.status(400).json({ success: false, message: 'Coupon usage limit exceeded and has been removed.' });
      }

      const userUsage = coupon.usedCount.get(userId.toString()) || 0;
      if (userUsage >= coupon.usageLimitPerUser) {
        cart.coupon = null;
        coupon.usedCount.set(userId.toString(), coupon.usedCount.get(userId.toString()) - 1);
        coupon.totalUsed -= 1;
        await coupon.save();
        await cart.save();
        return res.status(400).json({ success: false, message: 'You have already used this coupon the maximum number of times. It has been removed.' });
      }

      if (totalPrice < coupon.minimumOrderAmount) {
        cart.coupon = null;
        coupon.usedCount.set(userId.toString(), coupon.usedCount.get(userId.toString()) - 1);
        coupon.totalUsed -= 1;
        await coupon.save();
        await cart.save();
        return res.status(400).json({ success: false, message: `Your cart does not meet the minimum order amount of ₹${coupon.minimumOrderAmount}. Coupon removed.` });
      }

      validCoupon = true;

      if (coupon.discountType === 'percentage') {
        discountAmount = (totalPrice * coupon.discountValue) / 100;
      } else {
        discountAmount = coupon.discountValue;
      }

      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }

      finalAmount = totalPrice - discountAmount;
      discountAmount = subTotal - finalAmount;

    }

    const newOrder = new Orders({
      userId: userId,
      orderItems: cartItems.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      totalPrice: totalPrice,
      discount: discountAmount,
      finalAmount: finalAmount,
      address: selectedAddress,
      additionalNote: additionalNote,
      payment: {
        amountPaid: finalAmount,
        method: paymentMethod,
        status: 'Pending',
      },
      status: 'Pending',
    });

    await newOrder.save();

    await User.findByIdAndUpdate(userId, {
      $push: { orderHistory: newOrder._id }
    });

    for (const item of cartItems) {
      await ProductV2.findOneAndUpdate(
        { _id: item.productId },
        { $inc: { [`variants.${item.variantId}.stock`]: -item.quantity } }
      );
    }

    cart.items = [];
    cart.subTotal = 0;
    cart.total = 0;
    cart.coupon = null;
    await cart.save();

    req.session.cartItemCount = 0;

    res.json({
      success: true,
      message: 'Order placed successfully!',
      orderId: newOrder.orderId,
      discount: discountAmount,
      finalAmount: finalAmount,
    });
  } catch (error) {
    console.log('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};


const loadOrderPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);

    const user = await User.findById(userId).select('orderHistory').exec();

    if (!user) {
      return res.status(404).send('User not found');
    }

    const orderIds = user.orderHistory;

    const orders = await Orders.find({ _id: { $in: orderIds } })
      .populate('address')
      .populate('userId', 'name email')
      .exec();

    console.log('orders ..', orders);

    const orderDetails = await Promise.all(
      orders.map(async (order) => {
        const items = await Promise.all(
          order.orderItems.map(async (item) => {
            const product = await ProductV2.findById(item.productId).exec();

            if (!product) {
              console.error(`Error: Product not found for item ${item._id}`);
              return null;
            }

            const variants = Array.isArray(product.variants) ? product.variants : [];
            const variant = variants[item.variantId] || {};

            return {
              productId: product._id,
              productName: product.productName,
              variantDetails: {
                color: variant.color || "N/A",
                size: variant.size || "N/A",
                price: variant.salePrice,
              },
              quantity: item.quantity,
              itemStatus: item.itemStatus,
              cancellationReason: item.cancellationReason || "N/A",
              variantIndex: item.variantId,
            };
          })
        );

        const validItems = items.filter((item) => item !== null);

        return {
          _id: order._id,
          orderId: order.orderId,
          orderDate: order.createdOn,
          status: order.status,
          totalPrice: order.totalPrice,
          discount: order.discount,
          finalAmount: order.finalAmount,
          couponApplied: order.couponApplied,
          paymentMethod: order.payment.method,
          paymentStatus: order.payment.status,
          address: order.address,
          user: order.userId,
          items: validItems,
        };
      })
    );

    const cartItemCount = req.session.cartItemCount || 0;

    console.log('orderDetails...', orderDetails);
    res.render('orders', {
      user: userData,
      orderDetails,
      cartItemCount,
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.redirect('/pageNotFound');
  }
};


const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Orders.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    order.status = "Cancel Request";

    order.orderItems.forEach((item) => {
      item.itemStatus = "Cancel Request";
    });

    await order.save();

    res.json({ message: "Order cancellation requested successfully." });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

const cancelItemOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { productId, variantIndex } = req.body;

    const order = await Orders.findById(orderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    console.log(productId, variantIndex);
    console.log(order.orderItems);

    const item = order.orderItems.find(i => i.productId.toString() === productId.toString() && i.variantId === Number(variantIndex));
    if (!item) return res.status(404).json({ message: "Item not found in order" });

    item.itemStatus = "Cancel Request";

    order.status = "Cancel Request";

    await order.save();

    res.json({ message: "Item cancellation requested successfully." });
  } catch (error) {
    console.error("Error updating item status:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}


module.exports = {
  placeOrder,
  loadOrderPage,
  cancelOrder,
  cancelItemOrder
}