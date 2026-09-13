const express = require("express");
const prisma = require("../db");
const { validateOrderOffer } = require("../utils/validateOrderOffer");

const {
    authenticateToken,
    requireAdmin,
} = require("../middleware/auth");

// ======================================================
// EMAIL FUNCTIONS
// ======================================================

const {
    sendOrderStatusUpdate,
    sendPaymentStatusUpdate,
    sendPaymentConfirmation,
    sendNewOrderNotification,
    sendOrderConfirmation,
} = require("../utils/sendEmail");

const {
    logCommunication,
} = require("../utils/logCommunication");

const generatePdfReceipt =
    require("../generateReceipt");

const {
    isMetaConfigured,
    getMetaConfig,
} = require("../services/metaAds");
const router = express.Router();

// ======================================================
// META ADS CONNECTION STATUS
// GET /api/admin/meta/status
// ADMIN ONLY
// ======================================================

router.get(
    "/meta/status",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const config = getMetaConfig();

            return res.json({
                success: true,
                configured: isMetaConfigured(),
                accountConfigured: Boolean(
                    config.adAccountId
                ),
                pageConfigured: Boolean(
                    config.pageId
                ),
                graphApiVersion:
                    process.env.META_GRAPH_API_VERSION ||
                    "v23.0",
            });

        } catch (error) {

            console.error(
                "META STATUS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to check Meta configuration.",
            });

        }

    }
);



// ======================================================
// GET PENDING USERS
// GET /api/admin/users/pending
// ADMIN ONLY
// ======================================================

router.get(
    "/users/pending",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const users =
                await prisma.user.findMany({

                    where: {
                        role: "USER",
                        emailVerified: true,
                        adminApproved: false,
                    },

                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true,
                        emailVerified: true,
                        adminApproved: true,
                        createdAt: true,
                    },

                    orderBy: {
                        createdAt: "asc",
                    },

                });

            return res.json({

                success: true,
                count: users.length,
                users,

            });

        } catch (error) {

            console.error(
                "GET PENDING USERS ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load pending users",

            });

        }

    }
);


// ======================================================
// APPROVE USER
// PATCH /api/admin/users/:id/approve
// ADMIN ONLY
// ======================================================

router.patch(
    "/users/:id/approve",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const userId =
                Number(req.params.id);

            if (!Number.isInteger(userId)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid user ID",

                });

            }

            const user =
                await prisma.user.findUnique({

                    where: {
                        id: userId,
                    },

                });

            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found",

                });

            }

            if (user.role === "ADMIN") {

                return res.status(400).json({

                    success: false,

                    message:
                        "Admin accounts do not require approval",

                });

            }

            if (!user.emailVerified) {

                return res.status(400).json({

                    success: false,

                    message:
                        "User must verify their email first",

                });

            }

            if (user.adminApproved) {

                return res.status(400).json({

                    success: false,

                    message:
                        "User is already approved",

                });

            }

            const approvedUser =
                await prisma.user.update({

                    where: {
                        id: userId,
                    },

                    data: {

                        adminApproved: true,

                        approvedAt:
                            new Date(),

                    },

                    select: {

                        id: true,
                        fullName: true,
                        email: true,
                        role: true,
                        emailVerified: true,
                        adminApproved: true,
                        approvedAt: true,

                    },

                });

            return res.json({

                success: true,

                message:
                    "User approved successfully",

                user:
                    approvedUser,

            });

        } catch (error) {

            console.error(
                "APPROVE USER ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to approve user",

            });

        }

    }
);



// ======================================================
// CREATE ADMIN ORDER
// POST /api/admin/orders/create
// ADMIN ONLY
// ======================================================

