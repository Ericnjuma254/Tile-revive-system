const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const {
    sendPaymentConfirmation
} = require("./utils/sendEmail");

// ======================================================
// DATABASE
// ======================================================

const prisma = require("./db");

// ======================================================
// ROUTES
// ======================================================

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
const authRoutes = require("./routes/auth");
const cartRoutes = require("./routes/cart");
const galleryRoutes = require("./routes/gallery");
const customerAuthRoutes = require("./routes/customerAuth");
const reportsRoutes = require("./routes/reports");
const analyticsRoutes = require("./routes/analytics");
const expensesRoutes = require("./routes/expenses");
const financialReportsRoutes = require("./routes/financialReports");

// ======================================================
// SERVICES
// ======================================================

const generatePdfReceipt = require("./generateReceipt");
const sendWhatsAppReceipt = require("./services/sendWhatsApp");

// ======================================================
// APP CONFIGURATION
// ======================================================

const app = express();

const PORT = process.env.PORT || 5000;

// ======================================================
// MIDDLEWARE
// ======================================================

app.disable("x-powered-by");

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_2,
    "http://localhost:5173",
    "http://127.0.0.1:5173"
].filter(Boolean);

app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: "cross-origin"
        }
    })
);

app.use(
    cors({
        origin: (origin, callback) => {
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("CORS origin not allowed"));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "Accept"
        ]
    })
);

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many requests. Please try again later."
    }
});

app.use("/api", apiLimiter);
/* ======================================================
   UPLOADED PRODUCT IMAGES
   Images uploaded through Admin Products are served
   directly from the backend uploads directory.
   ====================================================== */

const path = require("path");

app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "uploads"))
);


app.use(
    express.json({
        limit: "1mb"
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: "1mb"
    })
);

// ======================================================
// AUTH ROUTES
// ======================================================

app.use(
    "/api/auth",
    authRoutes
);

// ======================================================
// SERVE GENERATED RECEIPTS
// ======================================================

// ======================================================
// ROOT ROUTE
// ======================================================

app.get(
    "/",
    (req, res) => {

        res.json({

            success: true,

            message:
                "🚀 M-Pesa Receipt Backend Running Successfully"
        });
    }
);

app.use(
    "/api/products",
    productsRoute
);

app.use(
    "/api/categories",
    categoryRoutes
);

app.use(
    "/api/inventory",
    inventoryRoutes
);

app.use(
    "/api/orders",
    orderRoutes
);

app.use(
    "/api",
    stkpushRoute
);

app.use(
    "/api/customers",
    customerRoutes
);

app.use(
    "/api/c2b",
    c2bRoute
);

app.use(
    "/api/dashboard",
    dashboardRoute
);

app.use(
    "/api/payments",
    paymentsRoutes
);

app.use(
    "/api/cash",
    cashRoutes
);

app.use(
    "/api/cash-transactions",
    cashTransactionsRoutes
);

app.use(
    "/api/admin",
    adminRoutes
);

app.use(
    "/api/cart",
    cartRoutes
);

app.use(
    "/api/gallery",
    galleryRoutes
);

app.use(
    "/api/customer-auth",
    customerAuthRoutes
);

app.use(
    "/api/admin/reports",
    reportsRoutes
);

app.use(
    "/api/analytics",
    analyticsRoutes
);

app.use(
    "/api/expenses",
    expensesRoutes
);

app.use(
    "/api/reports/financial",
    financialReportsRoutes
);

// ======================================================
// M-PESA STK CALLBACK
// ======================================================

