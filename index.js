const express = require("express");
const cors = require("cors");
require("dotenv").config();

// ===============================
// Database
// ===============================
const prisma = require("./db");

// ===============================
// Routes
// ===============================
const categoryRoutes = require("./routes/categories");
const productsRoute = require("./routes/products");
const orderRoutes = require("./routes/orders");
const inventoryRoutes = require("./routes/inventory");
const stkpushRoute = require("./routes/stkpush");
const customerRoutes = require("./routes/customers");
const c2bRoute = require("./routes/c2b");
const dashboardRoute = require("./routes/dashboard");
const paymentsRoutes = require("./routes/payments");
const cashRoutes = require("./routes/cash");
const cashTransactionsRoutes = require("./routes/cashTransactions");
const adminRoutes = require("./routes/admin");

// ===============================
// Services
// ===============================
const generatePdfReceipt = require("./generateReceipt");
const sendWhatsAppReceipt = require("./services/sendWhatsApp");

// ===============================
// App Configuration
// ===============================
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);

// ===============================
// Serve Generated Receipts
// ===============================
app.use("/receipts", express.static("receipts"));

// ===============================
// Root Route
// ===============================
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "🚀 M-Pesa Receipt Backend Running Successfully"
    });
});

// ===============================
// Routes
// ===============================
app.use("/api/products", productsRoute);
app.use("/api/categories", categoryRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api", stkpushRoute);
app.use("/api/customers", customerRoutes);
app.use("/api/c2b", c2bRoute);
app.use("/api/dashboard", dashboardRoute);
app.use("/api/payments", paymentsRoutes);
app.use("/api/cash", cashRoutes);
app.use(
    "/api/cash-transactions", cashTransactionsRoutes);
app.use("/api/admin", adminRoutes);

// ======================================================
// M-PESA STK CALLBACK
// ======================================================
app.post("/api/mpesa-callback", async (req, res) => {

    console.log("======================================");
    console.log("📲 M-PESA CALLBACK RECEIVED");
    console.log("======================================");

    console.log(JSON.stringify(req.body, null, 2));

    try {

        // ==================================================
        // GET CALLBACK
        // ==================================================

        const callback = req.body?.Body?.stkCallback;

        if (!callback) {

            console.log("❌ Invalid M-Pesa callback");

            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: "Accepted"
            });
        }

        const resultCode = callback.ResultCode;
        const checkoutRequestId = callback.CheckoutRequestID;
        const merchantRequestId = callback.MerchantRequestID;

        console.log("CheckoutRequestID:", checkoutRequestId);
        console.log("MerchantRequestID:", merchantRequestId);
        console.log("ResultCode:", resultCode);
        console.log("ResultDesc:", callback.ResultDesc);

        // ==================================================
        // FIND PAYMENT
        // ==================================================

        const payment = await prisma.payment.findUnique({
            where: {
                checkoutRequestId: checkoutRequestId
            },
            include: {
                order: {
                    include: {
                        customer: true,
                        items: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        });

        if (!payment) {

            console.log(
                "❌ Payment not found:",
                checkoutRequestId
            );

            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: "Accepted"
            });
        }

        const order = payment.order;

        if (!order) {

            console.log("❌ Payment has no linked order");

            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: "Accepted"
            });
        }

        // ==================================================
        // SUCCESSFUL PAYMENT
        // ==================================================

        if (resultCode === 0) {

            console.log("======================================");
            console.log("✅ PAYMENT SUCCESSFUL");
            console.log("======================================");

            const metadata =
                callback.CallbackMetadata?.Item || [];

            // ==================================================
            // EXTRACT M-PESA DATA
            // ==================================================

            const amount =
                metadata.find(
                    item => item.Name === "Amount"
                )?.Value || 0;

            const receipt =
                metadata.find(
                    item => item.Name === "MpesaReceiptNumber"
                )?.Value;

            const phone =
                metadata.find(
                    item => item.Name === "PhoneNumber"
                )?.Value?.toString();

            const transactionDate =
                metadata.find(
                    item => item.Name === "TransactionDate"
                )?.Value;

            console.log("💰 Amount:", amount);
            console.log("🧾 Receipt:", receipt);
            console.log("📱 Phone:", phone);
            console.log("📅 Transaction Date:", transactionDate);

            // ==================================================
            // PREVENT DUPLICATE CALLBACK PROCESSING
            // ==================================================

            if (order.paymentStatus === "PAID") {

                console.log(
                    "⚠️ Order already marked as PAID."
                );

                return res.status(200).json({
                    ResultCode: 0,
                    ResultDesc: "Accepted"
                });
            }

            // ==================================================
            // UPDATE PAYMENT
            // ==================================================

            await prisma.payment.update({
                where: {
                    checkoutRequestId: checkoutRequestId
                },

                data: {
                    mpesaReceiptNumber: receipt || null,

                    merchantRequestId:
                        merchantRequestId || null,

                    amountPaid:
                        Number(amount),

                    phoneNumber:
                        phone || payment.phoneNumber,

                    resultCode:
                        resultCode,

                    resultDescription:
                        callback.ResultDesc,

                    status: "SUCCESS"
                }
            });

            console.log("✅ Payment updated");

            // ==================================================
            // UPDATE ORDER
            // ==================================================

            await prisma.order.update({
                where: {
                    id: order.id
                },

                data: {
                    paymentStatus: "PAID",
                    orderStatus: "COMPLETED"
                }
            });

            console.log(
                "✅ Order marked as PAID:",
                order.orderNumber
            );

            // ==================================================
// REDUCE PRODUCT STOCK + RECORD INVENTORY SALE
// ==================================================

for (const item of order.items) {

    const product = await prisma.product.findUnique({
        where: {
            id: item.productId
        }
    });

    if (!product) {

        console.log(
            "⚠️ Product not found:",
            item.productId
        );

        continue;
    }

    // ==============================================
    // CHECK STOCK
    // ==============================================

    if (product.stock < item.quantity) {

        console.log(
            `⚠️ Insufficient stock for ${product.name}`
        );

        console.log(
            `Available: ${product.stock}`
        );

        console.log(
            `Required: ${item.quantity}`
        );

        continue;
    }

    // ==============================================
    // CALCULATE NEW STOCK
    // ==============================================

    const previousStock = product.stock;

    const newStock =
        previousStock - item.quantity;

    // ==============================================
    // UPDATE PRODUCT + CREATE TRANSACTION
    // ==============================================

    await prisma.$transaction([

        prisma.product.update({
            where: {
                id: item.productId
            },

            data: {
                stock: newStock
            }
        }),

        prisma.inventoryTransaction.create({
            data: {

                productId:
                    item.productId,

                type:
                    "SALE",

                quantity:
                    item.quantity,

                previousStock:
                    previousStock,

                newStock:
                    newStock,

                reference:
                    order.orderNumber,

                note:
                    `Stock reduced after successful payment. M-Pesa receipt: ${receipt || "N/A"}`
            }
        })

    ]);

    // ==============================================
    // LOG
    // ==============================================

    console.log(
        `📦 SALE: ${product.name}`
    );

    console.log(
        `📦 Quantity sold: ${item.quantity}`
    );

    console.log(
        `📦 Previous stock: ${previousStock}`
    );

    console.log(
        `📦 Remaining stock: ${newStock}`
    );

    // ==============================================
    // LOW STOCK WARNING
    // ==============================================

    if (newStock === 0) {

        console.log(
            `🚨 OUT OF STOCK: ${product.name}`
        );

    } else if (
        newStock <= product.minimumStock
    ) {

        console.log(
            `⚠️ LOW STOCK: ${product.name}`
        );
    }
}

            // ==================================================
            // GENERATE PDF RECEIPT
            // ==================================================

            try {

                const customerName =
                    order.customer?.fullName ||
                    "Customer";

                const customerPhone =
                    phone ||
                    order.customer?.phoneNumber ||
                    payment.phoneNumber ||
                    "Unknown";

                const productName =
                    order.items.length > 0
                        ? order.items
                            .map(item => item.product.name)
                            .join(", ")
                        : "Product";

                const quantity =
                    order.items.reduce(
                        (total, item) =>
                            total + item.quantity,
                        0
                    );

                const receiptData = {

                    customerName:
                        customerName,

                    productName:
                        productName,

                    quantity:
                        quantity,

                    amount:
                        Number(amount),

                    phoneNumber:
                        customerPhone,

                    mpesaReceiptNumber:
                        receipt,

                    orderNumber:
                        order.orderNumber
                };

                console.log(
                    "🧾 Generating PDF receipt..."
                );

                await generatePdfReceipt(
                    receiptData
                );

                console.log(
                    "✅ PDF receipt generated"
                );

                // ==================================================
                // SEND WHATSAPP RECEIPT
                // ==================================================

                try {

                    const pdfUrl =
                        `${process.env.SERVER_URL}/receipts/receipt_${receipt}.pdf`;

                    console.log(
                        "📲 Sending WhatsApp receipt..."
                    );

                    await sendWhatsAppReceipt(
                        customerPhone,
                        pdfUrl
                    );

                    console.log(
                        "✅ WhatsApp receipt sent"
                    );

                } catch (whatsappError) {

                    console.error(
                        "❌ WhatsApp Error:",
                        whatsappError.message
                    );
                }

            } catch (receiptError) {

                console.error(
                    "❌ Receipt Generation Error:",
                    receiptError.message
                );
            }

            // ==================================================
            // SUCCESS LOG
            // ==================================================

            console.log("======================================");
            console.log("✅ ORDER COMPLETED");
            console.log("======================================");

        }

        // ==================================================
        // FAILED PAYMENT
        // ==================================================

        else {

            console.log("======================================");
            console.log("❌ M-PESA PAYMENT FAILED");
            console.log("======================================");

            console.log(
                "ResultCode:",
                resultCode
            );

            console.log(
                "ResultDesc:",
                callback.ResultDesc
            );

            // ==================================================
            // UPDATE PAYMENT
            // ==================================================

            await prisma.payment.update({
                where: {
                    checkoutRequestId:
                        checkoutRequestId
                },

                data: {

                    resultCode:
                        resultCode,

                    resultDescription:
                        callback.ResultDesc,

                    status:
                        "FAILED"
                }
            });

            console.log(
                "❌ Payment marked as FAILED"
            );

            // ==================================================
            // UPDATE ORDER
            // ==================================================

            if (payment.orderId) {

                await prisma.order.update({
                    where: {
                        id: payment.orderId
                    },

                    data: {

                        paymentStatus:
                            "FAILED",

                        orderStatus:
                            "CANCELLED"
                    }
                });

                console.log(
                    "❌ Order marked as CANCELLED"
                );
            }
        }

        // ==================================================
        // ACKNOWLEDGE SAFARICOM
        // ==================================================

        return res.status(200).json({
            ResultCode: 0,
            ResultDesc: "Accepted"
        });

    } catch (error) {

        console.error(
            "❌ CALLBACK ERROR:"
        );

        console.error(error);

        // Always acknowledge Safaricom
        return res.status(200).json({
            ResultCode: 0,
            ResultDesc: "Accepted"
        });
    }
});