router.post(
    "/orders/create",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const {
                customerId,
                items,
                paymentMethod,
                offer,
            } = req.body;

            const customerIdNumber = Number(customerId);

            if (
                !Number.isInteger(customerIdNumber) ||
                customerIdNumber <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "A valid customer is required.",
                });
            }

            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "At least one product is required.",
                });
            }

            const method =
                String(paymentMethod || "COD").toUpperCase();

            if (!["COD", "MPESA"].includes(method)) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Payment method must be COD or MPESA.",
                });
            }

            const result =
                await prisma.$transaction(async (tx) => {

                    // ------------------------------------------
                    // CUSTOMER
                    // ------------------------------------------

                    const customer =
                        await tx.customer.findUnique({
                            where: {
                                id: customerIdNumber,
                            },
                        });

                    if (!customer) {
                        throw new Error(
                            "Customer not found."
                        );
                    }

                    // ------------------------------------------
                    // NORMALIZE ITEMS
                    // ------------------------------------------

                    const requestedItems =
                        items.map((item) => ({
                            productId:
                                Number(item.productId),
                            quantity:
                                Number(item.quantity || 1),
                            unitPrice: 0,
                            isFreeItem:
                                Boolean(item.isFreeItem),
                            offerName:
                                item.offerName || null,
                        }));

                    for (const item of requestedItems) {

                        if (
                            !Number.isInteger(item.productId) ||
                            item.productId <= 0
                        ) {
                            throw new Error(
                                "Invalid product ID."
                            );
                        }

                        if (
                            !Number.isInteger(item.quantity) ||
                            item.quantity <= 0
                        ) {
                            throw new Error(
                                "Product quantity must be a positive whole number."
                            );
                        }
                    }

                    // ------------------------------------------
                    // LOAD PRODUCTS
                    // ------------------------------------------

                    const productIds = [
                        ...new Set(
                            requestedItems.map(
                                (item) => item.productId
                            )
                        ),
                    ];

                    const products =
                        await tx.product.findMany({
                            where: {
                                id: {
                                    in: productIds,
                                },
                            },
                        });

                    if (
                        products.length !==
                        productIds.length
                    ) {
                        throw new Error(
                            "One or more selected products do not exist."
                        );
                    }

                    // ------------------------------------------
                    // USE DATABASE PRICES
                    // ------------------------------------------

                    for (const item of requestedItems) {

                        const product =
                            products.find(
                                (p) =>
                                    p.id === item.productId
                            );

                        if (!product) {
                            throw new Error(
                                "Product not found."
                            );
                        }

                        if (product.status !== "ACTIVE") {
                            throw new Error(
                                `${product.name} is not active.`
                            );
                        }

                        if (
                            product.stock <
                            item.quantity
                        ) {
                            throw new Error(
                                `Insufficient stock for ${product.name}. Available: ${product.stock}.`
                            );
                        }

                        item.unitPrice =
                            item.isFreeItem
                                ? 0
                                : Number(product.price || 0);
                    }

                    // ------------------------------------------
                    // SERVER-SIDE OFFER VALIDATION
                    // ------------------------------------------

                    const validated =
                        await validateOrderOffer(
                            offer,
                            requestedItems,
                            tx
                        );

                    const finalItems =
                        validated.items;

                    // ------------------------------------------
                    // FINAL PRICES
                    // ------------------------------------------

                    for (const item of finalItems) {

                        const product =
                            products.find(
                                (p) =>
                                    p.id === item.productId
                            );

                        if (!product) {
                            throw new Error(
                                "Offer product could not be found."
                            );
                        }

                        item.unitPrice =
                            item.isFreeItem
                                ? 0
                                : Number(product.price || 0);
                    }

                    // ------------------------------------------
                    // TOTAL
                    // ------------------------------------------

                    const subtotalAmount =
                        finalItems.reduce(
                            (total, item) =>
                                total +
                                Number(item.unitPrice || 0) *
                                Number(item.quantity || 0),
                            0
                        );

                    const offerDiscount =
                        Math.max(
                            0,
                            Number(validated.offerDiscount || 0)
                        );

                    const totalAmount =
                        Math.max(
                            0,
                            subtotalAmount - offerDiscount
                        );

                    // ------------------------------------------
                    // ORDER NUMBER
                    // ------------------------------------------

                    const orderNumber =
                        `ORD-${Date.now()}-${Math.floor(
                            Math.random() * 1000
                        )}`;

                    // ------------------------------------------
                    // CREATE ORDER
                    // ------------------------------------------

                    const order =
                        await tx.order.create({
                            data: {
                                orderNumber,
                                customerId:
                                    customer.id,
                                totalAmount,
                                paymentStatus:
                                    "PENDING",
                                orderStatus:
                                    "PENDING",
                                offerName:
                                    offer?.name || null,
                                offerCode:
                                    offer?.code || null,
                                offerDiscount:
                                    Number(
                                        validated.offerDiscount || 0
                                    ),
                                offerDescription:
                                    offer?.description || null,
                            },
                        });

                    // ------------------------------------------
                    // ORDER ITEMS + STOCK
                    // ------------------------------------------

                    for (const item of finalItems) {

                        const product =
                            products.find(
                                (p) =>
                                    p.id === item.productId
                            );

                        const itemTotal =
                            Number(item.unitPrice || 0) *
                            Number(item.quantity || 0);

                        await tx.orderitem.create({
                            data: {
                                orderId: order.id,
                                productId: product.id,
                                quantity: item.quantity,
                                unitPrice:
                                    Number(
                                        item.unitPrice || 0
                                    ),
                                totalPrice: itemTotal,
                            },
                        });

                        const previousStock =
                            product.stock;

                        const newStock =
                            previousStock -
                            item.quantity;

                        await tx.product.update({
                            where: {
                                id: product.id,
                            },
                            data: {
                                stock: newStock,
                            },
                        });

                        await tx.inventorytransaction.create({
                            data: {
                                productId:
                                    product.id,
                                type: "SALE",
                                quantity:
                                    item.quantity,
                                previousStock,
                                newStock,
                                reference:
                                    orderNumber,
                                note:
                                    item.isFreeItem
                                        ? `Free offer item - ${offer?.name || "Offer"}`
                                        : `Admin order ${orderNumber}`,
                            },
                        });
                    }

                    // ------------------------------------------
                    // PAYMENT
                    // ------------------------------------------

                    await tx.payment.create({
                        data: {
                            amountPaid: 0,
                            paymentMethod:
                                method,
                            status: "PENDING",
                            customerId:
                                customer.id,
                            orderId:
                                order.id,
                        },
                    });

                    return order;
                });

            // ----------------------------------------------
            // LOAD COMPLETE ORDER
            // ----------------------------------------------

            const createdOrder =
                await prisma.order.findUnique({
                    where: {
                        id: result.id,
                    },
                    include: {
                        customer: true,
                        orderitem: {
                            include: {
                                product: true,
                            },
                        },
                        payment: true,
                    },
                });

            // ----------------------------------------------
            // CUSTOMER EMAIL
            // ----------------------------------------------

            if (createdOrder.customer?.email) {

                try {

                    const emailInfo =
                        await sendOrderConfirmation({
                            customerEmail:
                                createdOrder.customer.email,
                            customerName:
                                createdOrder.customer.fullName,
                            orderNumber:
                                createdOrder.orderNumber,
                            customerPhone:
                                createdOrder.customer.phoneNumber,
                            county: "N/A",
                            location:
                                "Admin created order",
                            items:
                                createdOrder.orderitem,
                            totalAmount:
                                createdOrder.totalAmount,
                            paymentMethod:
                                method,
                            paymentStatus:
                                createdOrder.paymentStatus,
                            orderStatus:
                                createdOrder.orderStatus,
                        });

                    await logCommunication({
                        customerId:
                            createdOrder.customerId,
                        orderId:
                            createdOrder.id,
                        type:
                            "ORDER_CONFIRMATION",
                        recipient:
                            createdOrder.customer.email,
                        subject:
                            `Order ${createdOrder.orderNumber} confirmation`,
                        status:
                            "SENT",
                        messageId:
                            emailInfo?.messageId ||
                            null,
                    });

                } catch (emailError) {

                    console.error(
                        "ADMIN ORDER CUSTOMER EMAIL ERROR:",
                        emailError
                    );

                    await logCommunication({
                        customerId:
                            createdOrder.customerId,
                        orderId:
                            createdOrder.id,
                        type:
                            "ORDER_CONFIRMATION",
                        recipient:
                            createdOrder.customer.email,
                        subject:
                            `Order ${createdOrder.orderNumber} confirmation`,
                        status:
                            "FAILED",
                        errorMessage:
                            emailError.message,
                    });
                }
            }

            // ----------------------------------------------
            // INTERNAL NOTIFICATION
            // ----------------------------------------------

            try {

                await sendNewOrderNotification({
                    orderNumber:
                        createdOrder.orderNumber,
                    customerName:
                        createdOrder.customer.fullName,
                    customerPhone:
                        createdOrder.customer.phoneNumber,
                    customerEmail:
                        createdOrder.customer.email,
                    county:
                    createdOrder.customer?.county ||
                    "N/A",
                    location:
                        createdOrder.customer?.location ||
                        "N/A",
                    items:
                        createdOrder.orderitem,
                    totalAmount:
                        createdOrder.totalAmount,
                    paymentMethod:
                        method,
                    paymentStatus:
                        createdOrder.paymentStatus,
                    orderStatus:
                        createdOrder.orderStatus,
                });

            } catch (notificationError) {

                console.error(
                    "ADMIN ORDER INTERNAL EMAIL ERROR:",
                    notificationError
                );
            }

            return res.status(201).json({
                success: true,
                message:
                    "Admin order created successfully.",
                order: createdOrder,
            });

        } catch (error) {

            console.error(
                "CREATE ADMIN ORDER ERROR:",
                error
            );

            return res.status(400).json({
                success: false,
                message:
                    error.message ||
                    "Failed to create admin order.",
            });
        }
    }
);
// ======================================================
// GET ALL ORDERS
// GET /api/admin/orders
// ADMIN ONLY
// ======================================================

