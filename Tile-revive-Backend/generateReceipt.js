const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

// ======================================================
// GENERATE TILE REVIVE PAYMENT RECEIPT
// ======================================================

function generatePdfReceipt(paymentData) {

    return new Promise((resolve, reject) => {

        try {

            // ==================================================
            // RECEIPTS DIRECTORY
            // ==================================================

            const receiptsDir =
                path.join(__dirname, "receipts");

            if (!fs.existsSync(receiptsDir)) {

                fs.mkdirSync(
                    receiptsDir,
                    {
                        recursive: true
                    }
                );
            }

            // ==================================================
            // RECEIPT NUMBER
            // ==================================================

            const receiptNumber =
                paymentData.mpesaReceiptNumber ||
                `RECEIPT-${Date.now()}`;

            const filePath =
                path.join(
                    receiptsDir,
                    `receipt_${receiptNumber}.pdf`
                );

            // ==================================================
            // PDF DOCUMENT
            // ==================================================

            const doc =
                new PDFDocument({
                    size: "A4",
                    margin: 40
                });

            const stream =
                fs.createWriteStream(filePath);

            doc.pipe(stream);

            // ==================================================
            // HEADER
            // ==================================================

            doc
                .fillColor("#1F2937")
                .fontSize(24)
                .font("Helvetica-Bold")
                .text(
                    "TILE REVIVE SOLUTIONS",
                    {
                        align: "center"
                    }
                );

            doc
                .moveDown(0.3)
                .fontSize(18)
                .fillColor("#374151")
                .text(
                    "PAYMENT RECEIPT",
                    {
                        align: "center"
                    }
                );

            doc
                .moveDown(0.5)
                .fontSize(12)
                .fillColor("#10B981")
                .font("Helvetica-Bold")
                .text(
                    "STATUS: PAID",
                    {
                        align: "center"
                    }
                );

            doc.moveDown(1.5);

            // ==================================================
            // ORDER INFORMATION
            // ==================================================

            doc
                .fontSize(11)
                .font("Helvetica")
                .fillColor("#374151");

            const orderDetails = [

                [
                    "Order Number:",
                    paymentData.orderNumber || "N/A"
                ],

                [
                    "M-Pesa Receipt:",
                    paymentData.mpesaReceiptNumber || "N/A"
                ],

                [
                    "Date & Time:",
                    new Date().toLocaleString(
                        "en-KE",
                        {
                            timeZone: "Africa/Nairobi"
                        }
                    )
                ]

            ];

            orderDetails.forEach(
                ([label, value]) => {

                    doc
                        .font("Helvetica-Bold")
                        .text(
                            label,
                            50,
                            doc.y,
                            {
                                width: 150,
                                continued: true
                            }
                        );

                    doc
                        .font("Helvetica")
                        .text(
                            String(value),
                            {
                                align: "right"
                            }
                        );

                    doc.moveDown(0.6);
                }
            );

            // ==================================================
            // CUSTOMER INFORMATION
            // ==================================================

            doc.moveDown(0.8);

            doc
                .fontSize(14)
                .font("Helvetica-Bold")
                .fillColor("#1F2937")
                .text(
                    "CUSTOMER INFORMATION"
                );

            doc.moveDown(0.5);

            const customerDetails = [

                [
                    "Customer Name:",
                    paymentData.customerName || "N/A"
                ],

                [
                    "Phone Number:",
                    paymentData.phoneNumber || "N/A"
                ],

                [
                    "Email:",
                    paymentData.email || "N/A"
                ],

                [
                    "Location:",
                    paymentData.location || "N/A"
                ]

            ];

            doc
                .fontSize(11)
                .fillColor("#374151");

            customerDetails.forEach(
                ([label, value]) => {

                    doc
                        .font("Helvetica-Bold")
                        .text(
                            label,
                            50,
                            doc.y,
                            {
                                width: 150,
                                continued: true
                            }
                        );

                    doc
                        .font("Helvetica")
                        .text(
                            String(value),
                            {
                                align: "right"
                            }
                        );

                    doc.moveDown(0.6);
                }
            );

            // ==================================================
            // ORDER DETAILS
            // ==================================================

            doc.moveDown(0.8);

            doc
                .fontSize(14)
                .font("Helvetica-Bold")
                .fillColor("#1F2937")
                .text(
                    "ORDER DETAILS"
                );

            doc.moveDown(0.7);

            // ==================================================
            // TABLE SETTINGS
            // ==================================================

            const tableLeft = 50;
            const tableWidth = 495;

            const productX = 60;
            const qtyX = 290;
            const unitPriceX = 350;
            const totalX = 445;

            const productWidth = 220;
            const qtyWidth = 60;
            const unitPriceWidth = 90;
            const totalWidth = 90;

            // ==================================================
            // TABLE HEADER
            // ==================================================

            let tableTop = doc.y;

            doc
                .fontSize(10)
                .font("Helvetica-Bold")
                .fillColor("#FFFFFF")
                .rect(
                    tableLeft,
                    tableTop,
                    tableWidth,
                    25
                )
                .fill("#374151");

            doc
                .fillColor("#FFFFFF")
                .text(
                    "PRODUCT",
                    productX,
                    tableTop + 8,
                    {
                        width: productWidth
                    }
                );

            doc
                .text(
                    "QTY",
                    qtyX,
                    tableTop + 8,
                    {
                        width: qtyWidth,
                        align: "center"
                    }
                );

            doc
                .text(
                    "UNIT PRICE",
                    unitPriceX,
                    tableTop + 8,
                    {
                        width: unitPriceWidth,
                        align: "right"
                    }
                );

            doc
                .text(
                    "TOTAL",
                    totalX,
                    tableTop + 8,
                    {
                        width: totalWidth,
                        align: "right"
                    }
            );

            // ==================================================
            // ORDER ITEMS
            // ==================================================

            const orderItems =
                Array.isArray(paymentData.orderItems) &&
                paymentData.orderItems.length > 0

                    ? paymentData.orderItems

                    : [
                        {
                            productName:
                                paymentData.productName ||
                                "Product",

                            quantity:
                                Number(
                                    paymentData.quantity || 1
                                ),

                            unitPrice:
                                Number(
                                    paymentData.unitPrice || 0
                                )
                        }
                    ];

            let calculatedTotal = 0;

            // ==================================================
            // DRAW EACH PRODUCT
            // ==================================================

            orderItems.forEach(
                (item, index) => {

                    const productName =
                        item.productName ||
                        "Product";

                    const quantity =
                        Number(
                            item.quantity || 0
                        );

                    const unitPrice =
                        Number(
                            item.unitPrice || 0
                        );

                    const itemTotal =
                        quantity *
                        unitPrice;

                    calculatedTotal +=
                        itemTotal;

                    const rowTop =
                        tableTop +
                        25 +
                        (index * 35);

                    // --------------------------------------------------
                    // PRODUCT
                    // --------------------------------------------------

                    doc
                        .fillColor("#374151")
                        .font("Helvetica")
                        .fontSize(10)
                        .text(
                            productName,
                            productX,
                            rowTop + 8,
                            {
                                width:
                                    productWidth
                            }
                        );

                    // --------------------------------------------------
                    // QUANTITY
                    // --------------------------------------------------

                    doc
                        .text(
                            String(quantity),
                            qtyX,
                            rowTop + 8,
                            {
                                width:
                                    qtyWidth,
                                align:
                                    "center"
                            }
                        );

                    // --------------------------------------------------
                    // UNIT PRICE
                    // --------------------------------------------------

                    doc
                        .text(
                            `KES ${unitPrice.toLocaleString()}`,
                            unitPriceX,
                            rowTop + 8,
                            {
                                width:
                                    unitPriceWidth,
                                align:
                                    "right"
                            }
                        );

                    // --------------------------------------------------
                    // TOTAL
                    // --------------------------------------------------

                    doc
                        .text(
                            `KES ${itemTotal.toLocaleString()}`,
                            totalX,
                            rowTop + 8,
                            {
                                width:
                                    totalWidth,
                                align:
                                    "right"
                            }
                        );

                    // --------------------------------------------------
                    // ROW LINE
                    // --------------------------------------------------

                    doc
                        .moveTo(
                            tableLeft,
                            rowTop + 30
                        )
                        .lineTo(
                            tableLeft +
                            tableWidth,
                            rowTop + 30
                        )
                        .stroke(
                            "#D1D5DB"
                        );
                }
            );

            // ==================================================
            // ACTUAL PAYMENT TOTAL
            // ==================================================

            const amountPaid =
                Number(
                    paymentData.amountPaid || 0
                );

            const finalTotal =
                amountPaid > 0
                    ? amountPaid
                    : calculatedTotal;

            // Move cursor below table

            const tableHeight =
                25 +
                (orderItems.length * 35);

            doc.y =
                tableTop +
                tableHeight +
                20;

            // ==================================================
            // TOTAL PAID
            // ==================================================

            doc
                .fontSize(16)
                .font("Helvetica-Bold")
                .fillColor("#1F2937")
                .text(
                    "TOTAL PAID:",
                    300,
                    doc.y,
                    {
                        width: 120,
                        continued: true
                    }
                );

            doc
                .fillColor("#10B981")
                .text(
                    `KES ${finalTotal.toLocaleString()}`,
                    {
                        width: 125,
                        align: "right"
                    }
                );

            doc.moveDown(1);

            // ==================================================
            // PAYMENT INFORMATION
            // ==================================================

            doc
                .fontSize(14)
                .font("Helvetica-Bold")
                .fillColor("#1F2937")
                .text(
                    "PAYMENT INFORMATION"
                );

            doc.moveDown(0.5);

            const paymentDetails = [

                [
                    "Payment Method:",
                    paymentData.paymentMethod ||
                    "MPESA"
                ],

                [
                    "Payment Status:",
                    paymentData.status ||
                    "SUCCESS"
                ],

                [
                    "M-Pesa Receipt:",
                    paymentData.mpesaReceiptNumber ||
                    "N/A"
                ],

                [
                    "Checkout Request ID:",
                    paymentData.checkoutRequestId ||
                    "N/A"
                ],

                [
                    "Merchant Request ID:",
                    paymentData.merchantRequestId ||
                    "N/A"
                ]

            ];

            doc
                .fontSize(11)
                .fillColor("#374151");

            paymentDetails.forEach(
                ([label, value]) => {

                    doc
                        .font("Helvetica-Bold")
                        .text(
                            label,
                            50,
                            doc.y,
                            {
                                width: 180,
                                continued: true
                            }
                        );

                    doc
                        .font("Helvetica")
                        .text(
                            String(value),
                            {
                                align:
                                    "right"
                            }
                        );

                    doc.moveDown(0.6);
                }
            );

            // ==================================================
            // FOOTER
            // ==================================================

            doc.moveDown(2);

            doc
                .moveTo(
                    50,
                    doc.y
                )
                .lineTo(
                    545,
                    doc.y
                )
                .stroke(
                    "#D1D5DB"
                );

            doc.moveDown(1);

            doc
                .fontSize(11)
                .font("Helvetica")
                .fillColor("#6B7280")
                .text(
                    "Thank you for shopping with Tile Revive Solutions.",
                    {
                        align:
                            "center"
                    }
                );

            doc
                .moveDown(0.4)
                .fontSize(9)
                .text(
                    "This receipt confirms successful payment for your order.",
                    {
                        align:
                            "center"
                    }
                );

            // ==================================================
            // FINISH PDF
            // ==================================================

            doc.end();

            // ==================================================
            // FILE CREATED
            // ==================================================

            stream.on(
                "finish",
                () => {

                    console.log(
                        "======================================"
                    );

                    console.log(
                        "🧾 PDF RECEIPT GENERATED"
                    );

                    console.log(
                        "Receipt:",
                        receiptNumber
                    );

                    console.log(
                        "File:",
                        filePath
                    );

                    console.log(
                        "======================================"
                    );

                    resolve(
                        filePath
                    );
                }
            );

            stream.on(
                "error",
                (error) => {

                    reject(error);
                }
            );

        } catch (error) {

            reject(error);
        }
    });
}

// ======================================================
// EXPORT
// ======================================================

module.exports =
    generatePdfReceipt;