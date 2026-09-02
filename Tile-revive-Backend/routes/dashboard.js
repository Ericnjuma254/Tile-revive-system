const express = require("express");
const router = express.Router();
const prisma = require("../db");

const {
    authenticateToken,
    requireAdmin
} = require("../middleware/auth");

// ======================================================
// ADMIN DASHBOARD
// GET /api/dashboard/dashboard
// ======================================================

router.get(
    "/dashboard",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            // ==================================================
            // PAYMENT STATISTICS
            // ==================================================

            const totalReceived =
                await prisma.payment.aggregate({
                    _sum: {
                        amountPaid: true
                    },
                    where: {
                        status: "SUCCESS"
                    }
                });

            const totalTransactions =
                await prisma.payment.count({
                    where: {
                        status: "SUCCESS"
                    }
                });


            // ==================================================
            // TODAY'S PAYMENTS
            // ==================================================

            const today = new Date();

            today.setHours(0, 0, 0, 0);

            const todayReceived =
                await prisma.payment.aggregate({
                    _sum: {
                        amountPaid: true
                    },
                    where: {
                        status: "SUCCESS",
                        createdAt: {
                            gte: today
                        }
                    }
                });


            // ==================================================
            // ORDER STATISTICS
            // ==================================================

            const totalOrders =
                await prisma.order.count();

            const pendingOrders =
                await prisma.order.count({
                    where: {
                        orderStatus: "PENDING"
                    }
                });

            const processingOrders =
                await prisma.order.count({
                    where: {
                        orderStatus: "PROCESSING"
                    }
                });

            const readyOrders =
                await prisma.order.count({
                    where: {
                        orderStatus: "READY"
                    }
                });

            const outForDeliveryOrders =
                await prisma.order.count({
                    where: {
                        orderStatus: "OUT_FOR_DELIVERY"
                    }
                });

            const deliveredOrders =
                await prisma.order.count({
                    where: {
                        orderStatus: "DELIVERED"
                    }
                });

            const cancelledOrders =
                await prisma.order.count({
                    where: {
                        orderStatus: "CANCELLED"
                    }
                });


            // ==================================================
            // INVENTORY
            // ==================================================

            const products =
                await prisma.product.findMany({
                    where: {
                        status: "ACTIVE"
                    },
                    orderBy: {
                        stock: "asc"
                    }
                });

            const totalProducts =
                products.length;


            // ==================================================
            // LOW STOCK
            // ==================================================

            const lowStock =
                products
                    .filter(product =>
                        product.stock > 0 &&
                        product.stock <= product.minimumStock
                    )
                    .map(product => ({
                        id: product.id,
                        name: product.name,
                        sku: product.sku,
                        stock: product.stock,
                        minimumStock: product.minimumStock,
                        status: "LOW STOCK"
                    }));


            // ==================================================
            // OUT OF STOCK
            // ==================================================

            const outOfStock =
                products
                    .filter(product =>
                        product.stock <= 0
                    )
                    .map(product => ({
                        id: product.id,
                        name: product.name,
                        sku: product.sku,
                        stock: product.stock,
                        minimumStock: product.minimumStock,
                        status: "OUT OF STOCK"
                    }));


            // ==================================================
            // RESPONSE
            // ==================================================

            return res.json({

                success: true,

                totalReceived:
                    totalReceived._sum.amountPaid || 0,

                todayReceived:
                    todayReceived._sum.amountPaid || 0,

                totalTransactions,

                totalOrders,

                pendingOrders,

                processingOrders,

                readyOrders,

                outForDeliveryOrders,

                deliveredOrders,

                cancelledOrders,

                totalProducts,

                lowStockCount:
                    lowStock.length,

                outOfStockCount:
                    outOfStock.length,

                lowStock,

                outOfStock

            });

        } catch (error) {

            console.error(
                "ADMIN DASHBOARD ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to load dashboard.",

                error:
                    error.message

            });
        }
    }
);

module.exports = router;