router.get(
    "/orders",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const orders =
                await prisma.order.findMany({

                    orderBy: {
                        createdAt: "desc",
                    },

                    include: {

                        customer: true,

                        orderitem: {
                            include: {
                                product: true,
                            },
                        },

                        payment: true,

                        statusHistory: {

                            orderBy: {
                                createdAt: "asc",
                            },

                        },

                    },

                });

            return res.json({

                success: true,

                count:
                    orders.length,

                orders,

            });

        } catch (error) {

            console.error(
                "GET ADMIN ORDERS ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load orders.",

                error:
                    error.message,

            });

        }

    }
);


// ======================================================
// GET SINGLE ORDER
// GET /api/admin/orders/:id
// ADMIN ONLY
// ======================================================

router.get(
    "/orders/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const orderId =
                Number(req.params.id);

            if (!Number.isInteger(orderId)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID.",

                });

            }

            const order =
                await prisma.order.findUnique({

                    where: {
                        id: orderId,
                    },

                    include: {

                        customer: true,

                        orderitem: {
                            include: {
                                product: true,
                            },
                        },

                        payment: true,

                        statusHistory: {

                            orderBy: {
                                createdAt: "asc",
                            },

                        },

                    },

                });

            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found.",

                });

            }

            return res.json({

                success: true,

                order,

            });

        } catch (error) {

            console.error(
                "GET ADMIN ORDER ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load order.",

                error:
                    error.message,

            });

        }

    }
);



// ======================================================
// SEND RECEIPT
// POST /api/admin/orders/:id/send-receipt
// ADMIN ONLY
//
// IMPORTANT:
// This route ONLY generates and sends a receipt for an
// already-paid order.
//
// It does NOT:
// - charge M-PESA
// - reduce stock
// - create inventory transactions
// - change payment status
// - change order status
// ======================================================

router.post(
    "/orders/:id/send-receipt",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            // ==================================================
            // VALIDATE ORDER ID
            // ==================================================

            const orderId =
                Number(req.params.id);

            if (!Number.isInteger(orderId)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID.",

                });

            }


            // ==================================================
            // FIND ORDER
            // ==================================================

            const order =
                await prisma.order.findUnique({

                    where: {
                        id: orderId,
                    },

                    include: {

                        customer: true,

                        orderitem: {

                            include: {
                                product: true,
                            },

                        },

                        payment: true,

                    },

                });


            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found.",

                });

            }


            // ==================================================
            // FIND PAYMENT
            // ==================================================

            const payment =
                Array.isArray(order.payment)
                    ? order.payment[0]
                    : order.payment;


            if (!payment) {

                return res.status(404).json({

                    success: false,

                    message:
                        "No payment record exists for this order.",

                });

            }


            // ==================================================
            // VERIFY PAYMENT IS SUCCESSFUL
            // ==================================================

            const orderPaymentStatus =
                String(
                    order.paymentStatus || ""
                ).toUpperCase();

            const paymentRecordStatus =
                String(
                    payment.status || ""
                ).toUpperCase();


            if (
                orderPaymentStatus !== "SUCCESS" ||
                paymentRecordStatus !== "SUCCESS"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Receipt can only be sent for a successfully paid order.",

                    paymentStatus:
                        orderPaymentStatus,

                    paymentRecordStatus:
                        paymentRecordStatus,

                });

            }


            // ==================================================
            // CUSTOMER EMAIL
            // ==================================================

            const customerEmail =
                order.customer?.email;


            if (!customerEmail) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This customer does not have an email address.",

                });

            }


            // ==================================================
            // CUSTOMER INFORMATION
            // ==================================================

            const customerName =
                order.customer?.fullName ||
                "Customer";

            const customerPhone =
                order.customer?.phoneNumber ||
                payment.phoneNumber ||
                "N/A";


            // ==================================================
            // RECEIPT NUMBER
            // ==================================================

            const receiptNumber =
                payment.mpesaReceiptNumber ||
                "N/A";


            // ==================================================
            // RECEIPT DATA
            // ==================================================

            const receiptData = {

                customerName,

                phoneNumber:
                    customerPhone,

                email:
                    customerEmail,

                orderNumber:
                    order.orderNumber,

                receiptNumber,

                orderItems:
                    (order.orderitem || []).map(
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
                                ),

                        })
                    ),

                amountPaid:
                    Number(
                        payment.amountPaid ||
                        order.totalAmount ||
                        0
                    ),

                paymentMethod:
                    payment.paymentMethod ||
                    "MPESA",

                status:
                    payment.status ||
                    "SUCCESS",

                mpesaReceiptNumber:
                    payment.mpesaReceiptNumber ||
                    "N/A",

                checkoutRequestId:
                    payment.checkoutRequestId ||
                    "N/A",

                merchantRequestId:
                    payment.merchantRequestId ||
                    "N/A",

                location:
                    order.location ||
                    "N/A",

            };


            console.log(
                "======================================"
            );

            console.log(
                "🧾 ADMIN RECEIPT REQUEST"
            );

            console.log(
                "Order:",
                order.orderNumber
            );

            console.log(
                "Customer:",
                customerEmail
            );

            console.log(
                "Payment Status:",
                paymentRecordStatus
            );


            // ==================================================
            // GENERATE RECEIPT PDF
            // ==================================================

            const receiptPath =
                await generatePdfReceipt(
                    receiptData
                );


            console.log(
                "✅ ADMIN RECEIPT PDF GENERATED"
            );

            console.log(
                "Receipt Path:",
                receiptPath
            );


            // ==================================================
            // SEND RECEIPT EMAIL
            // ==================================================

            const firstItem =
                order.orderitem?.[0];

            const productName =
                firstItem?.product?.name ||
                "Order";

            const quantity =
                order.orderitem?.reduce(
                    (total, item) =>
                        total +
                        Number(
                            item.quantity || 0
                        ),
                    0
                ) || 0;


            const emailInfo =
                await sendPaymentConfirmation({

                    customerEmail,

                    customerName,

                    orderNumber:
                        order.orderNumber,

                    amount:
                        Number(
                            payment.amountPaid ||
                            order.totalAmount ||
                            0
                        ),

                    mpesaReceiptNumber:
                        payment.mpesaReceiptNumber ||
                        "N/A",

                    phoneNumber:
                        customerPhone,

                    productName,

                    quantity,

                    receiptPath,

                });


            await logCommunication({
                customerId:
                    order.customer?.id,

                orderId:
                    order.id,

                userId:
                    req.user?.userId || null,

                type:
                    "PAYMENT_CONFIRMATION",

                recipient:
                    customerEmail,

                subject:
                    "Payment confirmation - Tile Revive",

                status:
                    emailInfo?.messageId
                        ? "SENT"
                        : "FAILED",

                messageId:
                    emailInfo?.messageId || null,

            });


            console.log(
                emailInfo?.messageId
                    ? "✅ ADMIN RECEIPT EMAIL SENT"
                    : "⚠️ ADMIN RECEIPT EMAIL FAILED"
            );

            console.log(
                "Customer:",
                customerEmail
            );

            console.log(
                "======================================"
            );


            // ==================================================
            // SUCCESS
            // ==================================================

            return res.json({

                success: true,

                message:
                    "Receipt generated and sent successfully.",

                orderId,

                orderNumber:
                    order.orderNumber,

                customerEmail,

                paymentStatus:
                    orderPaymentStatus,

                orderStatus:
                    order.orderStatus,

                receiptSent:
                    true,

                receiptPath,

                messageId:
                    emailInfo?.messageId ||
                    null,

            });


        } catch (error) {

            console.error(
                "======================================"
            );

            console.error(
                "❌ ADMIN SEND RECEIPT ERROR"
            );

            console.error(
                error
            );

            console.error(
                "======================================"
            );


            return res.status(500).json({

                success: false,

                message:
                    "Failed to generate and send receipt.",

                error:
                    error.message,

            });

        }

    }
);

