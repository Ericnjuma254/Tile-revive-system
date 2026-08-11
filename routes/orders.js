const express = require("express");
const prisma = require("../db");

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
            items
        } = req.body;

        // ------------------------------------------------
        // Validate request
        // ------------------------------------------------

        if (!customerName || !customerPhone) {
            return res.status(400).json({
                success: false,
                message: "Customer name and phone number are required."
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one product is required."
            });
        }

        // ------------------------------------------------
        // Validate item quantities
        // ------------------------------------------------

        for (const item of items) {
            if (!item.productId || !item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: "Each item must have productId and quantity."
                });
            }

            if (Number(item.quantity) <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Quantity must be greater than zero."
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
        // Validate products and calculate total
        // ------------------------------------------------

        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const product = await prisma.product.findUnique({
                where: {
                    id: Number(item.productId)
                }
            });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Product ${item.productId} not found.`
                });
            }

            // Check product status
            if (product.status !== "ACTIVE") {
                return res.status(400).json({
                    success: false,
                    message: `${product.name} is currently unavailable.`
                });
            }

            // Check stock
            if (product.stock < Number(item.quantity)) {
                return res.status(400).json({
                    success: false,
                    message:
                        `${product.name} has insufficient stock. ` +
                        `Available: ${product.stock}`
                });
            }

            const quantity = Number(item.quantity);
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

        const orderNumber =
            `ORD-${Date.now()}`;

        // ------------------------------------------------
        // Create Order + OrderItems
        // ------------------------------------------------

        const order = await prisma.order.create({
            data: {
                orderNumber,
                customerId: customer.id,
                totalAmount,

                paymentStatus: "PENDING",
                orderStatus: "PENDING",

                items: {
                    create: orderItems
                }
            },

            include: {
                customer: true,

                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        // ------------------------------------------------
        // Create Pending Payment
        // ------------------------------------------------

        const payment = await prisma.payment.create({
            data: {
                amountPaid: 0,
                phoneNumber: customer.phoneNumber,
                customerId: customer.id,
                orderId: order.id,

                status: "Pending",
                paymentMethod: "M-PESA"
            }
        });

        // ------------------------------------------------
        // Response
        // ------------------------------------------------

        return res.status(201).json({
            success: true,
            message: "Order created successfully.",

            order: {
                id: order.id,
                orderNumber: order.orderNumber,

                customer: order.customer,

                totalAmount: order.totalAmount,

                paymentStatus: order.paymentStatus,
                orderStatus: order.orderStatus,

                items: order.items
            },

            payment: {
                id: payment.id,
                status: payment.status,
                amountPaid: payment.amountPaid
            }
        });

    } catch (error) {
        console.error("CREATE ORDER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create order.",
            error: error.message
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

                items: {
                    include: {
                        product: true
                    }
                },

                payments: true
            },

            orderBy: {
                createdAt: "desc"
            }
        });

        return res.json({
            success: true,
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error("GET ORDERS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch orders.",
            error: error.message
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
                message: "Invalid order ID."
            });
        }

        const order = await prisma.order.findUnique({
            where: {
                id
            },

            include: {
                customer: true,

                items: {
                    include: {
                        product: true
                    }
                },

                payments: true
            }
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found."
            });
        }

        return res.json({
            success: true,
            order
        });

    } catch (error) {
        console.error("GET ORDER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch order.",
            error: error.message
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
                message: "Customer phone number is required."
            });
        }

        const customer = await prisma.customer.findUnique({
            where: {
                phoneNumber: phone
            }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found."
            });
        }

        const orders = await prisma.order.findMany({
            where: {
                customerId: customer.id
            },

            include: {
                customer: true,

                items: {
                    include: {
                        product: true
                    }
                },

                payments: true
            },

            orderBy: {
                createdAt: "desc"
            }
        });

        return res.json({
            success: true,
            customer: {
                id: customer.id,
                fullName: customer.fullName,
                phoneNumber: customer.phoneNumber,
                email: customer.email
            },
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error("GET ORDER HISTORY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch customer order history.",
            error: error.message
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

        const orders = await prisma.order.findMany({
            where: {
                orderStatus: status
            },

            include: {
                customer: true,

                items: {
                    include: {
                        product: true
                    }
                },

                payments: true
            },

            orderBy: {
                createdAt: "desc"
            }
        });

        return res.json({
            success: true,
            status,
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error("GET ORDERS BY STATUS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch orders by status.",
            error: error.message
        });
    }
});

module.exports = router;