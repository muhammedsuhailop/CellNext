const ProductV2 = require('../../models/productsSchemaV2');
const Cart = require('../../models/cartSchema');
const User = require('../../models/userSchema');
const Orders = require('../../models/orderSchema');
const Coupon = require('../../models/couponSchema');
const Wallet = require('../../models/walletSchema');
const formatDate = require('../../helpers/formatDate');
const env = require('dotenv').config();
const path = require('path');
const crypto = require("crypto");
const Razorpay = require('razorpay');
const PDFDocument = require('pdfkit');
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
        return res.status(400).json({ success: false, message: `Selected variant not found for ${product.productName}.` });
      }

      if (item.quantity > 5) {
        return res.status(400).json({ success: false, message: `Maximum cart quantity for ${product.productName}: 5` });
      }

      if (item.quantity > variant.stock) {
        return res.status(400).json({ success: false, message: `Insufficient stock for ${product.productName}` });
      }

      totalPrice += item.quantity * variant.regularPrice;
      saleTotal += item.quantity * variant.salePrice;
      subTotal += item.quantity * variant.regularPrice;
    }

    let discountAmount = totalPrice - saleTotal;
    let finalAmount = saleTotal;
    let couponDiscount = 0;
    let coupon = cart.coupon
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
      if (userUsage > coupon.usageLimitPerUser) {
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
        discountAmount = (saleTotal * coupon.discountValue) / 100;
      } else {
        discountAmount = coupon.discountValue;
      }

      if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
        discountAmount = coupon.maxDiscount;
      }

      couponDiscount = discountAmount;
      finalAmount = saleTotal - discountAmount;
      deliveryCharge = finalAmount < 10000 ? 79 : 0;
      discountAmount = totalPrice - finalAmount;
      finalAmount += deliveryCharge;
    }

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
      couponApplied: validCoupon,
      couponDiscount: couponDiscount,
      coupon,
      deliveryCharge,
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
      cart.coupon = null;
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
      cart.coupon = null;
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
          key: process.env.RAZORPAY_KEY,
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
      cart.coupon = null;
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
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const totalOrders = await Orders.countDocuments({ _id: { $in: orderIds } });
    const totalPages = Math.ceil(totalOrders / limit);

    const orders = await Orders.find({ _id: { $in: orderIds } })
      .populate('address')
      .populate('userId', 'name email')
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const orderDetails = await Promise.all(
      orders.map(async (order) => {
        const items = await Promise.all(
          order.orderItems.map(async (item) => {
            const product = await ProductV2.findById(item.productId).exec();
            if (!product) {
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
        let couponName = "NA";
        if (order.couponApplied && order.coupon) {
          const coupon = await Coupon.findById(order.coupon).select("name").lean();
          if (coupon) couponName = coupon.name;
        }

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
          couponDiscount: order.couponDiscount,
          couponName,
        };
      })
    );

    const cartItemCount = req.session.cartItemCount || 0;

    res.render('orders', {
      user: userData,
      orderDetails,
      cartItemCount,
      currentPage: page,
      totalPages,
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

const generateInvoicePDF = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Orders.findById(orderId).lean();

    if (!order) {
      return res.status(404).send('Order not found.');
    }

    if (order.status !== 'Delivered') {
      return res.status(400).send('Invoice is available only for delivered orders.');
    }

    const productIds = order.orderItems.map(item => item.productId);
    const products = await ProductV2.find({ _id: { $in: productIds } }).lean();
    const productMap = {};
    products.forEach(product => {
      productMap[product._id.toString()] = product.variants.map(variant => ({
        productName: product.productName,
        color: variant.color || 'NA',
        size: variant.size && variant.size !== 'NA' ? variant.size : '',
      }));
    });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${order.orderId}.pdf"`);
    doc.pipe(res);

    const fontPath = path.join(__dirname, '../../public/fonts', 'DejaVuSans.ttf');
    doc.registerFont('DejaVu', fontPath);
    doc.font('DejaVu');

    doc.fontSize(24).text('CellNext', { align: 'center' }).moveDown(0.5);
    doc.fontSize(18).text('Invoice', { align: 'center' }).moveDown(1);

    doc.fontSize(10)
      .text(`Order ID: ${order.orderId}`)
      .text(`Order Date: ${new Date(order.createdOn).toLocaleDateString('en-IN')}`)
      .text(`Invoice Date: ${new Date(order.invoiceDate).toLocaleDateString('en-IN')}`)
      .moveDown(1);

    doc.fontSize(10).text('Billing Summary', { underline: true }).moveDown(0.5);
    doc.text(`Total Price: ₹${(order.totalPrice).toLocaleString('en-IN')}`);
    doc.text(`Discount: ₹${(order.discount).toLocaleString('en-IN')}`);
    doc.text(`Coupon Discount: ₹${(order.couponDiscount || 0).toLocaleString('en-IN')}`);
    doc.text(`Final Amount: ₹${(order.finalAmount).toLocaleString('en-IN')}`, { font: 'bold' }).moveDown(1.5);

    doc.fontSize(14).text('Order Items', { underline: true }).moveDown(0.5);

    const startX = 50;
    const tableTop = doc.y;
    const columnWidths = [350, 0, 30, 110, 100, 100];

    doc.fontSize(10);
    doc.text('Product Name', startX, tableTop, { width: columnWidths[0], align: 'left' });
    doc.text('Qty', startX + columnWidths[0] + columnWidths[1], tableTop, { width: columnWidths[2], align: 'center' });
    doc.text('Price', startX + columnWidths[0] + columnWidths[1], tableTop, { width: columnWidths[3], align: 'right' });
    // doc.text('Delivered On', startX + columnWidths[0] + columnWidths[1] + columnWidths[3], tableTop, { width: columnWidths[4], align: 'center' });
    // doc.text('Status', startX + columnWidths[0] + columnWidths[1] + columnWidths[3] + columnWidths[4], tableTop, { width: columnWidths[5], align: 'center' });

    doc.moveTo(startX, tableTop + 20).lineTo(doc.page.width - doc.page.margins.right, tableTop + 20).stroke();

    const rowSpacing = 25;

    let rowY = tableTop + 25;
    order.orderItems.forEach(item => {
      const productDetails = productMap[item.productId.toString()];
      const variantDetails = productDetails ? productDetails[item.variantId] : null;

      const productName = variantDetails ? variantDetails.productName : 'Unknown Product';
      const variantColor = variantDetails ? variantDetails.color : 'N/A';
      const variantSize = variantDetails && variantDetails.size ? ` | ${variantDetails.size}` : '';
      const deliveredOn = item.deliveredOn ? new Date(item.deliveredOn).toLocaleDateString('en-IN') : 'N/A';
      let finalItemPrice = item.salePrice * item.quantity;

      doc.fontSize(10);
      doc.text(`${productName} ${variantColor} ${variantSize}`, startX, rowY, { width: columnWidths[0], align: 'left' });
      doc.text(String(item.quantity), startX + columnWidths[0] + columnWidths[1], rowY, { width: columnWidths[2], align: 'center' });
      doc.text(`₹${finalItemPrice.toLocaleString('en-IN')}`, startX + columnWidths[0] + columnWidths[1], rowY, { width: columnWidths[3], align: 'right' });
      // doc.text(deliveredOn, startX + columnWidths[0] + columnWidths[1] + columnWidths[3], rowY, { width: columnWidths[4], align: 'center' });
      // doc.text(item.itemStatus, startX + columnWidths[0] + columnWidths[1] + columnWidths[3] + columnWidths[4], rowY, { width: columnWidths[5], align: 'center' });

      rowY += rowSpacing;
    });

    doc.moveDown(2);

    const leftColumnX = 50;

    const pageBottom = doc.page.height - doc.page.margins.bottom - 130;

    doc.y = pageBottom - 20;
    doc.text(` `, leftColumnX);
    doc.fontSize(10).text('Payment Details', { underline: true }).moveDown(0.5);
    doc.fontSize(8).text(`Payment Status: ${(order.payment.status).toLocaleString('en-IN')}`);
    doc.text(`Payment Method: ${(order.payment.method)}`);
    doc.text(`Transaction ID: ${(order.payment.transactionId).toLocaleString('en-IN')}`);
    doc.text(`Total Payed: ₹${(order.finalAmount || 0).toLocaleString('en-IN')}`);
    doc.text(`Payment Date: ${new Date(order.payment.paymentDate).toLocaleDateString('en-IN')}`, { font: 'bold' }).moveDown(1.5);
    doc.fontSize(10).text('Thank you for your purchase!', { align: 'center' }).moveDown(1);

    doc.moveTo(50, pageBottom + 95).lineTo(doc.page.width - 50, pageBottom + 95).stroke();
    doc.fontSize(7)
      .text(`This is a computer-generated invoice.| generated on ${new Date().toLocaleDateString('en-IN')}`, doc.x, pageBottom + 100, { align: 'center' })

    doc.end();
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    res.status(500).send('Error generating invoice PDF');
  }
};




module.exports = {
  placeOrder,
  loadOrderPage,
  cancelOrder,
  cancelItemOrder,
  returnRequest,
  verifyRazorpayPayment,
  generateInvoicePDF,
}