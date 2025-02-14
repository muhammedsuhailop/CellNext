const Orders = require('../../models/orderSchema');
const ProductV2 = require('../../models/productsSchemaV2');
const User = require('../../models/userSchema');
const Wallet = require('../../models/walletSchema');

const getDateRange = (filterType) => {
    const today = new Date();
    let startDate, endDate;

    switch (filterType) {
        case "today":
            startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
            break;
        case "yesterday": {
            const yesterday = new Date(today);
            yesterday.setDate(today.getDate() - 1);
            startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
            endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999);
            break;
        }
        case "week":
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 6);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(today);
            endDate.setHours(23, 59, 59, 999);
            break;
        case "month": {
            const firstDayCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const lastDayPrevMonth = new Date(firstDayCurrentMonth);
            lastDayPrevMonth.setDate(firstDayCurrentMonth.getDate() - 1);
            startDate = new Date(lastDayPrevMonth.getFullYear(), lastDayPrevMonth.getMonth(), 1);
            endDate = new Date(lastDayPrevMonth.getFullYear(), lastDayPrevMonth.getMonth(), lastDayPrevMonth.getDate(), 23, 59, 59, 999);
            break;
        }
        case "year": {
            startDate = new Date(today.getFullYear() - 1, 0, 1);
            endDate = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
            break;
        }
        default:
            startDate = new Date(today.getFullYear(), 0, 1);
            endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
            break;
    }

    return { startDate, endDate };
};


const loadBestSellingReports = async (req, res) => {
    try {
        const { filterType, startDate: customStart, endDate: customEnd } = req.query;
        let dateFilter = {};

        if (filterType === "custom") {
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
            const { startDate: compStart, endDate: compEnd } = getDateRange(filterType);
            dateFilter.createdOn = { $gte: compStart, $lte: compEnd };
        }

        let groupByField;
        if (filterType === "week") {
            groupByField = { year: { $year: "$createdOn" }, week: { $week: "$createdOn" } };
        } else if (filterType === "month") {
            groupByField = { year: { $year: "$createdOn" }, month: { $month: "$createdOn" } };
        } else {
            groupByField = { year: { $year: "$createdOn" } };
        }

        const productPipeline = [
            {
                $match: {
                    ...dateFilter,
                    status: { $nin: ["Pending", "Processing", "Cancelled", "Returned"] }
                }
            },
            { $unwind: "$orderItems" },
            {
                $group: {
                    _id: "$orderItems.productId",
                    totalSold: { $sum: "$orderItems.quantity" }
                }
            },
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
                    totalSold: 1,
                    variant: { $arrayElemAt: ["$productDetails.variants", 0] }
                }
            },
            {
                $project: {
                    _id: 1,
                    productName: 1,
                    brand: 1,
                    totalSold: 1,
                    firstVariantImage: { $arrayElemAt: ["$variant.images", 0] }
                }
            }
        ];

        const categoryPipeline = [
            {
                $match: {
                    ...dateFilter,
                    status: { $nin: ["Pending", "Processing", "Cancelled", "Returned"] }
                }
            },
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
            {
                $match: {
                    ...dateFilter,
                    status: { $nin: ["Pending", "Processing", "Cancelled", "Returned"] }
                }
            },
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
                    _id: "$productDetails.brand",
                    totalSold: { $sum: "$orderItems.quantity" }
                }
            },
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
                    ...dateFilter,
                    status: { $nin: ["Pending", "Processing", "Cancelled", "Returned"] }
                }
            },
            {
                $group: {
                    _id: groupByField,
                    totalRevenue: { $sum: "$finalAmount" }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1 }
            }
        ];

        const [bestSellingProducts, bestSellingCategories, bestSellingBrands, revenueResult] = await Promise.all([
            Orders.aggregate(productPipeline),
            Orders.aggregate(categoryPipeline),
            Orders.aggregate(brandPipeline),
            Orders.aggregate(revenuePipeline),
        ]);

        const revenueData = revenueResult.map(item => ({
            label: filterType === "week"
                ? `Week ${item._id.week}, ${item._id.year}`
                : filterType === "month"
                    ? `Month ${item._id.month}, ${item._id.year}`
                    : `Year ${item._id.year}`,
            revenue: item.totalRevenue
        }));

        const totalRevenue = revenueData.reduce((acc, cur) => acc + cur.revenue, 0);

        console.log("===== revenueResult:", JSON.stringify(revenueResult, null, 2));
        console.log("==== totalRevenue:", totalRevenue);
        console.log("===== revenueData:", JSON.stringify(revenueData, null, 2));

        res.render("dashboard-two", {
            bestSellingProducts,
            bestSellingCategories,
            bestSellingBrands,
            totalRevenue,
            revenueData,
            filterType,
        });
    } catch (error) {
        console.error("Error fetching best selling reports:", error);
        res.status(500).send("Internal Server Error");
    }
};



module.exports = {
    loadBestSellingReports,
}