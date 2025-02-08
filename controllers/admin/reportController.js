const Orders = require('../../models/orderSchema');
const ProductV2 = require('../../models/productsSchemaV2');
const User = require('../../models/userSchema');
const Address = require('../../models/addressSchema');
const Wallet = require('../../models/walletSchema');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { fetchSalesData, fetchOverallSalesData } = require('../../helpers/salesDataHelper');

const reportsDir = path.join(__dirname, '../../public/reports');
const filePath = path.join(reportsDir, 'sales_report.pdf');

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

function buildDateFilter(filterType, startDate, endDate) {
    let dateFilter = {};
    if (filterType && filterType !== "custom") {
        const { startDate: compStart, endDate: compEnd } = getDateRange(filterType);
        dateFilter.createdOn = { $gte: compStart, $lte: compEnd };
    } else if (startDate && endDate) {
        dateFilter.createdOn = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    return dateFilter;
}

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

        const salesData = await fetchSalesData({ filterType, startDate, endDate, skip, limit: pageSize });
        console.log('salesData', salesData)

        const overallMetrics = await fetchOverallSalesData(dateFilter);
        console.log('overallMetrics', overallMetrics)

        const totalSalesCount = await Orders.countDocuments({ ...dateFilter, status: "Placed" });
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
            overallMetrics,
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

const downloadPDF = async (req, res) => {
    try {
        const { filterType, startDate, endDate } = req.query;
        console.log('filterType, startDate, endDate', filterType, startDate, endDate);

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

        const salesData = await fetchSalesData({ filterType, startDate, endDate });

        if (salesData.length === 0) {
            return res.status(404).send('No sales data found for the selected filter.');
        }

        const doc = new PDFDocument({ margin: 30 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');
        doc.pipe(res);

        const fontPath = path.join(__dirname, '../../public/fonts', 'DejaVuSans.ttf');
        doc.registerFont('DejaVu', fontPath);
        doc.font('DejaVu');

        doc.fontSize(8).text('CellNext', { align: 'center' }).moveDown(2);
        doc.fontSize(16).text('Sales Report', { align: 'center' }).moveDown(2);

        let displayStartDate, displayEndDate;
        if (filterType !== 'custom') {
            const computedDates = getDateRange(filterType);
            displayStartDate = computedDates.startDate;
            displayEndDate = computedDates.endDate;
        } else {
            displayStartDate = startDate ? new Date(startDate) : null;
            displayEndDate = endDate ? new Date(endDate) : null;
        }

        const formattedStartDate = displayStartDate && !isNaN(displayStartDate) ? displayStartDate.toLocaleDateString() : "N/A";
        const formattedEndDate = displayEndDate && !isNaN(displayEndDate) ? displayEndDate.toLocaleDateString() : "N/A";

        const reportDates = `From: ${formattedStartDate} | To: ${formattedEndDate}`;

        const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        let y = doc.y;

        doc.fontSize(10).text(reportDates, doc.page.margins.left + pageWidth / 2, y, { width: pageWidth / 2, align: 'right' }).moveDown(1);


        const columnWidths = [110, 90, 110, 120, 110];
        const startX = 50;

        const drawRow = (row, y, isHeader = false) => {
            let x = startX;
            const rowHeight = 20;
            const padding = 5;

            row.forEach((text, index) => {
                doc.rect(x, y, columnWidths[index], rowHeight).stroke();

                doc.fontSize(isHeader ? 12 : 10)
                    .text(text, x + padding, y + padding, { width: columnWidths[index] - 2 * padding, align: 'left' });

                x += columnWidths[index];
            });

            return y + rowHeight;
        };

        y = doc.y;
        y = drawRow([
            'Invoice Date',
            'Total Orders ',
            'Total Sales ',
            'Discount ',
            'Coupon Applied',
        ], y, true);
        doc.moveDown(0.5);

        salesData.forEach((sale) => {
            y = drawRow([
                new Date(sale.date).toLocaleDateString(),
                `${sale.totalOrders}`,
                `₹${(sale.totalSales || 0).toLocaleString('en-IN')}`,
                `₹${(sale.totalDiscount || 0).toLocaleString('en-IN')}`,
                `${sale.couponAppliedCount}`,
            ], y);
            doc.moveDown();
        });

        const generatedOn = `Generated On :${new Date().toLocaleDateString()}`;
        const footerText = `${generatedOn} |© 2025 CellNext. All rights reserved.`;

        const footerY = doc.page.height - doc.page.margins.bottom - 20;

        doc.fontSize(10)
            .text(footerText, doc.page.margins.left, footerY, { width: doc.page.width - 2 * doc.page.margins.left, align: 'center' });

        doc.end();
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('Error generating PDF');
    }
};


module.exports = {
    loadSalesReport,
    downloadPDF,
}