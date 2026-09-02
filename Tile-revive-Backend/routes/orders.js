const express = require("express");
const prisma = require("../db");

const {
    sendNewOrderNotification,
    sendOrderConfirmation
} = require("../utils/sendEmail");

const router = express.Router();

// ======================================================
// CREATE ORDER
// POST /api/orders
// ======================================================

router.post("/", async (req, res) => {
    try {
        const {
            customerName,
            customerPhone,
            email,
            county,
            location,
            items,
            paymentMethod
        } = req.body;

        const normalizedPaymentMethod =
            String(paymentMethod || "MPESA").trim().toUpperCase();

        if (!["MPESA", "COD"].includes(normalizedPaymentMethod)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method. Choose MPESA or COD."
            });
        }

        // ------------------------------------------------
        // Validate customer
        // ------------------------------------------------

        if (!customerName || !customerPhone) {
            return res.status(400).json({
                success: false,
                message: "Customer name and phone number are required."
            });
        }

        // ------------------------------------------------
        // Validate items
        // ------------------------------------------------

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one product is required."
            });
        }

        for (const item of items) {
            if (!item.productId || item.quantity === undefined) {
                return res.status(400).json({
                    success: false,
                    message: "Each item must have productId and quantity."
                });
            }

            const quantity = Number(item.quantity);

            if (!Number.isInteger(quantity) || quantity <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Quantity must be a positive whole number."
                });
            }
        }

        // ------------------------------------------------
        // Find or create customer
        // ------------------------------------------------

        const customer = await prisma.customer.upsert({
            where: {
                phoneNumber: customerPhone
            },

            update: {
                fullName: customerName,
                email: email || undefined
            },

            create: {
                fullName: customerName,
                phoneNumber: customerPhone,
                email: email || null
            }
        });

        // ------------------------------------------------
        // Validate products
        // ------------------------------------------------

        let totalAmount = 0;

        const orderItems = [];

        for (const item of items) {
            const productId = Number(item.productId);
            const quantity = Number(item.quantity);

            if (!Number.isInteger(productId)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid product ID: ${item.productId}`
                });
            }

            const product = await prisma.product.findUnique({
                where: {
                    id: productId
                }
            });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Product ${productId} not found.`
                });
            }

            // ------------------------------------------------
            // Check product status
            // ------------------------------------------------

            if (product.status !== "ACTIVE") {
                return res.status(400).json({
                    success: false,
                    message: `${product.name} is currently unavailable.`
                });
            }

            // ------------------------------------------------
            // Check stock
            // ------------------------------------------------

            if (product.stock < quantity) {
                return res.status(400).json({
                    success: false,
                    message:
                        `${product.name} has insufficient stock. ` +
                        `Available: ${product.stock}`
                });
            }

            // ------------------------------------------------
            // Calculate price
            // ------------------------------------------------

            const unitPrice = Number(product.price);
            const totalPrice = unitPrice * quantity;

            totalAmount += totalPrice;

            orderItems.push({
                productId: product.id,
                quantity,
                unitPrice,
                totalPrice
            });
        }

        // ------------------------------------------------
        // Generate order number
        // ------------------------------------------------

        const orderNumber = `ORD-${Date.now()}`;

        // ------------------------------------------------
        // Create order + order items
        // ------------------------------------------------

        const order = await prisma.order.create({
            data: {
                orderNumber,

                customerId: customer.id,

                totalAmount,

                // Customer delivery location
                county: county || null,

                location: location || null,

                paymentStatus: "PENDING",

                orderStatus: "PENDING",

                // Prisma relation is orderitem
                orderitem: {
                    create: orderItems
                }
            },

            include: {
                customer: true,

                orderitem: {
                    include: {
                        product: true
                    }
                }
            }
        });

        // ------------------------------------------------
        // Create pending payment
        // ------------------------------------------------

        const payment = await prisma.payment.create({
            data: {
                amountPaid: 0,

                phoneNumber: customer.phoneNumber,

                customerId: customer.id,

                orderId: order.id,

                status: "PENDING",

                paymentMethod: normalizedPaymentMethod
            }
        });

        // ======================================================
        // SEND ORDER PLACED EMAIL
        // ======================================================

        try {
            console.log(
                "======================================"
            );

            console.log(
                "📧 SENDING ORDER PLACED EMAIL"
            );

            console.log(
                "Internal Email:",
                process.env.EMAIL_USER
            );

            console.log(
                "Customer Email:",
                order.customer?.email || "N/A"
            );

            console.log(
                "Order:",
                order.orderNumber
            );

            console.log(
                "County:",
                order.county || "N/A"
            );

            console.log(
                "Location:",
                order.location || "N/A"
            );

            console.log(
                "======================================"
            );

            await sendNewOrderNotification({

                orderNumber:
                    order.orderNumber,

                customerName:
                    order.customer?.fullName,

                customerPhone:
                    order.customer?.phoneNumber,

                customerEmail:
                    order.customer?.email,

                county:
                    order.county || "N/A",

                location:
                    order.location || "N/A",

                items:
                    order.orderitem,

                totalAmount:
                    Number(order.totalAmount || 0),

                paymentMethod:
                    payment.paymentMethod,

                paymentStatus:
                    payment.status,

                orderStatus:
                    order.orderStatus
            });

            // ======================================================
// SEND CUSTOMER ORDER CONFIRMATION
// ======================================================

try {

    console.log(
        "======================================"
    );

    console.log(
        "📧 SENDING CUSTOMER ORDER CONFIRMATION"
    );

    console.log(
        "Customer Email:",
        order.customer?.email || "N/A"
    );

    console.log(
        "Order:",
        order.orderNumber
    );

    console.log(
        "======================================"
    );

    await sendOrderConfirmation({

        customerEmail:
            order.customer?.email,

        customerName:
            order.customer?.fullName,

        orderNumber:
            order.orderNumber,

        customerPhone:
            order.customer?.phoneNumber,

        county:
            order.county || "N/A",

        location:
            order.location || "N/A",

        items:
            order.orderitem,

        totalAmount:
            Number(order.totalAmount || 0),

        paymentMethod:
            payment.paymentMethod,

        paymentStatus:
            payment.status,

        orderStatus:
            order.orderStatus
    });

    console.log(
        "✅ CUSTOMER ORDER CONFIRMATION SENT"
    );

} catch (customerEmailError) {

    console.error(
        "❌ CUSTOMER ORDER CONFIRMATION FAILED"
    );

    console.error(
        customerEmailError.message
    );

    // Email failure must NOT cancel the order.
}

            console.log(
                "✅ ORDER PLACED EMAIL SENT"
            );

        } catch (emailError) {

            console.error(
                "❌ ORDER PLACED EMAIL FAILED"
            );

            console.error(
                emailError.message
            );

            // Email failure must NOT cancel the order.
        }

        // ------------------------------------------------
        // Response
        // ------------------------------------------------

        return res.status(201).json({

            success: true,

            message: "Order created successfully.",

            order: {

                id:
                    order.id,

                orderNumber:
                    order.orderNumber,

                customer:
                    order.customer,

                county:
                    order.county,

                location:
                    order.location,

                totalAmount:
                    order.totalAmount,

                paymentStatus:
                    order.paymentStatus,

                orderStatus:
                    order.orderStatus,

                items:
                    order.orderitem
            },

            payment: {

                id:
                    payment.id,

                status:
                    payment.status,

                amountPaid:
                    payment.amountPaid
            }
        });

    } catch (error) {

        console.error(
            "CREATE ORDER ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to create order.",

            error:
                error.message
        });
    }
});


