const Orders = require('../../models/orderSchema');
const ProductV2 = require('../../models/productsSchemaV2');
const User = require('../../models/userSchema');
const Wallet = require('../../models/walletSchema');

const getDateRange = (filterType) => {
    const today = new Date();
    let startDate, endDate;

    switch (filterType) {
        case "today":
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            break;
        case "week":
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            break;
        case "month":
            startDate = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            break;
        case "year":
            startDate = new Date(today.getFullYear(), 0, 1, 0, 0, 0);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            break;
        default:
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
            break;
    }
    return { startDate, endDate };
};


function getWeekNumber(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    let yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
    let weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}


const generatePeriods = (filterType, startDate, endDate) => {
    let periods = [];
    let current = new Date(startDate);

    if (filterType === "year") {
        while (current <= endDate) {
            const year = current.getFullYear();
            const month = current.getMonth();
            const monthName = current.toLocaleString('en-US', { month: 'long' });

            const label = `${monthName}, ${year}`;
            periods.push({ label, month: month + 1, year });

            current.setMonth(current.getMonth() + 1);
        }

    } else if (filterType === "month") {
        while (current <= endDate) {
            const year = current.getFullYear();
            const week = getWeekNumber(current);
            const label = `Week ${week}, ${year}`;
            if (!periods.length || periods[periods.length - 1].label !== label) {
                periods.push({ label, week, year });
            }
            current.setDate(current.getDate() + 7);
        }
    } else {
        while (current <= endDate) {
            const year = current.getFullYear();
            const month = current.getMonth() + 1;
            const day = current.getDate();

            const dayName = current.toLocaleDateString("en-US", { weekday: "long" });

            const formattedDay = String(day).padStart(2, "0");
            const formattedMonth = String(month).padStart(2, "0");

            const label = `${dayName}, ${formattedDay}/${formattedMonth}/${year}`;

            periods.push({ label, day, month, year, dayName });

            current.setDate(current.getDate() + 1);
        }


    }
    return periods;
};