app.post(
    "/api/mpesa-callback",
    async (req, res) => {

        console.log(
            "======================================"
        );

        console.log(
            "📲 M-PESA CALLBACK RECEIVED"
        );

        console.log(
            "======================================"
        );

        console.log("M-Pesa callback received.");

        try {

            // ==================================================
            // GET STK CALLBACK
            // ==================================================

            const callback =
                req.body?.Body?.stkCallback;

            if (!callback) {

                console.log(
                    "❌ Invalid M-Pesa callback"
                );

                return res.status(200).json({

                    ResultCode: 0,

                    ResultDesc:
                        "Accepted"
                });
            }

            // ==================================================
            // CALLBACK DATA
            // ==================================================

            const resultCode =
                Number(
                    callback.ResultCode
                );

            const checkoutRequestId =
                callback.CheckoutRequestID;

            const merchantRequestId =
                callback.MerchantRequestID;

            console.log("M-Pesa request identifiers received.");

            console.log(
                "ResultCode:",
                resultCode
            );

            console.log("ResultDesc received.");

            // ==================================================
            // VALIDATE CHECKOUT REQUEST ID
            // ==================================================

            if (!checkoutRequestId) {

                console.log(
                    "❌ Missing CheckoutRequestID"
                );

                return res.status(200).json({

                    ResultCode: 0,

                    ResultDesc:
                        "Accepted"
                });
            }

            // ==================================================
            // FIND PAYMENT
            // ==================================================

            const payment =
                await prisma.payment.findUnique({

                    where: {

                        checkoutRequestId:
                            checkoutRequestId
                    },

                    include: {

                        order: {

                            include: {

                                customer: true,

                                orderitem: {

                                    include: {

                                        product: true
                                    }
                                }
                            }
                        }
                    }
                });

            // ==================================================
            // PAYMENT NOT FOUND
            // ==================================================

            if (!payment) {

                console.log(
                    "❌ Payment not found:",
                    checkoutRequestId
                );

                return res.status(200).json({

                    ResultCode: 0,

                    ResultDesc:
                        "Accepted"
                });
            }

            console.log(
                "======================================"
            );

            console.log(
                "✅ PAYMENT FOUND"
            );

            console.log(
                "Payment ID:",
                payment.id
            );

            console.log(
                "Payment Status:",
                payment.status
            );

            console.log(
                "Payment Method:",
                payment.paymentMethod
            );

            console.log(
                "======================================"
            );

            // ==================================================
            // ONLY PROCESS MPESA
            // ==================================================

            if (
                String(
                    payment.paymentMethod
                ).toUpperCase() !== "MPESA"
            ) {

                console.log(
                    "⚠️ Callback belongs to non-MPESA payment."
                );

                return res.status(200).json({

                    ResultCode: 0,

                    ResultDesc:
                        "Accepted"
                });
            }

            // ==================================================
// CHECK ORDER
// ==================================================

const { order } = payment;

if (!order) {

    console.log(
        "❌ Payment has no linked order."
    );

    return res.status(200).json({

        ResultCode: 0,

        ResultDesc:
            "Accepted"
    });
}

            console.log(
                "🛒 Order:",
                order.orderNumber
            );

            // ==================================================
            // SUCCESSFUL PAYMENT
            // ==================================================

            if (resultCode === 0) {

                console.log(
                    "======================================"
                );

                console.log(
                    "✅ M-PESA PAYMENT SUCCESSFUL"
                );

                console.log(
                    "======================================"
                );

                // ==================================================
                // EXTRACT CALLBACK METADATA
                // ==================================================

                const metadata =
                    callback.CallbackMetadata?.Item || [];

                const amount =
                    Number(
                        metadata.find(
                            item =>
                                item.Name ===
                                "Amount"
                        )?.Value || 0
                    );

                const receipt =
                    metadata.find(
                        item =>
                            item.Name ===
                            "MpesaReceiptNumber"
                    )?.Value;

                const phone =
                    metadata.find(
                        item =>
                            item.Name ===
                            "PhoneNumber"
                    )?.Value?.toString();

                const transactionDate =
                    metadata.find(
                        item =>
                            item.Name ===
                            "TransactionDate"
                    )?.Value;

                console.log("M-Pesa payment metadata received.");

                // ==================================================
                // EXPECTED ORDER AMOUNT
                // ==================================================

                const expectedAmount =
                    Number(
                        order.totalAmount
                    );

                console.log("Payment amount received for validation.");

                // ==================================================
                // VALIDATE AMOUNT
                // ==================================================

                if (
                    !Number.isFinite(amount) ||
                    amount <= 0
                ) {

                    console.log(
                        "❌ Invalid payment amount."
                    );

                    await prisma.payment.update({

                        where: {
                            id: payment.id
                        },

                        data: {

                            resultCode,

                            resultDescription:
                                "Invalid payment amount received from M-Pesa.",

                            status:
                                "FAILED"
                        }
                    });

                    await prisma.order.update({

                        where: {
                            id: order.id
                        },

                        data: {

                            paymentStatus:
                                "FAILED",

                            orderStatus:
                                "CANCELLED"
                        }
                    });

                    return res.status(200).json({

                        ResultCode: 0,

                        ResultDesc:
                            "Accepted"
                    });
                }

                // ==================================================
                // PAYMENT AMOUNT MISMATCH
                // ==================================================

                if (
                    Math.round(amount) !==
                    Math.round(expectedAmount)
                ) {

                    console.log(
                        "🚨 PAYMENT AMOUNT MISMATCH"
                    );

                    console.log(
                        "Expected:",
                        expectedAmount
                    );

                    console.log(
                        "Received:",
                        amount
                    );

                    await prisma.payment.update({

                        where: {
                            id: payment.id
                        },

                        data: {

                            amountPaid:
                                amount,

                            mpesaReceiptNumber:
                                receipt || null,

                            merchantRequestId:
                                merchantRequestId ||
                                payment.merchantRequestId,

                            phoneNumber:
                                phone ||
                                payment.phoneNumber,

                            resultCode,

                            resultDescription:
                                "Payment amount does not match order total.",

                            status:
                                "FAILED"
                        }
                    });

                    await prisma.order.update({

                        where: {
                            id: order.id
                        },

                        data: {

                            paymentStatus:
                                "FAILED",

                            orderStatus:
                                "CANCELLED"
                        }
                    });

                    return res.status(200).json({

                        ResultCode: 0,

                        ResultDesc:
                            "Accepted"
                    });
                }

                // ==================================================
                // DUPLICATE PAYMENT PROTECTION
                // ==================================================

                if (
                    String(
                        payment.status
                    ).toUpperCase() ===
                    "SUCCESS"
                ) {

                    console.log(
                        "⚠️ Payment already processed."
                    );

                    console.log(
                        "⚠️ Ignoring duplicate callback."
                    );

                    return res.status(200).json({

                        ResultCode: 0,

                        ResultDesc:
                            "Accepted"
                    });
                }

                // ==================================================
                // DUPLICATE ORDER PROTECTION
                // ==================================================

                if (
                    String(
                        order.paymentStatus
                    ).toUpperCase() ===
                    "PAID"
                ) {

                    console.log(
                        "⚠️ Order already marked PAID."
                    );

                    return res.status(200).json({

                        ResultCode: 0,

                        ResultDesc:
                            "Accepted"
                    });
                }

                // ==================================================
                // CHECK STOCK BEFORE MARKING PAYMENT SUCCESS
                // ==================================================

                let insufficientStock =
                    false;

                for (
                    const item of order.orderitem
                ) {

                    const currentProduct =
                        await prisma.product.findUnique({

                            where: {
                                id:
                                    item.productId
                            }
                        });

                    if (!currentProduct) {

                        console.log(
                            "❌ Product not found:",
                            item.productId
                        );

                        insufficientStock = true;

                        break;
                    }

                    if (
                        currentProduct.stock <
                        item.quantity
                    ) {

                        console.log(
                            "🚨 INSUFFICIENT STOCK"
                        );

                        console.log(
                            "Product:",
                            currentProduct.name
                        );

                        console.log(
                            "Available:",
                            currentProduct.stock
                        );

                        console.log(
                            "Required:",
                            item.quantity
                        );

                        insufficientStock = true;

                        break;
                    }
                }

                // ==================================================
                // STOP PAYMENT PROCESS IF STOCK IS INSUFFICIENT
                // ==================================================

                if (insufficientStock) {

                    console.log(
                        "❌ PAYMENT RECEIVED BUT STOCK IS INSUFFICIENT."
                    );

                    await prisma.payment.update({

                        where: {
                            id: payment.id
                        },

                        data: {

                            amountPaid:
                                amount,

                            mpesaReceiptNumber:
                                receipt || null,

                            merchantRequestId:
                                merchantRequestId ||
                                payment.merchantRequestId,

                            phoneNumber:
                                phone ||
                                payment.phoneNumber,

                            resultCode,

                            resultDescription:
                                "Payment received but product stock is insufficient.",

                            status:
                                "FAILED"
                        }
                    });

                    await prisma.order.update({

                        where: {
                            id: order.id
                        },

                        data: {

                            paymentStatus:
                                "FAILED",

                            orderStatus:
                                "CANCELLED"
                        }
                    });

                    console.log(
                        "⚠️ Order cancelled because of insufficient stock."
                    );

                    return res.status(200).json({

                        ResultCode: 0,

                        ResultDesc:
                            "Accepted"
                    });
                }

                // ==================================================
                // REDUCE STOCK + CREATE INVENTORY TRANSACTION
                // ==================================================

                console.log(
                    "======================================"
                );

                console.log(
                    "📦 STARTING STOCK REDUCTION"
                );

                console.log(
                    "======================================"
                );

                for (
                    const item of order.orderitem
                ) {

                    try {

                        console.log(
                            "--------------------------------------"
                        );

                        console.log(
                            "📦 Processing product:",
                            item.product.name
                        );

                        console.log(
                            "Product ID:",
                            item.productId
                        );

                        console.log(
                            "Quantity sold:",
                            item.quantity
                        );

                        console.log(
                            "Order:",
                            order.orderNumber
                        );

                        // ==================================================
                        // CHECK IF THIS ORDER ALREADY REDUCED STOCK
                        // ==================================================

                        const existingSale =
                            await prisma.inventorytransaction.findFirst({

                                where: {

                                    productId:
                                        item.productId,

                                    reference:
                                        order.orderNumber,

                                    type:
                                        "SALE"
                                }
                            });

                        if (existingSale) {

                            console.log(
                                "⚠️ STOCK ALREADY REDUCED FOR THIS ORDER"
                            );

                            console.log(
                                "Inventory transaction ID:",
                                existingSale.id
                            );

                            console.log(
                                "Skipping duplicate stock reduction."
                            );

                            continue;
                        }

                        // ==================================================
                        // PERFORM STOCK UPDATE INSIDE TRANSACTION
                        // ==================================================

                        const result =
                            await prisma.$transaction(
                                async (tx) => {

                                    // Get latest product record
                                    const product =
                                        await tx.product.findUnique({

                                            where: {
                                                id:
                                                    item.productId
                                            }
                                        });

                                    if (!product) {

                                        throw new Error(
                                            `Product not found: ${item.productId}`
                                        );
                                    }

                                    console.log(
                                        "Current database stock:",
                                        product.stock
                                    );

                                    // ==================================================
                                    // CHECK STOCK
                                    // ==================================================

                                    if (
                                        product.stock <
                                        item.quantity
                                    ) {

                                        throw new Error(
                                            `Insufficient stock for ${product.name}. ` +
                                            `Available: ${product.stock}, ` +
                                            `Required: ${item.quantity}`
                                        );
                                    }

                                    const previousStock =
                                        product.stock;

                                    const newStock =
                                        previousStock -
                                        item.quantity;

                                    console.log(
                                        "Previous stock:",
                                        previousStock
                                    );

                                    console.log(
                                        "Quantity sold:",
                                        item.quantity
                                    );

                                    console.log(
                                        "New stock:",
                                        newStock
                                    );

                                    // ==================================================
                                    // UPDATE PRODUCT STOCK
                                    // ==================================================

                                    const updatedProduct =
                                        await tx.product.update({

                                            where: {
                                                id:
                                                    item.productId
                                            },

                                            data: {
                                                stock:
                                                    newStock
                                            }
                                        });

                                    console.log(
                                        "✅ PRODUCT STOCK UPDATED"
                                    );

                                    console.log(
                                        "Database stock after update:",
                                        updatedProduct.stock
                                    );

                                    // ==================================================
                                    // CREATE INVENTORY TRANSACTION
                                    // ==================================================

                                    const inventoryTransaction =
                                        await tx.inventorytransaction.create({

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
                                                    "Stock reduced after successful M-Pesa payment. Receipt: " +
                                                    (receipt || "N/A")
                                            }
                                        });

                                    console.log(
                                        "✅ INVENTORY TRANSACTION CREATED"
                                    );

                                    console.log(
                                        "Inventory Transaction ID:",
                                        inventoryTransaction.id
                                    );

                                    return {
                                        product:
                                            updatedProduct,

                                        inventoryTransaction,

                                        previousStock,

                                        newStock
                                    };
                                }
                            );

                        // ==================================================
                        // VERIFY RESULT
                        // ==================================================

                        const {
                            product,
                            inventoryTransaction,
                            previousStock,
                            newStock
                        } = result;

                        console.log(
                            "--------------------------------------"
                        );

                        console.log(
                            "✅ STOCK REDUCTION SUCCESSFUL"
                        );

                        console.log(
                            "--------------------------------------"
                        );

                        console.log(
                            "Product:",
                            product.name
                        );

                        console.log(
                            "Product ID:",
                            product.id
                        );

                        console.log(
                            "Previous stock:",
                            previousStock
                        );

                        console.log(
                            "Quantity sold:",
                            item.quantity
                        );

                        console.log(
                            "Remaining stock:",
                            newStock
                        );

                        console.log(
                            "Database confirmed stock:",
                            product.stock
                        );

                        console.log(
                            "Inventory Transaction ID:",
                            inventoryTransaction.id
                        );

                        console.log(
                            "Order:",
                            order.orderNumber
                        );

                        console.log(
                            "Receipt:",
                            receipt || "N/A"
                        );

                        console.log(
                            "--------------------------------------"
                        );

                        // ==================================================
                        // STOCK ALERT
                        // ==================================================

                        if (
                            newStock === 0
                        ) {

                            console.log(
                                `🚨 OUT OF STOCK: ${product.name}`
                            );

                        } else if (
                            newStock <=
                            product.minimumStock
                        ) {

                            console.log(
                                `⚠️ LOW STOCK: ${product.name}`
                            );
                        }

                    } catch (stockError) {

                        // ==================================================
                        // STOCK REDUCTION ERROR
                        // ==================================================

                        console.error(
                            "======================================"
                        );

                        console.error(
                            "❌ STOCK REDUCTION FAILED"
                        );

                        console.error(
                            "======================================"
                        );

                        console.error(
                            "Product ID:",
                            item.productId
                        );

                        console.error(
                            "Product:",
                            item.product?.name
                        );

                        console.error(
                            "Quantity:",
                            item.quantity
                        );

                        console.error(
                            "Order:",
                            order.orderNumber
                        );

                        console.error(
                            "Error:",
                            stockError.message
                        );

                        console.error(
                            stockError.stack
                        );

                        console.error(
                            "======================================"
                        );

                        // IMPORTANT:
                        // Do not silently continue as if stock was reduced.
                        throw stockError;
                    }
                }

                // ==================================================
                // MARK PAYMENT SUCCESSFUL AFTER STOCK IS CONFIRMED
                // ==================================================

                console.log(
                    "======================================"
                );

                console.log(
                    "💳 MARKING PAYMENT SUCCESSFUL"
                );

                console.log(
                    "======================================"
                );

                const updatedPayment =
                    await prisma.payment.update({

                        where: {
                            id:
                                payment.id
                        },

                        data: {

                            mpesaReceiptNumber:
                                receipt || null,

                            merchantRequestId:
                                merchantRequestId ||
                                payment.merchantRequestId,

                            amountPaid:
                                amount,

                            phoneNumber:
                                phone ||
                                payment.phoneNumber,

                            resultCode,

                            resultDescription:
                                callback.ResultDesc,

                            status:
                                "SUCCESS"
                        }
                    });

                console.log(
                    "✅ Payment marked SUCCESS:",
                    updatedPayment.id
                );

                // ==================================================
                // MARK ORDER PAID AFTER STOCK IS CONFIRMED
                // ==================================================

                const updatedOrder =
                    await prisma.order.update({

                        where: {
                            id:
                                order.id
                        },

                        data: {

                            paymentStatus:
                                "PAID",

                            orderStatus:
                                "PROCESSING"
                        }
                    });

                console.log(
                    "======================================"
                );

                console.log(
                    "✅ ORDER MARKED PAID"
                );

                console.log(
                    "Order:",
                    updatedOrder.orderNumber
                );

                console.log(
                    "Payment Status:",
                    updatedOrder.paymentStatus
                );

                console.log(
                    "Order Status:",
                    updatedOrder.orderStatus
                );

                console.log(
                    "======================================"
                );

                // ==================================================
                // CUSTOMER DETAILS
                // ==================================================

                const customerName =
                    order.customer?.fullName ||
                    "Customer";

                const customerPhone =
                    phone ||
                    order.customer?.phoneNumber ||
                    updatedPayment.phoneNumber ||
                    "Unknown";

                const customerEmail =
                    order.customer?.email ||
                    null;

                // ==================================================
                // PRODUCT DETAILS
                // ==================================================

                const productName =
                    order.orderitem.length > 0
                        ? order.orderitem
                            .map(
                                item =>
                                    item.product.name
                            )
                            .join(", ")
                        : "Product";

                const quantity =
                    order.orderitem.reduce(
                        (total, item) =>
                            total +
                            item.quantity,
                        0
                    );

                // ==================================================
                // UNIT PRICE
                // ==================================================

                const unitPrice =
                    order.orderitem.length > 0
                        ? Number(
                            order.orderitem[0].unitPrice
                        )
                        : 0;

                // Keep unitPrice available for receipt/email
                // calculations and future extensions.
                void unitPrice;

                // ==================================================
                // GENERATE PDF RECEIPT
                // ==================================================

                let receiptPath = null;

                const receiptData = {

                    customerName,

                    phoneNumber:
                        customerPhone,

                    email:
                        customerEmail,

                    orderNumber:
                        order.orderNumber,

                    receiptNumber:
                        receipt || "N/A",

                    orderItems:
                        order.orderitem.map(
                            item => ({

                                productName:
                                    item.product?.name ||
                                    "Product",

                                quantity:
                                    Number(
                                        item.quantity || 0
                                    ),

                                unitPrice:
                                    Number(
                                        item.unitPrice || 0
                                    )
                            })
                        ),

                    amountPaid:
                        Number(
                            updatedPayment.amountPaid ||
                            0
                        ),

                    paymentMethod:
                        updatedPayment.paymentMethod ||
                        "MPESA",

                    status:
                        updatedPayment.status ||
                        "SUCCESS",

                    mpesaReceiptNumber:
                        updatedPayment.mpesaReceiptNumber ||
                        receipt ||
                        "N/A",

                    checkoutRequestId:
                        updatedPayment.checkoutRequestId ||
                        "N/A",

                    merchantRequestId:
                        updatedPayment.merchantRequestId ||
                        "N/A",

                    location:
                        order.location ||
                        "N/A"
                };

                console.log(
                    "======================================"
                );

                console.log(
                    "🧾 GENERATING PDF RECEIPT"
                );

                console.log(
                    "Receipt Data:"
                );

                console.log(
                    JSON.stringify(
                        receiptData,
                        null,
                        2
                    )
                );

                // ==================================================
                // SEND PAYMENT CONFIRMATION EMAIL
                // ==================================================

                try {

                    if (!customerEmail) {

                        console.log(
                            "⚠️ Customer has no email."
                        );

                        console.log(
                            "⚠️ Skipping payment confirmation email."
                        );

                    } else {

                        console.log(
                            "======================================"
                        );

                        console.log(
                            "📧 SENDING PAYMENT CONFIRMATION EMAIL"
                        );

                        console.log(
                            "To:",
                            customerEmail
                        );

                        console.log(
                            "Order:",
                            order.orderNumber
                        );

                        console.log(
                            "======================================"
                        );

                        await sendPaymentConfirmation({

                            customerEmail,

                            customerName,

                            orderNumber:
                                order.orderNumber,

                            amount,

                            mpesaReceiptNumber:
                                receipt,

                            phoneNumber:
                                customerPhone,

                            productName,

                            quantity,

                            receiptPath
                        });

                        console.log(
                            "✅ Payment confirmation email sent to:",
                            customerEmail
                        );
                    }

                } catch (emailError) {

                    console.error(
                        "❌ Payment Email Error:",
                        emailError.message
                    );
                }

                // ==================================================
                // PAYMENT FLOW COMPLETED
                // ==================================================

                console.log(
                    "======================================"
                );

                console.log(
                    "🎉 PAYMENT FLOW COMPLETED"
                );

                console.log(
                    "STK PUSH"
                );

                console.log(
                    "      ↓"
                );

                console.log(
                    "PAYMENT SUCCESS"
                );

                console.log(
                    "      ↓"
                );

                console.log(
                    "ORDER PAID"
                );

                console.log(
                    "      ↓"
                );

                console.log(
                    "STOCK REDUCED"
                );

                console.log(
                    "      ↓"
                );

                console.log(
                    "PDF RECEIPT"
                );

                console.log(
                    "      ↓"
                );

                console.log(
                    "WHATSAPP"
                );

                console.log(
                    "      ↓"
                );

                console.log(
                    "EMAIL"
                );

                console.log(
                    "======================================"
                );
            }

            // ==================================================
            // FAILED / CANCELLED PAYMENT
            // ==================================================

            else {

                console.log(
                    "======================================"
                );

                console.log(
                    "❌ M-PESA PAYMENT FAILED"
                );

                console.log(
                    "======================================"
                );

                console.log(
                    "ResultCode:",
                    resultCode
                );

                console.log("ResultDesc received.");

                // ==================================================
                // DUPLICATE FAILED CALLBACK
                // ==================================================

                if (
                    String(
                        payment.status
                    ).toUpperCase() ===
                    "FAILED"
                ) {

                    console.log(
                        "⚠️ Payment already marked FAILED."
                    );

                    return res.status(200).json({

                        ResultCode: 0,

                        ResultDesc:
                            "Accepted"
                    });
                }

                // ==================================================
                // UPDATE PAYMENT
                // ==================================================

                await prisma.payment.update({

                    where: {

                        id:
                            payment.id
                    },

                    data: {

                        resultCode,

                        resultDescription:
                            callback.ResultDesc,

                        status:
                            "FAILED"
                    }
                });

                console.log(
                    "❌ Payment marked FAILED."
                );

                // ==================================================
                // CANCEL ORDER
                // ==================================================

                if (
                    payment.orderId
                ) {

                    await prisma.order.update({

                        where: {

                            id:
                                payment.orderId
                        },

                        data: {

                            paymentStatus:
                                "FAILED",

                            orderStatus:
                                "CANCELLED"
                        }
                    });

                    console.log(
                        "❌ Order marked CANCELLED."
                    );
                }
            }

            // ==================================================
            // ACKNOWLEDGE SAFARICOM
            // ==================================================

            return res.status(200).json({

                ResultCode: 0,

                ResultDesc:
                    "Accepted"
            });

        } catch (error) {

            console.error(
                "======================================"
            );

            console.error(
                "❌ CALLBACK ERROR"
            );

            console.error(
                "======================================"
            );

            console.error("M-Pesa callback processing failed.");

            console.error(
                "======================================"
            );

            // ==================================================
            // IMPORTANT
            // ALWAYS ACKNOWLEDGE SAFARICOM
            // ==================================================

            return res.status(200).json({

                ResultCode: 0,

                ResultDesc:
                    "Accepted"
            });
        }
    }
);