// ======================================================
// GET ALL ORDERS
// GET /api/orders
// ======================================================

router.get("/", async (req, res) => {

    try {

        const orders = await prisma.order.findMany({

            include: {

                customer: true,

                orderitem: {
                    include: {
                        product: true
                    }
                },

                payment: true
            },

            orderBy: {
                createdAt: "desc"
            }
        });

        return res.json({

            success: true,

            count:
                orders.length,

            orders
        });

    } catch (error) {

        console.error(
            "GET ORDERS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to fetch orders.",

            error:
                error.message
        });
    }
});


// ======================================================
// GET SINGLE ORDER
// GET /api/orders/:id
// ======================================================

router.get("/:id", async (req, res) => {

    try {

        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid order ID."
            });
        }

        const order = await prisma.order.findUnique({

            where: {
                id
            },

            include: {

                customer: true,

                orderitem: {
                    include: {
                        product: true
                    }
                },

                payment: true
            }
        });

        if (!order) {

            return res.status(404).json({

                success: false,

                message:
                    "Order not found."
            });
        }

        return res.json({

            success: true,

            order
        });

    } catch (error) {

        console.error(
            "GET ORDER ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to fetch order.",

            error:
                error.message
        });
    }
});


// ======================================================
// GET CUSTOMER ORDER HISTORY
// GET /api/orders/history/:phone
// ======================================================

router.get("/history/:phone", async (req, res) => {

    try {

        const { phone } = req.params;

        if (!phone) {

            return res.status(400).json({

                success: false,

                message:
                    "Customer phone number is required."
            });
        }

        const customer =
            await prisma.customer.findUnique({

                where: {
                    phoneNumber: phone
                }
            });

        if (!customer) {

            return res.status(404).json({

                success: false,

                message:
                    "Customer not found."
            });
        }

        const orders =
            await prisma.order.findMany({

                where: {
                    customerId: customer.id
                },

                include: {

                    customer: true,

                    orderitem: {
                        include: {
                            product: true
                        }
                    },

                    payment: true
                },

                orderBy: {
                    createdAt: "desc"
                }
            });

        return res.json({

            success: true,

            customer: {

                id:
                    customer.id,

                fullName:
                    customer.fullName,

                phoneNumber:
                    customer.phoneNumber,

                email:
                    customer.email
            },

            count:
                orders.length,

            orders
        });

    } catch (error) {

        console.error(
            "GET ORDER HISTORY ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to fetch customer order history.",

            error:
                error.message
        });
    }
});


// ======================================================
// GET ORDERS BY STATUS
// GET /api/orders/status/:status
// ======================================================

router.get("/status/:status", async (req, res) => {

    try {

        const { status } = req.params;

        const orders =
            await prisma.order.findMany({

                where: {

                    orderStatus:
                        status.toUpperCase()
                },

                include: {

                    customer: true,

                    orderitem: {
                        include: {
                            product: true
                        }
                    },

                    payment: true
                },

                orderBy: {
                    createdAt: "desc"
                }
            });

        return res.json({

            success: true,

            status:
                status.toUpperCase(),

            count:
                orders.length,

            orders
        });

    } catch (error) {

        console.error(
            "GET ORDERS BY STATUS ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to fetch orders by status.",

            error:
                error.message
        });
    }
});


module.exports = router;