const loadDashboard = async (req, res) => {
    try {
        const userId = req.session._id;
        const filter = req.query.filterType;
        const { startDate: customStart, endDate: customEnd } = req.query;
        let dateFilter = {};

        if (filter === "custom") {
            if (customStart && customEnd) {
                dateFilter.createdOn = {
                    $gte: new Date(customStart),
                    $lte: new Date(customEnd)
                };
            } else {
                const { startDate: compStart, endDate: compEnd } = getDateRange("year");
                dateFilter.createdOn = { $gte: compStart, $lte: compEnd };
            }
        } else {
            const { startDate: compStart, endDate: compEnd } = getDateRange(filter);
            dateFilter.createdOn = { $gte: compStart, $lte: compEnd };
        }

        const revenueStartDate = dateFilter.createdOn.$gte;
        const revenueEndDate = dateFilter.createdOn.$lte;
        let revenueGroupByField;
        let revenueSort = {};

        if (filter === "year") {
            revenueGroupByField = {
                year: { $year: "$createdOn" },
                month: { $month: "$createdOn" }
            };
            revenueSort = { "_id.year": 1, "_id.month": 1 };
        } else if (filter === "month") {
            revenueGroupByField = {
                year: { $year: "$createdOn" },
                week: { $week: "$createdOn" }
            };
            revenueSort = { "_id.year": 1, "_id.week": 1 };
        } else {
            revenueGroupByField = {
                year: { $year: "$createdOn" },
                month: { $month: "$createdOn" },
                day: { $dayOfMonth: "$createdOn" }
            };
            revenueSort = { "_id.year": 1, "_id.month": 1, "_id.day": 1 };
        }

        const productPipeline = [
            { $match: { ...dateFilter, status: { $nin: ["Pending", "Processing", "Cancelled", "Returned"] } } },
            { $unwind: "$orderItems" },
            { $group: { _id: "$orderItems.productId", totalSold: { $sum: "$orderItems.quantity" }, createdOn: { $first: "$createdOn" } } },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "productv2",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $project: {
                    _id: 1,
                    productName: "$productDetails.productName",
                    brand: "$productDetails.brand",
                    price: { $arrayElemAt: ["$productDetails.variants.salePrice", 0] },
                    totalSold: 1,
                    createdOn: 1,
                    variant: { $arrayElemAt: ["$productDetails.variants", 0] }
                }
            },
            {
                $project: {
                    _id: 1,
                    productName: 1,
                    brand: 1,
                    totalSold: 1,
                    price: 1,
                    createdOn: 1,
                    firstVariantImage: { $arrayElemAt: ["$variant.images", 0] }
                }
            }
        ];

        const categoryPipeline = [
            { $match: { ...dateFilter, status: { $nin: ["Pending", "Processing", "Cancelled", "Returned"] } } },
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: "productv2",
                    localField: "orderItems.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            {
                $group: {
                    _id: "$productDetails.category",
                    totalSold: { $sum: "$orderItems.quantity" },
                    exampleProduct: { $first: "$productDetails" }
                }
            },
            {
                $lookup: {
                    from: "categories",
                    localField: "_id",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            { $unwind: "$categoryInfo" },
            {
                $project: {
                    _id: 1,
                    categoryName: "$categoryInfo.name",
                    totalSold: 1,
                    firstVariant: { $arrayElemAt: ["$exampleProduct.variants", 0] }
                }
            },
            {
                $project: {
                    _id: 1,
                    categoryName: 1,
                    totalSold: 1,
                    firstVariantImage: { $arrayElemAt: ["$firstVariant.images", 0] }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ];

        const brandPipeline = [
            { $match: { ...dateFilter, status: { $nin: ["Pending", "Processing", "Cancelled", "Returned"] } } },
            { $unwind: "$orderItems" },
            {
                $lookup: {
                    from: "productv2",
                    localField: "orderItems.productId",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            { $unwind: "$productDetails" },
            { $group: { _id: "$productDetails.brand", totalSold: { $sum: "$orderItems.quantity" } } },
            {
                $lookup: {
                    from: "brands",
                    localField: "_id",
                    foreignField: "brandName",
                    as: "brandInfo"
                }
            },
            { $unwind: "$brandInfo" },
            {
                $project: {
                    _id: 1,
                    totalSold: 1,
                    brandImage: { $arrayElemAt: ["$brandInfo.brandImage", 0] }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ];

        const revenuePipeline = [
            {
                $match: {
                    createdOn: { $gte: revenueStartDate, $lte: revenueEndDate },
                    status: { $nin: ["Pending", "Processing", "Cancelled", "Returned"] }
                }
            },
            {
                $group: {
                    _id: revenueGroupByField,
                    totalRevenue: { $sum: "$finalAmount" }
                }
            },
            { $sort: revenueSort }
        ];

        const orderStatusPipeline = [
            { $match: { ...dateFilter } },
            { $unwind: "$orderItems" },
            {
                $group: {
                    _id: null,
                    delivered: { $sum: { $cond: [{ $eq: ["$orderItems.itemStatus", "Delivered"] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ["$orderItems.itemStatus", "Cancelled"] }, 1, 0] } },
                    returned: { $sum: { $cond: [{ $eq: ["$orderItems.itemStatus", "Returned"] }, 1, 0] } },
                    cancelRequest: { $sum: { $cond: [{ $eq: ["$orderItems.itemStatus", "Cancel Request"] }, 1, 0] } },
                    returnRequest: { $sum: { $cond: [{ $eq: ["$orderItems.itemStatus", "Return Request"] }, 1, 0] } },
                    inProcess: { $sum: { $cond: [{ $in: ["$orderItems.itemStatus", ["Pending", "Processing", "Cancel Request", "Return Request"]] }, 1, 0] } }
                }
            },
            { $project: { _id: 0, delivered: 1, cancelled: 1, inProcess: 1, returned: 1, cancelRequest: 1, returnRequest: 1 } }
        ];

        const [bestSellingProducts,
            bestSellingCategories,
            bestSellingBrands,
            revenueResult,
            orderStatusData,
        ] = await Promise.all([
            Orders.aggregate(productPipeline),
            Orders.aggregate(categoryPipeline),
            Orders.aggregate(brandPipeline),
            Orders.aggregate(revenuePipeline),
            Orders.aggregate(orderStatusPipeline),
        ]);

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        const rawRevenueData = revenueResult.map(item => {
            let label;

            if (filter === "month") {
                label = `Week ${item._id.week}, ${item._id.year}`;
            } else if (filter === "year") {
                const monthName = monthNames[item._id.month - 1];
                label = `${monthName}, ${item._id.year}`;
            } else {
                const dateObj = new Date(item._id.year, item._id.month - 1, item._id.day);

                const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });

                label = `${dayName}, ${String(item._id.day).padStart(2, "0")}/${String(item._id.month).padStart(2, "0")}/${item._id.year}`;
            }

            return { label, revenue: item.totalRevenue };
        });


        const expectedPeriods = generatePeriods(filter, revenueStartDate, revenueEndDate);
        const revenueMap = {};
        rawRevenueData.forEach(item => {
            revenueMap[item.label] = item.revenue;
        });
        const fullRevenueData = expectedPeriods.map(p => ({
            label: p.label,
            revenue: revenueMap[p.label] || 0
        }));

        const totalRevenue = fullRevenueData.reduce((acc, cur) => acc + cur.revenue, 0);

        const admin = await User.findById(req.session._id);

        res.render("dashboard", {
            bestSellingProducts,
            bestSellingCategories,
            bestSellingBrands,
            totalRevenue,
            orderStatusData,
            revenueData: fullRevenueData,
            filterType: filter,
            admin
        });
    } catch (error) {
        console.error("Error fetching best selling reports:", error);
        res.status(500).send("Internal Server Error");
    }
};

module.exports = {
    loadDashboard,
}