// ======================================================
// UPDATE ORDER STATUS
// PATCH /api/admin/orders/:id/status
// ADMIN ONLY
// ======================================================

router.patch(
    "/orders/:id/status",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const orderId =
                Number(req.params.id);

            const {
                orderStatus
            } = req.body;


            // ==================================================
            // VALIDATE ORDER ID
            // ==================================================

            if (!Number.isInteger(orderId)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID",

                });

            }


            // ==================================================
            // ALLOWED ORDER STATUSES
            // ==================================================

            const allowedStatuses = [

                "PENDING",

                "PROCESSING",

                "READY",

                "OUT_FOR_DELIVERY",

                "DELIVERED",

                "CANCELLED",

            ];


            // ==================================================
            // VALIDATE STATUS
            // ==================================================

            if (
                !orderStatus ||
                !allowedStatuses.includes(
                    String(orderStatus)
                        .toUpperCase()
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order status.",

                    allowedStatuses,

                });

            }


            const newStatus =
                String(orderStatus)
                    .toUpperCase();


            // ==================================================
            // FIND ORDER
            // ==================================================

            const order =
                await prisma.order.findUnique({

                    where: {
                        id: orderId,
                    },

                    include: {

                        customer: true,

                        orderitem: {
                            include: {
                                product: true,
                            },
                        },

                        payment: true,

                    },

                });


            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found",

                });

            }


            // ==================================================
            // PREVENT CHANGING DELIVERED ORDERS
            // ==================================================

            if (
                order.orderStatus ===
                "DELIVERED"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A delivered order cannot be changed.",

                });

            }


            // ==================================================
            // PREVENT UNNECESSARY UPDATE
            // ==================================================

            if (
                order.orderStatus ===
                newStatus
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `Order is already ${newStatus}.`,

                });

            }


            // ==================================================
            // SAVE PREVIOUS STATUS
            // ==================================================

            const previousStatus =
                order.orderStatus;


            // ==================================================
            // UPDATE ORDER + HISTORY
            // ==================================================

            const updatedOrder =
                await prisma.$transaction(

                    async (tx) => {

                        // --------------------------------------
                        // UPDATE ORDER
                        // --------------------------------------

                        await tx.order.update({

                            where: {
                                id: orderId,
                            },

                            data: {

                                orderStatus:
                                    newStatus,

                            },

                        });


                        // --------------------------------------
                        // CREATE STATUS HISTORY
                        // --------------------------------------

                        await tx.orderstatushistory.create({

                            data: {

                                orderId:
                                    orderId,

                                fromStatus:
                                    previousStatus,

                                toStatus:
                                    newStatus,

                            },

                        });


                        // --------------------------------------
                        // RETURN UPDATED ORDER
                        // --------------------------------------

                        return await tx.order.findUnique({

                            where: {
                                id: orderId,
                            },

                            include: {

                                customer: true,

                                orderitem: {
                                    include: {
                                        product: true,
                                    },
                                },

                                payment: true,

                                statusHistory: {

                                    orderBy: {
                                        createdAt:
                                            "asc",
                                    },

                                },

                            },

                        });

                    }

                );


            // ==================================================
            // ==================================================
            // PERSIST ADMIN AUDIT LOG
            // ==================================================

            try {

                await prisma.auditlog.create({

                    data: {

                        userId:
                            Number(req.user.userId),

                        action:
                            "ORDER_STATUS_CHANGED",

                        entity:
                            "order",

                        entityId:
                            orderId,

                        method:
                            req.method,

                        route:
                            req.originalUrl,

                        ipAddress:
                            req.ip,

                        userAgent:
                            req.get("user-agent"),

                        metadata:
                            JSON.stringify({

                                orderNumber:
                                    updatedOrder.orderNumber,

                                customerId:
                                    updatedOrder.customerId,

                                previousStatus:
                                    previousStatus,

                                newStatus:
                                    newStatus,

                                changedAt:
                                    new Date().toISOString(),

                            }),

                    },

                });

                console.log(
                    "ORDER STATUS AUDIT LOG CREATED:",
                    updatedOrder.orderNumber
                );

            } catch (auditError) {

                console.error(
                    "ORDER STATUS AUDIT LOG ERROR:",
                    auditError
                );

            }

            // SEND CUSTOMER STATUS EMAIL
            // ==================================================

            if (
                updatedOrder?.customer?.email
            ) {

                try {

                    console.log("📧 STATUS EMAIL DEBUG:", {
    customerId: updatedOrder.customer?.id,
    customerEmail: updatedOrder.customer?.email,
    customerName: updatedOrder.customer?.fullName,
    orderNumber: updatedOrder.orderNumber,
    previousStatus,
    newStatus,
    totalAmount: updatedOrder.totalAmount,
});

await sendOrderStatusUpdate({
    customerEmail:
        updatedOrder.customer?.email,

    customerName:
        updatedOrder.customer?.fullName,

    orderNumber:
        updatedOrder.orderNumber,

    orderStatus:
        newStatus,

    previousStatus:
        previousStatus,

    totalAmount:
        updatedOrder.totalAmount,
});


                    await logCommunication({
                        customerId:
                            updatedOrder.customer?.id,

                        orderId:
                            updatedOrder.id,

                        userId:
                            req.user?.userId || null,

                        type:
                            newStatus === "CANCELLED"
                                ? "ORDER_CANCELLED"
                                : "ORDER_STATUS_UPDATE",

                        recipient:
                            updatedOrder.customer.email,

                        subject:
                            newStatus === "CANCELLED"
                                ? "Your Tile Revive order has been cancelled"
                                : "Your Tile Revive order status has been updated",

                        status:
                            "SENT",

                    });


                    console.log(
                        "📧 CUSTOMER ORDER STATUS EMAIL SENT"
                    );

                    console.log(
                        "Customer:",
                        updatedOrder.customer.email
                    );

                    console.log(
                        "Order:",
                        updatedOrder.orderNumber
                    );

                    console.log(
                        "Status:",
                        newStatus
                    );

                } catch (emailError) {

                    console.error(
                        "📧 CUSTOMER ORDER STATUS EMAIL ERROR:",
                        emailError
                    );

                }

            } else {

                console.log(
                    "📧 STATUS EMAIL SKIPPED: Customer has no email"
                );

            }


            // ==================================================
            // LOG
            // ==================================================

            console.log(
                "======================================"
            );

            console.log(
                "📦 ORDER STATUS UPDATED"
            );

            console.log(
                "Order:",
                updatedOrder.orderNumber
            );

            console.log(
                "Previous Status:",
                previousStatus
            );

            console.log(
                "New Status:",
                newStatus
            );

            console.log(
                "======================================"
            );


            // ==================================================
            // RESPONSE
            // ==================================================

            return res.json({

                success: true,

                message:
                    "Order status updated successfully.",

                order:
                    updatedOrder,

            });

        } catch (error) {

            console.error(
                "UPDATE ORDER STATUS ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to update order status.",

                error:
                    error.message,

            });

        }

    }
);


