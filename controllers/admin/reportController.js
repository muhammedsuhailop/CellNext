const Orders = require('../../models/orderSchema');
const ProductV2 = require('../../models/productsSchemaV2');
const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Wallet = require('../../models/walletSchema');
const { v4: uuidv4 } = require('uuid');

const getDateRange = (filterType) => {
    let startDate = new Date();
    let endDate = new Date();

    switch (filterType) {
        case "today":
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        case "week":
            startDate.setDate(startDate.getDate() - 7);
            break;
        case "month":
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        case "year":
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
    }
    return { startDate, endDate };
};

const loadSalesReport = async (req, res) => {
    try {
        const { filterType, startDate, endDate, page = 1, limit = 10 } = req.query;
        let dateFilter = {};

        if (filterType && filterType !== "custom") {
            const { startDate, endDate } = getDateRange(filterType);
            dateFilter.createdOn = { $gte: startDate, $lte: endDate };
        } else if (startDate && endDate) {
            dateFilter.createdOn = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const pageNumber = parseInt(page) || 1;
        const pageSize = parseInt(limit) || 10;
        const skip = (pageNumber - 1) * pageSize;

        // Fetch sales data with pagination
        const salesData = await Orders.aggregate([
            { $match: { ...dateFilter, status: "Placed" } },
            { $unwind: "$orderItems" },
            {
                $group: {
                    _id: "$_id",
                    totalSales: { $sum: "$totalPrice" },
                    totalDiscount: { $sum: "$discount" },
                    totalRevenue: { $sum: "$finalAmount" },
                    totalCouponDiscount: {
                        $sum: {
                            $cond: {
                                if: { $eq: ["$couponApplied", true] },
                                then: "$coupon.discount",
                                else: 0
                            }
                        }
                    },
                    invoiceDate: { $first: "$invoiceDate" }
                }
            },
            { $sort: { invoiceDate: -1 } }, // Sort by most recent
            { $skip: skip },
            { $limit: pageSize }
        ]);

        // Get total count for pagination
        const totalSalesCount = await Orders.countDocuments({ ...dateFilter, status: "Delivered" });
        const totalPages = Math.ceil(totalSalesCount / pageSize);

        const successMessage = req.flash('success');
        const errorMessage = req.flash('error');

        res.render("sales-report", {
            salesData,
            currentPage: pageNumber,
            totalPages,
            filterType,
            startDate,
            endDate,
            messages: {
                success: successMessage.length > 0 ? successMessage[0] : null,
                error: errorMessage.length > 0 ? errorMessage[0] : null,
            },
        });
    } catch (error) {
        console.error("Error fetching sales report:", error);
        res.status(500).send("Internal Server Error");
    }
}

module.exports = {
    loadSalesReport
}