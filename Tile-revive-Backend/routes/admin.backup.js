const express = require("express");
const prisma = require("../db");

const {
    authenticateToken,
    requireAdmin,
} = require("../middleware/auth");

const router = express.Router();

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
            const users = await prisma.user.findMany({
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
                message: "Failed to load pending users",
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
            const userId = Number(req.params.id);

            if (!Number.isInteger(userId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID",
                });
            }

            const user = await prisma.user.findUnique({
                where: {
                    id: userId,
                },
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
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
                    message: "User is already approved",
                });
            }

            const approvedUser =
                await prisma.user.update({
                    where: {
                        id: userId,
                    },

                    data: {
                        adminApproved: true,
                        approvedAt: new Date(),
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
                message: "User approved successfully",
                user: approvedUser,
            });
        } catch (error) {
            console.error(
                "APPROVE USER ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to approve user",
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
                count: orders.length,
                orders,
            });
        } catch (error) {
            console.error(
                "GET ADMIN ORDERS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to load orders.",
                error: error.message,
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
                    message: "Invalid order ID.",
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
                    message: "Order not found.",
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
                message: "Failed to load order.",
                error: error.message,
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

            const { orderStatus } =
                req.body;

            // ------------------------------------------------
            // VALIDATE ORDER ID
            // ------------------------------------------------

            if (!Number.isInteger(orderId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid order ID",
                });
            }

            // ------------------------------------------------
            // ALLOWED ORDER STATUSES
            // ------------------------------------------------

            const allowedStatuses = [
                "PENDING",
                "PROCESSING",
                "READY",
                "OUT_FOR_DELIVERY",
                "DELIVERED",
                "CANCELLED",
            ];

            // ------------------------------------------------
            // VALIDATE STATUS
            // ------------------------------------------------

            if (
                !orderStatus ||
                !allowedStatuses.includes(
                    String(orderStatus).toUpperCase()
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid order status.",
                    allowedStatuses,
                });
            }

            const newStatus =
                String(orderStatus).toUpperCase();

            // ------------------------------------------------
            // FIND ORDER
            // ------------------------------------------------

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
                    message: "Order not found",
                });
            }

            // ------------------------------------------------
            // PREVENT CHANGING DELIVERED ORDERS
            // ------------------------------------------------

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

            // ------------------------------------------------
            // PREVENT UNNECESSARY UPDATE
            // ------------------------------------------------

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

            // ------------------------------------------------
            // UPDATE ORDER + STATUS HISTORY
            // ------------------------------------------------

            const updatedOrder =
                await prisma.$transaction(
                    async (tx) => {

                        await tx.order.update({
                            where: {
                                id: orderId,
                            },

                            data: {
                                orderStatus:
                                    newStatus,
                            },
                        });

                        await tx.orderstatushistory.create({
                            data: {
                                orderId:
                                    orderId,

                                fromStatus:
                                    order.orderStatus,

                                toStatus:
                                    newStatus,
                            },
                        });

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
                order.orderStatus
            );

            console.log(
                "New Status:",
                newStatus
            );

            console.log(
                "======================================"
            );

            return res.json({
                success: true,

                message:
                    "Order status updated successfully.",

                order: updatedOrder,
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
// EXPORT ROUTER
// ======================================================

module.exports = router;
/* ======================================================
   UPDATE PAYMENT STATUS
   PATCH /api/admin/orders/:id/payment-status
   ADMIN ONLY
   ====================================================== */

router.patch(
    "/orders/:id/payment-status",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const orderId = Number(req.params.id);

            const paymentStatus =
                String(req.body.paymentStatus || "").toUpperCase();

            // ------------------------------------------------
            // VALIDATE ORDER ID
            // ------------------------------------------------

            if (!Number.isInteger(orderId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid order ID."
                });
            }

            // ------------------------------------------------
            // ALLOWED PAYMENT STATUSES
            // ------------------------------------------------

            const allowedStatuses = [
                "PENDING",
                "SUCCESS",
                "FAILED",
                "CANCELLED"
            ];

            if (!allowedStatuses.includes(paymentStatus)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment status.",
                    allowedStatuses
                });
            }

            // ------------------------------------------------
            // FIND ORDER
            // ------------------------------------------------

            const order = await prisma.order.findUnique({
                where: {
                    id: orderId
                },

                include: {
                    customer: true,
                    orderitem: {
                        include: {
                            product: true
                        }
                    },
                    payment: true,
                    statusHistory: {
                        orderBy: {
                            createdAt: "asc"
                        }
                    }
                }
            });

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found."
                });
            }

            // ------------------------------------------------
            // PREVENT UNNECESSARY UPDATE
            // ------------------------------------------------

            if (order.paymentStatus === paymentStatus) {
                return res.status(400).json({
                    success: false,
                    message:
                        `Payment is already ${paymentStatus}.`
                });
            }

            // ------------------------------------------------
            // UPDATE ORDER + PAYMENT RECORDS
            // ------------------------------------------------

            const updatedOrder =
                await prisma.$transaction(
                    async (tx) => {

                        // Update order payment status
                        await tx.order.update({
                            where: {
                                id: orderId
                            },

                            data: {
                                paymentStatus
                            }
                        });

                        // Update associated payment records
                        await tx.payment.updateMany({
                            where: {
                                orderId: orderId
                            },

                            data: {
                                status: paymentStatus
                            }
                        });

                        // Return fresh order
                        return await tx.order.findUnique({
                            where: {
                                id: orderId
                            },

                            include: {
                                customer: true,

                                orderitem: {
                                    include: {
                                        product: true
                                    }
                                },

                                payment: true,

                                statusHistory: {
                                    orderBy: {
                                        createdAt: "asc"
                                    }
                                }
                            }
                        });
                    }
                );

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
                "Previous Payment Status:",
                order.paymentStatus
            );

            console.log(
                "New Payment Status:",
                paymentStatus
            );

            console.log(
                "======================================"
            );

            return res.json({
                success: true,

                message:
                    "Payment status updated successfully.",

                order: updatedOrder
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

                error: error.message
            });
        }
    }
);