// ======================================================
// UPDATE PAYMENT STATUS
// PATCH /api/admin/orders/:id/payment-status
// ADMIN ONLY
// ======================================================

router.patch(
    "/orders/:id/payment-status",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const orderId =
                Number(req.params.id);

            const paymentStatus =
                String(
                    req.body.paymentStatus || ""
                ).toUpperCase();


            // ==================================================
            // VALIDATE ORDER ID
            // ==================================================

            if (!Number.isInteger(orderId)) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order ID.",

                });

            }


            // ==================================================
            // ALLOWED PAYMENT STATUSES
            // ==================================================

            const allowedStatuses = [

                "PENDING",

                "SUCCESS",

                "FAILED",

                "CANCELLED",

            ];


            if (
                !allowedStatuses.includes(
                    paymentStatus
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid payment status.",

                    allowedStatuses,

                });

            }


            // ==================================================
            // FIND ORDER
            // ==================================================

            const order =
                await prisma.order.findUnique({

                    where: {
                        id: orderId,
                    },

                    include: {

                        customer: true,

                        orderitem: {

                            include: {
                                product: true,
                            },

                        },

                        payment: true,

                        statusHistory: {

                            orderBy: {
                                createdAt: "asc",
                            },

                        },

                    },

                });


            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Order not found.",

                });

            }


            // ==================================================
            // PREVENT UNNECESSARY PAYMENT UPDATE
            // ==================================================

            if (
                order.paymentStatus ===
                paymentStatus
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `Payment is already ${paymentStatus}.`,

                });

            }


            // ==================================================
            // FIND PAYMENT RECORD
            // ==================================================

            const payment =
                Array.isArray(order.payment)
                    ? order.payment[0]
                    : order.payment;


            if (!payment) {

                return res.status(404).json({

                    success: false,

                    message:
                        "No payment record exists for this order.",

                });

            }


            // ==================================================
            // SAVE PREVIOUS PAYMENT STATUS
            // ==================================================

            const previousPaymentStatus =
                order.paymentStatus;


            // ==================================================
            // CALCULATE AMOUNT PAID
            // ==================================================

            const amountPaid =
                paymentStatus === "SUCCESS"
                    ? Number(
                        order.totalAmount || 0
                    )
                    : 0;


            // ==================================================
            // UPDATE ORDER + PAYMENT
            // ==================================================

            const updatedOrder =
                await prisma.$transaction(

                    async (tx) => {

                        // --------------------------------------
                        // UPDATE ORDER PAYMENT STATUS
                        // --------------------------------------

                        await tx.order.update({

                            where: {
                                id: orderId,
                            },

                            data: {

                                paymentStatus:
                                    paymentStatus,

                            },

                        });


                        // --------------------------------------
                        // UPDATE PAYMENT RECORD
                        // --------------------------------------

                        await tx.payment.update({

                            where: {
                                id: payment.id,
                            },

                            data: {

                                status:
                                    paymentStatus,

                                amountPaid:
                                    amountPaid,

                                updatedAt:
                                    new Date(),

                            },

                        });


                        // --------------------------------------
                        // RETURN FRESH ORDER
                        // --------------------------------------

                        return await tx.order.findUnique({

                            where: {
                                id: orderId,
                            },

                            include: {

                                customer: true,

                                orderitem: {

                                    include: {
                                        product: true,
                                    },

                                },

                                payment: true,

                                statusHistory: {

                                    orderBy: {
                                        createdAt:
                                            "asc",
                                    },

                                },

                            },

                        });

                    }

                );


            // ==================================================
            // ==================================================
            // PERSIST ADMIN PAYMENT AUDIT LOG
            // ==================================================

            try {

                await prisma.auditlog.create({

                    data: {

                        userId:
                            Number(req.user.userId),

                        action:
                            "ORDER_PAYMENT_STATUS_CHANGED",

                        entity:
                            "order",

                        entityId:
                            orderId,

                        method:
                            req.method,

                        route:
                            req.originalUrl,

                        ipAddress:
                            req.ip,

                        userAgent:
                            req.get("user-agent"),

                        metadata:
                            JSON.stringify({

                                orderNumber:
                                    updatedOrder.orderNumber,

                                customerId:
                                    updatedOrder.customerId,

                                paymentId:
                                    payment.id,

                                previousPaymentStatus:
                                    previousPaymentStatus,

                                newPaymentStatus:
                                    paymentStatus,

                                amountPaid:
                                    amountPaid,

                                changedAt:
                                    new Date().toISOString(),

                            }),

                    },

                });

                console.log(
                    "ORDER PAYMENT AUDIT LOG CREATED:",
                    updatedOrder.orderNumber
                );

            } catch (auditError) {

                console.error(
                    "ORDER PAYMENT AUDIT LOG ERROR:",
                    auditError
                );

            }

                        // SEND CUSTOMER PAYMENT EMAIL
            // ==================================================

            if (
                updatedOrder?.customer?.email
            ) {

                try {

                    // ==================================================
                    // SUCCESS = PAYMENT CONFIRMATION
                    // ==================================================

                    if (
                        paymentStatus === "SUCCESS"
                    ) {

                        const firstItem =
                            updatedOrder.orderitem?.[0];

                        const productName =
                            firstItem?.product?.name ||
                            "Order";

                        const quantity =
                            updatedOrder.orderitem?.reduce(
                                (total, item) =>
                                    total +
                                    Number(
                                        item.quantity || 0
                                    ),
                                0
                            ) || 0;

                        const paymentRecord =
                            Array.isArray(
                                updatedOrder.payment
                            )
                                ? updatedOrder.payment[0]
                                : updatedOrder.payment;

                        // ==================================================
                        // AUTOMATIC PAYMENT RECEIPT DATA
                        // ==================================================

                        const customerEmail =
                            updatedOrder.customer.email;

                        const customerName =
                            updatedOrder.customer?.fullName ||
                            "Customer";

                        const customerPhone =
                            updatedOrder.customer?.phoneNumber ||
                            paymentRecord?.phoneNumber ||
                            "N/A";

                        const receiptNumber =
                            paymentRecord?.mpesaReceiptNumber ||
                            "N/A";

                        const receiptData = {

                            customerName,

                            phoneNumber:
                                customerPhone,

                            email:
                                customerEmail,

                            orderNumber:
                                updatedOrder.orderNumber,

                            receiptNumber,

                            orderItems:
                                (updatedOrder.orderitem || []).map(
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
                                            ),

                                    })
                                ),

                            amountPaid:
                                Number(
                                    paymentRecord?.amountPaid ||
                                    amountPaid ||
                                    updatedOrder.totalAmount ||
                                    0
                                ),

                            paymentMethod:
                                paymentRecord?.paymentMethod ||
                                "MPESA",

                            status:
                                paymentRecord?.status ||
                                "SUCCESS",

                            mpesaReceiptNumber:
                                paymentRecord?.mpesaReceiptNumber ||
                                "N/A",

                            checkoutRequestId:
                                paymentRecord?.checkoutRequestId ||
                                "N/A",

                            merchantRequestId:
                                paymentRecord?.merchantRequestId ||
                                "N/A",

                            location:
                                updatedOrder.location ||
                                "N/A",

                        };


                        // ==================================================
                        // GENERATE PDF RECEIPT
                        // ==================================================

                        let receiptPath = null;

                        try {

                            receiptPath =
                                await generatePdfReceipt(
                                    receiptData
                                );

                            console.log(
                                "======================================"
                            );

                            console.log(
                                "AUTOMATIC PAYMENT RECEIPT GENERATED"
                            );

                            console.log(
                                "Order:",
                                updatedOrder.orderNumber
                            );

                            console.log(
                                "Receipt Path:",
                                receiptPath
                            );

                        } catch (receiptError) {

                            console.error(
                                "AUTOMATIC RECEIPT PDF GENERATION FAILED:",
                                receiptError
                            );

                        }


                        // ==================================================
                        // SEND PAYMENT CONFIRMATION WITH PDF
                        // ==================================================

                        const emailInfo =
                            await sendPaymentConfirmation({

                                customerEmail,

                                customerName,

                                orderNumber:
                                    updatedOrder.orderNumber,

                                amount:
                                    Number(
                                        paymentRecord?.amountPaid ||
                                        amountPaid ||
                                        updatedOrder.totalAmount ||
                                        0
                                    ),

                                mpesaReceiptNumber:
                                    paymentRecord?.mpesaReceiptNumber ||
                                    "N/A",

                                phoneNumber:
                                    customerPhone,

                                productName:
                                    productName,

                                quantity:
                                    quantity,

                                receiptPath,

                            });

                        await logCommunication({

                            customerId:
                                updatedOrder.customer?.id,

                            orderId:
                                updatedOrder.id,

                            userId:
                                req.user?.userId || null,

                            type:
                                "PAYMENT_CONFIRMATION",

                            recipient:
                                updatedOrder.customer.email,

                            subject:
                                `Payment confirmed - ${updatedOrder.orderNumber}`,

                            status:
                                emailInfo?.messageId
                                    ? "SENT"
                                    : "FAILED",

                            messageId:
                                emailInfo?.messageId ||
                                null,

                        });

                        console.log(
                            "CUSTOMER PAYMENT CONFIRMATION SENT:",
                            updatedOrder.orderNumber
                        );

                    } else {

                        // ==================================================
                        // FAILED / CANCELLED / OTHER STATUS
                        // ==================================================

                        const emailInfo =
                            await sendPaymentStatusUpdate(

                                updatedOrder,

                                previousPaymentStatus,

                                paymentStatus

                            );

                        await logCommunication({

                            customerId:
                                updatedOrder.customer?.id,

                            orderId:
                                updatedOrder.id,

                            userId:
                                req.user?.userId || null,

                            type:
                                "PAYMENT_STATUS_UPDATE",

                            recipient:
                                updatedOrder.customer.email,

                            subject:
                                "Payment status update - Tile Revive",

                            status:
                                emailInfo?.messageId
                                    ? "SENT"
                                    : "FAILED",

                            messageId:
                                emailInfo?.messageId ||
                                null,

                        });

                        console.log(
                            "CUSTOMER PAYMENT STATUS EMAIL SENT:",
                            updatedOrder.orderNumber
                        );

                    }

                } catch (emailError) {

                    console.error(
                        "CUSTOMER PAYMENT EMAIL ERROR:",
                        emailError
                    );

                    try {

                        await logCommunication({

                            customerId:
                                updatedOrder.customer?.id,

                            orderId:
                                updatedOrder.id,

                            userId:
                                req.user?.userId || null,

                            type:
                                paymentStatus === "SUCCESS"
                                    ? "PAYMENT_CONFIRMATION"
                                    : "PAYMENT_STATUS_UPDATE",

                            recipient:
                                updatedOrder.customer.email,

                            subject:
                                paymentStatus === "SUCCESS"
                                    ? `Payment confirmed - ${updatedOrder.orderNumber}`
                                    : "Payment status update - Tile Revive",

                            status:
                                "FAILED",

                            errorMessage:
                                emailError.message,

                        });

                    } catch (logError) {

                        console.error(
                            "PAYMENT EMAIL LOG ERROR:",
                            logError
                        );

                    }

                }

            } else {

                console.log(
                    "PAYMENT EMAIL SKIPPED: Customer has no email"
                );

            }

            // LOG
            // ==================================================

            console.log(
                "======================================"
            );

            console.log(
                "💳 PAYMENT STATUS UPDATED"
            );

            console.log(
                "Order:",
                updatedOrder.orderNumber
            );

            console.log(
                "Payment ID:",
                payment.id
            );

            console.log(
                "Previous Payment Status:",
                previousPaymentStatus
            );

            console.log(
                "New Payment Status:",
                paymentStatus
            );

            console.log(
                "Amount Paid:",
                amountPaid
            );

            console.log(
                "======================================"
            );


            // ==================================================
            // RESPONSE
            // ==================================================

            return res.json({

                success: true,

                message:
                    "Payment status updated successfully.",

                order:
                    updatedOrder,

            });

        } catch (error) {

            console.error(
                "UPDATE PAYMENT STATUS ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to update payment status.",

                error:
                    error.message,

            });

        }

    }
);


