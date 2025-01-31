const ProductV2 = require('../../models/productsSchemaV2');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Orders = require('../../models/orderSchema');

const placeOrder = async (req, res) => {
  try {
    const { selectedAddress, orderDetails, paymentMethod } = req.body;

    const ordDetails = orderDetails || 'No additional details provided.';

    if (!selectedAddress || !ordDetails || !paymentMethod) {
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

    const products = await ProductV2.find({
      '_id': { $in: cartItems.map(item => item.productId) }
    });

    for (const item of cartItems) {
      const productIdStr = item.productId.toString().trim();
      const product = products.find(p => p._id.toString().trim() === productIdStr);
      console.log('product in for loop', product);

      if (!product) {
        console.error(`Product not found for ID: ${productIdStr}`);
        console.error('Fetched Products:', products.map(p => p._id.toString().trim()));
        console.error('Cart Items:', cartItems.map(item => item._id.toString().trim()));
        return res.status(400).json({ success: false, message: "One or more products not found." });
      }

      let variant;
      variant = product.variants[item.variantId];
      console.log('variant in for loop', variant, "id", item.variantId)

      if (!variant) {
        console.error(`Variant not found for ID: ${item.variantId} in product: ${product.name}`);
        return res.status(400).json({ success: false, message: `Selected variant not found for ${product.name}.` });
      }

      if (item.quantity > 5) {
        return res.status(400).json({ success: false, message: `Maximum cart quantity for ${product.name}: 5` });
      }

      if (item.quantity > variant.stock) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.name}` });
      }

      totalPrice += item.quantity * (variant.salePrice || variant.regularPrice);
    }

    const newOrder = new Orders({
      userId: userId,
      orderItems: cartItems.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
      })),
      totalPrice: totalPrice,
      finalAmount: totalPrice,
      address: selectedAddress,
      orderDetails: ordDetails,
      payment: {
        amountPaid: totalPrice,
        method: paymentMethod,
        status: 'Pending',
      },
      status: 'Pending',
    });

    await newOrder.save();

    const order_id = newOrder._id;
    const orderId = newOrder.orderId;
    await User.findByIdAndUpdate(userId, {
      $push: { orderHistory: order_id }
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
    await cart.save();

    res.json({ success: true, message: 'Order placed successfully!', orderId });
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

    console.log('orders ..', orders)

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
                regularPrice: variant.regularPrice,
                productDiscount: variant.regularPrice - variant.salePrice
              },
              quantity: item.quantity,
              itemStatus: item.itemStatus,
              cancellationReason: item.cancellationReason || "N/A",
            };
          })
        );

        const validItems = items.filter((item) => item !== null);

        const totalDiscount = validItems.reduce((sum, item) => {
          return sum + (item.variantDetails.productDiscount * item.quantity);
        }, 0);

        return {
          orderId: order.orderId,
          orderDate: order.createdOn,
          status: order.status,
          totalPrice: order.totalPrice,
          specialDiscount: order.discount,
          discount: totalDiscount,
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

    console.log('orderDetails...', orderDetails);
    res.render('orders', {
      user: userData,
      orderDetails
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.redirect('/pageNotFound');
  }
}
module.exports = {
  placeOrder,
  loadOrderPage,
}