// ======================================================
// DASHBOARD STATS
// ======================================================

app.get(
    "/api/stats",
    async (req, res) => {

        try {

            const totalPayments =
                await prisma.payment.count({

                    where: {

                        status:
                            "SUCCESS"
                    }
                });

            const totalReceived =
                await prisma.payment.aggregate({

                    where: {

                        status:
                            "SUCCESS"
                    },

                    _sum: {

                        amountPaid:
                            true
                    }
                });

            res.json({

                success:
                    true,

                totalTransactions:
                    totalPayments,

                totalReceived:
                    totalReceived._sum.amountPaid ||
                    0
            });

        } catch (error) {

            console.error(
                "❌ STATS ERROR:",
                error
            );

            res.status(500).json({

                success:
                    false,

                error:
                    error.message
            });
        }
    }
);

// ======================================================
// START SERVER
// ======================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "=================================="
        );

        console.log(
            "🚀 M-PESA RECEIPT BACKEND"
        );

        console.log(
            "=================================="
        );

        console.log(
            `🌐 Local: http://localhost:${PORT}`
        );

        console.log(
            `📱 Network: http://192.168.0.101:${PORT}`
        );

        console.log(
            `📦 Products: http://192.168.0.101:${PORT}/api/products`
        );

        console.log(
            `🛒 Orders: http://192.168.0.101:${PORT}/api/orders`
        );

        console.log(
            `💳 Payments: http://192.168.0.101:${PORT}/api/payments`
        );

        console.log(
            `🖼️ Gallery: http://192.168.0.101:${PORT}/api/gallery`
        );

        console.log(
            `📊 Stats: http://192.168.0.101:${PORT}/api/stats`
        );

        console.log(
            `📲 M-Pesa Callback: http://192.168.0.101:${PORT}/api/mpesa-callback`
        );

        console.log(
            "=================================="
        );
    }
);





















