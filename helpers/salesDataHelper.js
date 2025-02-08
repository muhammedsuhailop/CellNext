const Orders = require('../models/orderSchema');

/**
 * Returns aggregated sales data.
 * 
 * Options:
 *   - filterType: e.g. "today", "week", "month", "year", or "custom"
 *   - startDate: (for custom filter) a date string or Date object
 *   - endDate: (for custom filter) a date string or Date object
 *   - skip: number of documents to skip (for pagination)
 *   - limit: number of documents to limit (for pagination)
 */
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


async function fetchSalesData({ filterType, startDate, endDate, skip = 0, limit = 0 }) {
    let dateFilter = {};
    if (filterType && filterType !== "custom") {
        const { startDate: compStart, endDate: compEnd } = getDateRange(filterType);
        dateFilter.createdOn = { $gte: compStart, $lte: compEnd };
    } else if (startDate && endDate) {
        dateFilter.createdOn = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const pipeline = [
        {
            $match: {
                ...dateFilter,
                status: { $nin: ["Pending", "Processing", "Cancelled", "Returned"] }
            }
        },
        {
            $group: {
                _id: {
                    year: { $year: "$invoiceDate" },
                    month: { $month: "$invoiceDate" },
                    day: { $dayOfMonth: "$invoiceDate" }
                },
                totalOrders: { $sum: 1 },
                totalSales: { $sum: "$totalPrice" },
                totalDiscount: { $sum: "$discount" },
                totalRevenue: { $sum: "$finalAmount" },
                couponAppliedCount: {
                    $sum: {
                        $cond: {
                            if: { $eq: ["$couponApplied", true] },
                            then: 1,
                            else: 0
                        }
                    }
                },
                couponDiscount: {
                    $sum: {
                        $cond: {
                            if: { $eq: ["$couponApplied", true] },
                            then: "$couponDiscount",
                            else: 0
                        }
                    }
                }
            }
        },
        { $sort: { "_id.year": -1, "_id.month": -1, "_id.day": -1 } },
        {
            $project: {
                _id: 0,
                date: {
                    $dateFromParts: {
                        year: "$_id.year",
                        month: "$_id.month",
                        day: "$_id.day"
                    }
                },
                totalOrders: 1,
                totalSales: 1,
                totalDiscount: 1,
                totalRevenue: 1,
                couponAppliedCount: 1,
                couponDiscount: 1
            }
        }
    ];

    if (limit > 0) {
        pipeline.push({ $skip: skip });
        pipeline.push({ $limit: limit });
    }

    return await Orders.aggregate(pipeline);
}



async function fetchOverallSalesData(dateFilter) {
    const overallData = await Orders.aggregate([
        { $match: { ...dateFilter, status: "Placed" } },
        {
            $group: {
                _id: null,
                overallSalesCount: { $sum: 1 },
                overallOrderAmount: { $sum: "$finalAmount" },
                overallDiscount: { $sum: "$discount" }
            }
        }
    ]);
    if (overallData.length > 0) {
        return {
            overallSalesCount: overallData[0].overallSalesCount,
            overallOrderAmount: overallData[0].overallOrderAmount,
            overallDiscount: overallData[0].overallDiscount
        };
    } else {
        return { overallSalesCount: 0, overallOrderAmount: 0, overallDiscount: 0 };
    }
}

module.exports = {
    fetchSalesData,
    fetchOverallSalesData
};