// ======================================================
// DASHBOARD STATS
// ======================================================

app.get("/api/stats", async (req, res) => {

    try {

        const totalPayments =
            await prisma.payment.count({
                where: {
                    status: "SUCCESS"
                }
            });

        const totalReceived =
            await prisma.payment.aggregate({
                where: {
                    status: "SUCCESS"
                },

                _sum: {
                    amountPaid: true
                }
            });

        res.json({

            success: true,

            totalTransactions:
                totalPayments,

            totalReceived:
                totalReceived._sum.amountPaid || 0
        });

    } catch (error) {

        console.error(
            "❌ STATS ERROR:",
            error
        );

        res.status(500).json({

            success: false,

            error:
                error.message
        });
    }
});

// ======================================================
// START SERVER
// ======================================================

app.listen(PORT, () => {

    console.log("==================================");
    console.log("🚀 M-PESA RECEIPT BACKEND");
    console.log("==================================");
    console.log(
        `🌐 http://localhost:${PORT}`
    );
    console.log(
        `📦 Products: http://localhost:${PORT}/api/products`
    );
    console.log(
        `🛒 Orders: http://localhost:${PORT}/api/orders`
    );
    console.log(
        `📊 Stats: http://localhost:${PORT}/api/stats`
    );
    console.log("==================================");
});