// ======================================================
// EXPORT ROUTER
// ======================================================


// ======================================================
// OFFER LIBRARY
// ADMIN ONLY
// ======================================================

// GET ALL OFFERS
// GET /api/admin/offers

router.get(
    "/offers",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const offers =
                await prisma.offer.findMany({

                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                stock: true,
                                image: true,
                            },
                        },
                    },

                    orderBy: [
                        {
                            status: "asc",
                        },
                        {
                            createdAt: "desc",
                        },
                    ],

                });

            return res.json({

                success: true,
                count: offers.length,
                offers,

            });

        } catch (error) {

            console.error(
                "GET ADMIN OFFERS ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load offers.",

            });

        }

    }
);


// CREATE OFFER
// POST /api/admin/offers

router.post(
    "/offers",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const {
                name,
                description,
                type,
                productId,
                quantity,
                discountValue,
                status,
            } = req.body;

            const cleanName =
                String(name || "").trim();

            const cleanType =
                String(type || "")
                    .trim()
                    .toUpperCase();

            const cleanDescription =
                description
                    ? String(description).trim()
                    : null;

            const cleanStatus =
                String(status || "ACTIVE")
                    .trim()
                    .toUpperCase();

            const validTypes = [
                "FREE_PRODUCT",
                "FIXED_DISCOUNT",
                "PERCENTAGE_DISCOUNT",
            ];

            const validStatuses = [
                "ACTIVE",
                "INACTIVE",
            ];

            if (!cleanName) {
                return res.status(400).json({
                    success: false,
                    message: "Offer name is required.",
                });
            }

            if (!validTypes.includes(cleanType)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid offer type.",
                });
            }

            if (!validStatuses.includes(cleanStatus)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid offer status.",
                });
            }

            const cleanQuantity =
                Math.max(
                    1,
                    Number(quantity || 1)
                );

            const cleanDiscount =
                Math.max(
                    0,
                    Number(discountValue || 0)
                );

            if (!Number.isInteger(cleanQuantity)) {
                return res.status(400).json({
                    success: false,
                    message: "Quantity must be a whole number.",
                });
            }

            if (!Number.isFinite(cleanDiscount)) {
                return res.status(400).json({
                    success: false,
                    message: "Discount value must be a valid number.",
                });
            }

            if (
                cleanType === "FREE_PRODUCT" &&
                !Number.isInteger(Number(productId))
            ) {
                return res.status(400).json({
                    success: false,
                    message: "A free product must be selected.",
                });
            }

            if (
                (
                    cleanType === "FIXED_DISCOUNT" ||
                    cleanType === "PERCENTAGE_DISCOUNT"
                ) &&
                cleanDiscount <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Discount value must be greater than zero.",
                });
            }

            if (
                cleanType === "PERCENTAGE_DISCOUNT" &&
                cleanDiscount > 100
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Percentage discount cannot exceed 100%.",
                });
            }

            let selectedProduct = null;

            if (productId) {

                selectedProduct =
                    await prisma.product.findUnique({

                        where: {
                            id: Number(productId),
                        },

                        select: {
                            id: true,
                            name: true,
                            price: true,
                            stock: true,
                        },

                    });

                if (!selectedProduct) {
                    return res.status(404).json({
                        success: false,
                        message: "Selected product was not found.",
                    });
                }
            }

            const offer =
                await prisma.offer.create({

                    data: {

                        name: cleanName,

                        description:
                            cleanDescription,

                        type:
                            cleanType,

                        productId:
                            selectedProduct
                                ? selectedProduct.id
                                : null,

                        quantity:
                            cleanType === "FREE_PRODUCT"
                                ? cleanQuantity
                                : 1,

                        discountValue:
                            cleanType === "FREE_PRODUCT"
                                ? 0
                                : cleanDiscount,

                        status:
                            cleanStatus,

                    },

                    include: {

                        product: {

                            select: {
                                id: true,
                                name: true,
                                price: true,
                                stock: true,
                                image: true,
                            },

                        },

                    },

                });

            return res.status(201).json({

                success: true,

                message:
                    "Offer created successfully.",

                offer,

            });

        } catch (error) {

            console.error(
                "CREATE ADMIN OFFER ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to create offer.",

            });

        }

    }
);


