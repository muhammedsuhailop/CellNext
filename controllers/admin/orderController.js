const Orders = require('../../models/orderSchema');
const ProductV2 = require('../../models/productsSchemaV2');
const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Wallet = require('../../models/walletSchema');
const { v4: uuidv4 } = require('uuid');

const getOrders = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const skip = (page - 1) * limit;

        const query = {};
        if (search) {
            query.orderId = { $regex: search, $options: 'i' };
        }

        const orders = await Orders.find(query)
            .populate('userId', 'name email')
            .populate('address')
            .sort({ createdOn: -1 })
            .skip(skip)
            .limit(limit)
            .exec();

        const totalOrders = await Orders.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        if (!orders || orders.length === 0) {
            const successMessage = req.flash('success');
            const errorMessage = req.flash('error');
            return res.status(404).render('admin-orders', {
                orders: [],
                totalPages: 0,
                currentPage: page,
                searchQuery: search,
                searchAction: '/admin/orders',
                messages: {
                    success: successMessage.length > 0 ? successMessage[0] : null,
                    error: errorMessage.length > 0 ? errorMessage[0] : null,
                },
            });
        }

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
                            productName: product.productName || "NA",
                            variantDetails: {
                                color: variant.color || "NA",
                                size: variant.size || "NA",
                                salePrice: item.salePrice,
                                regularPrice: item.regularPrice,
                            },
                            quantity: item.quantity,
                            itemStatus: item.itemStatus,
                            cancellationReason: item.cancellationReason || "NA",
                        };
                    })
                );

                const validItems = items.filter((item) => item !== null);

                return {
                    orderId: order._id,
                    refId: order.orderId,
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
                    additionalNote: order.additionalNote || 'Nil'
                };
            })
        );

        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');

        res.render('admin-orders', {
            orders: orderDetails,
            totalPages: totalPages,
            currentPage: page,
            searchQuery: search,
            searchAction: '/admin/orders',
            messages: {
                success: successMessage.length > 0 ? successMessage[0] : null,
                error: errorMessage.length > 0 ? errorMessage[0] : null,
            },
        });
    } catch (error) {
        console.error('Error listing orders:', error);
        res.redirect('/admin/error-page');
    }
};


const updateStatus = async (req, res) => {
    try {
        const { orderId, newStatus } = req.body;

        if (!orderId || !newStatus) {
            return res.status(400).json({ error: 'Order ID and new status are required.' });
        }

        const order = await Orders.findById(orderId).populate('userId');
        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        const allowedTransitions = {
            "Pending": ["Placed", "Shipped", "Cancelled"],
            "Placed": ["Shipped", "Cancelled"],
            "Shipped": ["Delivered"],
            "Delivered": [],
            "Cancelled": [],
            "Returned": ["Delivered"],
            "Cancel Request": ["Placed", "Cancelled", "Shipped"],
            "Return Request": ['Returned', 'Delivered']
        };

        if (!allowedTransitions[order.status]?.includes(newStatus)) {
            return res.status(400).json({ error: `Cannot change status from ${order.status} to ${newStatus}.` });
        }

        if (newStatus === "Cancelled" || newStatus === "Returned") {
            for (const item of order.orderItems) {
                const product = await ProductV2.findById(item.productId);
                if (!product) continue;

                if (newStatus === "Cancelled") {
                    const variant = product.variants[item.variantId];
                    if (variant) {
                        variant.stock += item.quantity;
                        item.itemStatus = newStatus;
                    }

                    await product.save();
                }

            }

            if (order.payment.status === "Completed" || order.payment.status === "Partially Refunded") {
                const userWallet = await Wallet.findOne({ userId: order.userId._id });

                if (userWallet) {
                    const refundAmount = order.payment.finalAmount;

                    const newTransaction = {
                        transactionId: uuidv4(),
                        type: 'credit',
                        amount: refundAmount,
                        description: `Refund for ${newStatus.toLowerCase()} order ${order.orderId}`,
                        orderId: order._id,
                        transactionCategory: 'refund',
                        balanceAfterTransaction: userWallet.balance + refundAmount
                    };

                    userWallet.transactions.push(newTransaction);
                    userWallet.balance += refundAmount;
                    await userWallet.save();
                    order.payment.status = "Refunded";
                }
            }
        } else {
            for (const item of order.orderItems) {
                item.itemStatus = newStatus;
                if (newStatus === 'Delivered' && !item.deliveredOn) {
                    item.deliveredOn = new Date();
                }
            }
        }

        if (newStatus === "Delivered" && order.payment.method === "cod") {
            order.payment.status = "Completed";
            order.payment.paymentDate = new Date();
            order.payment.transactionId = `COD-${orderId}-${Date.now()}`;
        }

        order.status = newStatus;
        await order.save();

        res.status(200).json({ message: 'Order status updated successfully!', updatedOrder: order });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};


const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;

        const order = await Orders.findById(orderId)
            .populate('userId', 'name email')
            .populate('address')
            .exec();

        if (!order) {
            return res.status(404).render('admin/order-details', {
                order: null,
                message: 'Order not found.',
            });
        }

        const items = await Promise.all(
            order.orderItems.map(async (item) => {
                const product = await ProductV2.findById(item.productId).exec();

                if (!product) {
                    console.error(`Error: Product not found for item ${item._id}`);
                    return null;
                }

                const variant = product.variants[item.variantId] || {};

                return {
                    productId: product._id,
                    productName: product.productName,
                    variantIndex: item.variantId,
                    variantDetails: {
                        color: variant.color || "NA",
                        size: variant.size || "NA",
                        price: variant.salePrice || product.price,
                    },
                    quantity: item.quantity,
                    itemStatus: item.itemStatus,
                    cancellationReason: item.cancellationReason || "NA",
                };
            })
        );

        const validItems = items.filter((item) => item !== null);


        const orderDetails = {
            orderId: order._id,
            refId: order.orderId,
            orderDate: order.createdOn,
            status: order.status,
            totalPrice: order.totalPrice,
            discount: order.discount,
            finalAmount: order.finalAmount,
            couponApplied: order.couponApplied,
            paymentMethod: order.payment.method,
            paymentStatus: order.payment.status,
            user: order.userId,
            items: validItems,
            additionalNote: order.additionalNote || 'Nil'
        };

        console.log('orderDetails====', orderDetails)

        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');

        res.render('order-view', {
            order: orderDetails,
            messages: {
                success: successMessage.length > 0 ? successMessage[0] : null,
                error: errorMessage.length > 0 ? errorMessage[0] : null,
            },
        })


    } catch (error) {
        console.error('Error listing product:', error);
        res.redirect('/admin/error-page');
    }
}

const updateItemStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { productId, variantIndex, newStatus } = req.body;

        console.log('On updateItemStatus');

        if (!orderId || !productId || variantIndex === undefined || !newStatus) {
            return res.status(400).json({ success: false, error: 'Missing required fields.' });
        }

        const order = await Orders.findById(orderId).populate('userId');
        if (!order) {
            return res.status(404).json({ success: false, error: 'Order not found.' });
        }

        console.log('Order on item status change', order);

        const item = order.orderItems.find(i => i.productId.toString() === productId.toString() && i.variantId === Number(variantIndex));
        if (!item) {
            return res.status(404).json({ success: false, error: 'Order item not found.' });
        }

        const allowedTransitions = {
            "Pending": ["Placed", "Shipped", "Cancelled"],
            "Placed": ["Shipped", "Cancelled"],
            "Shipped": ["Delivered"],
            "Delivered": [],
            "Cancelled": [],
            "Returned": ["Delivered"],
            "Cancel Request": ["Placed", "Cancelled", "Shipped"],
            "Return Request": ['Returned', 'Delivered']
        };

        if (!allowedTransitions[item.itemStatus]?.includes(newStatus)) {
            return res.status(400).json({ success: false, error: `Cannot change status from ${item.itemStatus} to ${newStatus}.` });
        }

        if (newStatus === "Cancelled" || newStatus === "Returned") {
            if (newStatus === "Cancelled") {
                const product = await ProductV2.findById(productId);
                if (product && product.variants[variantIndex]) {
                    product.variants[variantIndex].stock += item.quantity;
                    await product.save();
                }
            }

            if (order.payment.status === "Completed" || order.payment.status === "Partially Refunded") {
                const userWallet = await Wallet.findOne({ userId: order.userId._id });

                if (userWallet) {
                    const refundAmount = item.salePrice * item.quantity;
                    console.log('refundAmount', refundAmount)

                    const newTransaction = {
                        transactionId: uuidv4(),
                        type: 'credit',
                        amount: refundAmount,
                        description: `Refund for ${newStatus.toLowerCase()} item in order ${order.orderId}`,
                        orderId: order._id,
                        transactionCategory: 'refund',
                        balanceAfterTransaction: userWallet.balance + refundAmount
                    };

                    userWallet.transactions.push(newTransaction);
                    userWallet.balance += refundAmount;
                    await userWallet.save();
                    console.log(`Refund of ${refundAmount} added to user ${order.userId.name}'s wallet`);
                }
            }
        }

        item.itemStatus = newStatus;

        const allItemsSameStatus = order.orderItems.every(i => i.itemStatus === newStatus);
        if (allItemsSameStatus) {
            order.status = newStatus;
        } else {
            const hasCancelRequests = order.orderItems.some(i => i.itemStatus === "Cancel Request");
            const hasCancellations = order.orderItems.some(i => i.itemStatus === "Cancelled");

            if (hasCancelRequests || hasCancellations) {
                order.status = "Partial Cancellation";
            }
        }

        if (newStatus === 'Delivered') {
            item.deliveredOn = new Date();
        }

        if (newStatus === "Delivered" && order.payment.method === "cod" && order.payment.status !== 'Completed') {
            order.payment.status = "Completed";
            order.payment.paymentDate = new Date();
            order.payment.transactionId = `COD-${orderId}-${Date.now()}`;
        } else if (newStatus === "Returned" && allItemsSameStatus) {
            order.payment.status = "Refunded";
        } else if (newStatus === "Returned") {
            order.payment.status = "Partially Refunded";
        }

        await order.save();

        res.status(200).json({ success: true, message: 'Order item status updated successfully!', updatedItem: item });
    } catch (error) {
        console.error('Error updating item status:', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};


module.exports = {
    getOrders,
    updateStatus,
    getOrderDetails,
    updateItemStatus
}