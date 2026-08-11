const express = require("express");
const router = express.Router();
const prisma = require("../db");

// ======================================================
// DASHBOARD
// GET /api/dashboard/dashboard
// ======================================================

router.get("/dashboard", async (req, res) => {
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
        // INVENTORY STATISTICS
        // ==================================================

        const totalProducts =
            await prisma.product.count({
                where: {
                    status: "ACTIVE"
                }
            });

        // ==================================================
        // LOW STOCK PRODUCTS
        // ==================================================

        const lowStockProducts =
            await prisma.product.findMany({
                where: {
                    status: "ACTIVE"
                },
                orderBy: {
                    stock: "asc"
                }
            });

        const lowStock =
            lowStockProducts
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
        // OUT OF STOCK PRODUCTS
        // ==================================================

        const outOfStock =
            lowStockProducts
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
        // INVENTORY ALERT COUNT
        // ==================================================

        const lowStockCount =
            lowStock.length;

        const outOfStockCount =
            outOfStock.length;

        // ==================================================
        // DASHBOARD RESPONSE
        // ==================================================

        res.json({

            success: true,

            // PAYMENT DATA
            totalReceived:
                totalReceived._sum.amountPaid || 0,

            todayReceived:
                todayReceived._sum.amountPaid || 0,

            totalTransactions,

            // INVENTORY DATA
            totalProducts,

            lowStockCount,

            outOfStockCount,

            lowStock,

            outOfStock

        });

    } catch (err) {

        console.error(
            "DASHBOARD ERROR:",
            err
        );

        res.status(500).json({

            success: false,

            message:
                "Dashboard Error",

            error:
                err.message

        });

    }
});

module.exports = router;