// UPDATE OFFER
// PATCH /api/admin/offers/:id

router.patch(
    "/offers/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const offerId =
                Number(req.params.id);

            if (!Number.isInteger(offerId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid offer ID.",
                });
            }

            const existingOffer =
                await prisma.offer.findUnique({
                    where: {
                        id: offerId,
                    },
                });

            if (!existingOffer) {
                return res.status(404).json({
                    success: false,
                    message: "Offer not found.",
                });
            }

            const {
                name,
                description,
                type,
                productId,
                quantity,
                discountValue,
                status,
            } = req.body;

            const data = {};

            if (name !== undefined) {

                const cleanName =
                    String(name).trim();

                if (!cleanName) {
                    return res.status(400).json({
                        success: false,
                        message: "Offer name cannot be empty.",
                    });
                }

                data.name = cleanName;
            }

            if (description !== undefined) {

                data.description =
                    description
                        ? String(description).trim()
                        : null;
            }

            if (type !== undefined) {

                const cleanType =
                    String(type)
                        .trim()
                        .toUpperCase();

                if (
                    ![
                        "FREE_PRODUCT",
                        "FIXED_DISCOUNT",
                        "PERCENTAGE_DISCOUNT",
                    ].includes(cleanType)
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid offer type.",
                    });
                }

                data.type = cleanType;
            }

            if (status !== undefined) {

                const cleanStatus =
                    String(status)
                        .trim()
                        .toUpperCase();

                if (
                    ![
                        "ACTIVE",
                        "INACTIVE",
                    ].includes(cleanStatus)
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid offer status.",
                    });
                }

                data.status = cleanStatus;
            }

            if (productId !== undefined) {

                if (
                    productId === null ||
                    productId === ""
                ) {

                    data.productId = null;

                } else {

                    const parsedProductId =
                        Number(productId);

                    if (
                        !Number.isInteger(
                            parsedProductId
                        )
                    ) {
                        return res.status(400).json({
                            success: false,
                            message: "Invalid product ID.",
                        });
                    }

                    const product =
                        await prisma.product.findUnique({
                            where: {
                                id: parsedProductId,
                            },
                        });

                    if (!product) {
                        return res.status(404).json({
                            success: false,
                            message:
                                "Selected product was not found.",
                        });
                    }

                    data.productId =
                        parsedProductId;
                }
            }

            if (quantity !== undefined) {

                const parsedQuantity =
                    Number(quantity);

                if (
                    !Number.isInteger(
                        parsedQuantity
                    ) ||
                    parsedQuantity < 1
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Quantity must be at least 1.",
                    });
                }

                data.quantity =
                    parsedQuantity;
            }

            if (discountValue !== undefined) {

                const parsedDiscount =
                    Number(discountValue);

                if (
                    !Number.isFinite(
                        parsedDiscount
                    ) ||
                    parsedDiscount < 0
                ) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Discount value must be valid.",
                    });
                }

                data.discountValue =
                    parsedDiscount;
            }

            const resultingType =
                data.type ||
                existingOffer.type;

            const resultingProductId =
                data.productId !== undefined
                    ? data.productId
                    : existingOffer.productId;

            if (
                resultingType === "FREE_PRODUCT" &&
                !resultingProductId
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A free product must be selected.",
                });
            }

            if (
                resultingType === "PERCENTAGE_DISCOUNT"
            ) {

                const resultingDiscount =
                    data.discountValue !== undefined
                        ? data.discountValue
                        : existingOffer.discountValue;

                if (resultingDiscount > 100) {
                    return res.status(400).json({
                        success: false,
                        message:
                            "Percentage discount cannot exceed 100%.",
                    });
                }
            }

            const updatedOffer =
                await prisma.offer.update({

                    where: {
                        id: offerId,
                    },

                    data,

                    include: {

                        product: {

                            select: {
                                id: true,
                                name: true,
                                price: true,
                                stock: true,
                                image: true,
                            },

                        },

                    },

                });

            return res.json({

                success: true,

                message:
                    "Offer updated successfully.",

                offer:
                    updatedOffer,

            });

        } catch (error) {

            console.error(
                "UPDATE ADMIN OFFER ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to update offer.",

            });

        }

    }
);


// DELETE OFFER
// DELETE /api/admin/offers/:id

router.delete(
    "/offers/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const offerId =
                Number(req.params.id);

            if (!Number.isInteger(offerId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid offer ID.",
                });
            }

            const existingOffer =
                await prisma.offer.findUnique({

                    where: {
                        id: offerId,
                    },

                });

            if (!existingOffer) {
                return res.status(404).json({
                    success: false,
                    message: "Offer not found.",
                });
            }

            await prisma.offer.delete({

                where: {
                    id: offerId,
                },

            });

            return res.json({

                success: true,

                message:
                    "Offer deleted successfully.",

            });

        } catch (error) {

            console.error(
                "DELETE ADMIN OFFER ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to delete offer.",

            });

        }

    }
);


module.exports = router;




















