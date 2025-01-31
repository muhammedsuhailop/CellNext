const Orders = require('../../models/orderSchema');
const ProductV2 = require('../../models/productsSchemaV2');
const User = require('../../models/userSchema');

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
            .skip(skip)
            .limit(limit)
            .exec();

        const totalOrders = await Orders.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        if (!orders || orders.length === 0) {
            return res.status(404).render('orders', {
                orders: [],
                totalPages: 0,
                currentPage: page,
                searchQuery: search,
                searchAction: '/admin/orders',
                message: 'No orders found.',
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

                        // const variants = Array.isArray(product.variants) ? product.variants : [];
                        const variant = product.variants[item.variantId] || {};

                        return {
                            productId: product._id,
                            productName: product.name,
                            variantDetails: {
                                color: variant.color || "N/A",
                                size: variant.size || "N/A",
                                price: variant.salePrice
                            },
                            quantity: item.quantity,
                            itemStatus: item.itemStatus,
                            cancellationReason: item.cancellationReason || "N/A",
                        };
                    })
                );

                const validItems = items.filter((item) => item !== null);

                return {
                    orderId: order._id,
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
        console.error('Error listing product:', error);
        res.redirect('/admin/error-page');
    }
}

const updateStatus = async (req, res) => {
    try {
        const { orderId, newStatus } = req.body;

        if (!orderId || !newStatus) {
            return res.status(400).json({ error: 'Order ID and new status are required.' });
        }

        const order = await Orders.findById(orderId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found.' });
        }

        const allowedTransitions = {
            "Pending": ["Placed", "Cancelled"],
            "Placed": ["Shipped", "Cancelled"],
            "Shipped": ["Delivered"],
            "Delivered": [],
            "Cancelled": [],
            "Returned": ["Delivered"],
        };

        if (!allowedTransitions[order.status]?.includes(newStatus)) {
            return res.status(400).json({ error: `Cannot change status from ${order.status} to ${newStatus}.` });
        }

        if (newStatus === "Cancelled") {
            for (const item of order.orderItems) {
                const product = await ProductV2.findById(item.productId);
                if (!product) continue;

                const variant = product.variants[item.variantId];

                if (variant) {
                    variant.stock += item.quantity;
                    item.itemStatus = "Cancelled";
                }

                await product.save();
            }
        } else {
            for (const item of order.orderItems) {
                item.itemStatus = newStatus;
            }
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

    } catch (error) {

    }
}

module.exports = {
    getOrders,
    updateStatus,
    getOrderDetails,
}