const ProductV2 = require('../../models/productsSchemaV2');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Orders = require('../../models/orderSchema');
const Coupon = require('../../models/couponSchema');
const Wallet = require('../../models/walletSchema');
const formatDate = require('../../helpers/formatDate');
const env = require('dotenv').config();
const crypto = require("crypto");
const Razorpay = require('razorpay');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET,
});

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
    let subTotal = 0;
    let totalPrice = 0;
    let saleTotal = 0;

    const products = await ProductV2.find({
      '_id': { $in: cartItems.map(item => item.productId) }
    });

    for (const item of cartItems) {
      const product = products.find(p => p._id.toString() === item.productId.toString());
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

      totalPrice += item.quantity * variant.regularPrice;
      saleTotal += item.quantity * variant.salePrice;
      subTotal += item.quantity * variant.regularPrice;
    }

    let discountAmount = totalPrice - saleTotal;
    let finalAmount = saleTotal;

    const newOrder = new Orders({
      userId: userId,
      orderItems: cartItems.map(item => {
        const product = products.find(p => p._id.toString() === item.productId.toString());
        const variant = product.variants[item.variantId];

        return {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          salePrice: variant.salePrice,
          regularPrice: variant.regularPrice,
          ItemStatus: 'Placed'
        };
      }),
      subTotal,
      totalPrice,
      discount: discountAmount,
      finalAmount,
      address: selectedAddress,
      additionalNote,
      payment: {
        amountPaid: finalAmount,
        method: paymentMethod,
        status: 'Pending',
      },
      status: 'Pending',
    });

    const updateStock = async () => {
      for (const item of cartItems) {
        const product = await ProductV2.findById(item.productId);
        const variant = product.variants[item.variantId];
        variant.stock -= item.quantity;
        await product.save();
      }
    };

    if (paymentMethod === 'cod') {
      newOrder.payment.status = 'Pending';
      newOrder.status = 'Placed';
      newOrder.orderItems = newOrder.orderItems.map(item => {
        item.itemStatus = 'Placed';
        return item;
      });
      await newOrder.save();
      await updateStock();

      await User.findByIdAndUpdate(userId, { $push: { orderHistory: newOrder._id } });
      cart.items = [];
      await cart.save();
      req.session.cartItemCount = 0;

      return res.json({ success: true, message: 'Order placed successfully with Cash on Delivery.', orderId: newOrder._id });
    }

    if (paymentMethod === 'wallet') {
      const wallet = await Wallet.findOne({ userId: userId });
      if (!wallet || wallet.balance < finalAmount) {
        return res.status(400).json({ success: false, message: 'Insufficient wallet balance.' });
      }

      wallet.balance -= finalAmount;

      const walletTransaction = {
        type: 'debit',
        amount: finalAmount,
        description: `Payment for order ${newOrder.orderId}`,
        orderId: newOrder._id,
        transactionCategory: 'order_payment',
        balanceAfterTransaction: wallet.balance,
      };

      wallet.transactions.push(walletTransaction);
      await wallet.save();

      newOrder.payment.status = 'Completed';
      newOrder.status = 'Placed';
      newOrder.orderItems = newOrder.orderItems.map(item => {
        item.itemStatus = 'Placed';
        return item;
      });
      await newOrder.save();

      await updateStock();

      await User.findByIdAndUpdate(userId, { $push: { orderHistory: newOrder._id } });

      cart.items = [];
      await cart.save();
      req.session.cartItemCount = 0;

      return res.json({ success: true, message: 'Order placed successfully using Wallet.', orderId: newOrder._id });
    }

    if (paymentMethod === 'razorpay') {
      try {
        const razorpayOrder = await razorpay.orders.create({
          amount: finalAmount * 100,
          currency: 'INR',
          receipt: `order_${newOrder._id}`,
          payment_capture: 1
        });

        newOrder.payment.transactionId = razorpayOrder.id;
        await newOrder.save();
        await User.findByIdAndUpdate(userId, { $push: { orderHistory: newOrder._id } });

        return res.json({
          success: true,
          message: 'Razorpay order created successfully.',
          razorpayOrderId: razorpayOrder.id,
          orderId: newOrder._id,
          key:process.env.RAZORPAY_KEY,
        });
      } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to create Razorpay order.' });
      }
    }

    return res.status(400).json({ success: false, message: 'Invalid payment method.' });
  } catch (error) {
    console.log('Error:', error);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const verifyRazorpayPayment = async (req, res) => {
  try {
    const { orderId, razorpayPaymentId, razorpaySignature } = req.body;

    const order = await Orders.findById(orderId);
    if (!order || order.payment.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Invalid or already processed order.' });
    }

    const razorpayOrderId = order.payment.transactionId;

    const secret = process.env.RAZORPAY_SECRET;
    const data = razorpayOrderId + '|' + razorpayPaymentId;
    const generatedSignature = crypto.createHmac('sha256', secret)
      .update(data)
      .digest('hex');

    console.log('Generated Signature:', generatedSignature);
    console.log('Received Signature:', razorpaySignature);

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: 'Payment verification failed. Signature mismatch.' });
    }

    order.payment.status = 'Completed';
    order.status = 'Placed';
    order.orderItems = order.orderItems.map(item => {
      item.itemStatus = 'Placed';
      return item;
    });

    await order.save();

    const updateStock = async () => {
      for (const item of order.orderItems) {
        const product = await ProductV2.findById(item.productId);
        if (product) {
          const variant = product.variants[item.variantId];
          if (variant) {
            variant.stock -= item.quantity;
            await product.save();
          }
        }
      }
    };

    await updateStock();

    const userId = order.userId;
    const user = await User.findById(userId).populate('cart');
    if (user && user.cart && user.cart.length > 0) {
      const cart = user.cart[0];
      cart.items = [];
      await cart.save();
      req.session.cartItemCount = 0;
    }

    res.json({ success: true, message: 'Payment verified and order confirmed.' });
  } catch (error) {
    console.error('Razorpay Payment Verification Error:', error);
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

            const variant = product.variants[item.variantId] || {};

            return {
              productId: item.productId,
              productName: product.productName || "N/A",
              variantDetails: {
                color: variant.color || "N/A",
                size: variant.size || "N/A",
                salePrice: item.salePrice,
                regularPrice: item.regularPrice,
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

const returnRequest = async (req, res) => {
  try {
    const { orderId, productId, variantIndex, returnReason } = req.body;

    const order = await Orders.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const item = order.orderItems.find(
      (i) =>
        i.productId.toString() === productId.toString() &&
        i.variantId === Number(variantIndex)
    );

    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found in order." });
    }

    if (item.itemStatus !== "Delivered") {
      return res.status(400).json({
        success: false,
        message: "Return request can only be made for delivered items.",
      });
    }

    const deliveredOnDate = new Date(item.deliveredOn);
    const currentDate = new Date();
    const daysDifference = Math.floor(
      (currentDate - deliveredOnDate) / (1000 * 60 * 60 * 24)
    );

    if (daysDifference > 14) {
      return res.status(400).json({
        success: false,
        message: "Return request must be made within 14 days of delivery.",
      });
    }

    item.itemStatus = "Return Request";
    item.returnReason = returnReason;
    order.status = 'Partial Return';

    await order.save();

    res.json({
      success: true,
      message: "Return request submitted successfully.",
    });
  } catch (error) {
    console.error("Error processing return request:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
}



module.exports = {
  placeOrder,
  loadOrderPage,
  cancelOrder,
  cancelItemOrder,
  returnRequest,
  verifyRazorpayPayment
}