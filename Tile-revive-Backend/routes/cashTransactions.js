const express = require("express");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const router = express.Router();
const prisma = require("../db");

// ======================================================
// GET ALL CASH TRANSACTIONS
// GET /api/cash-transactions
// ======================================================

router.get("/", async (req, res) => {
    try {
        const transactions = await prisma.cashtransaction.findMany({
            orderBy: {
                createdAt: "desc"
            },

            include: {
                payment: true
            }
        });

        return res.json({
            success: true,
            count: transactions.length,
            transactions
        });

    } catch (error) {
        console.error("GET CASH TRANSACTIONS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch cash transactions.",
            error: error.message
        });
    }
});


// ======================================================
// GET CASH TRANSACTION SUMMARY
// GET /api/cash-transactions/summary
// ======================================================

router.get("/summary", async (req, res) => {
    try {

        const cashIn = await prisma.cashtransaction.aggregate({
            _sum: {
                amount: true
            },

            where: {
                type: "CASH_IN"
            }
        });


        const cashOut = await prisma.cashtransaction.aggregate({
            _sum: {
                amount: true
            },

            where: {
                type: "CASH_OUT"
            }
        });


        const totalCashIn =
            cashIn._sum.amount || 0;

        const totalCashOut =
            cashOut._sum.amount || 0;

        const cashBalance =
            totalCashIn - totalCashOut;


        return res.json({
            success: true,

            summary: {
                totalCashIn,
                totalCashOut,
                cashBalance
            }
        });

    } catch (error) {

        console.error(
            "CASH SUMMARY ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch cash summary.",
            error: error.message
        });
    }
});


// ======================================================
// CREATE CASH IN
// POST /api/cash-transactions/in
// ======================================================

router.post("/in", authenticateToken, requireAdmin, async (req, res) => {
    try {

        const {
            amount,
            category,
            reference,
            description,
            paymentId
        } = req.body;


        const cashAmount = Number(amount);


        if (
            !Number.isFinite(cashAmount) ||
            cashAmount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0."
            });
        }


        const allowedCategories = [
            "MPESA",
            "KCB",
            "COD",
            "OTHER"
        ];


        if (!allowedCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid category. Use MPESA, KCB, COD or OTHER."
            });
        }


        let validPaymentId = null;


        if (paymentId !== undefined && paymentId !== null) {

            const id = Number(paymentId);


            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment ID."
                });
            }


            const payment =
                await prisma.payment.findUnique({
                    where: {
                        id
                    }
                });


            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Payment not found."
                });
            }


            validPaymentId = id;
        }


        const transaction =
            await prisma.cashtransaction.create({
                data: {
                    type: "CASH_IN",

                    category,

                    amount: cashAmount,

                    reference:
                        reference || null,

                    description:
                        description || null,

                    paymentId:
                        validPaymentId
                }
            });


        return res.status(201).json({
            success: true,
            message: "Cash IN recorded successfully.",
            transaction
        });


    } catch (error) {

        console.error(
            "CASH IN ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to record cash IN.",
            error: error.message
        });
    }
});


// ======================================================
// CREATE CASH OUT
// POST /api/cash-transactions/out
// ======================================================

router.post("/out", authenticateToken, requireAdmin, async (req, res) => {
    try {

        const {
            amount,
            category,
            reference,
            description
        } = req.body;


        const cashAmount = Number(amount);


        if (
            !Number.isFinite(cashAmount) ||
            cashAmount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0."
            });
        }


        const allowedCategories = [
            "SUPPLIER",
            "DELIVERY",
            "TRANSPORT",
            "REFUND",
            "OTHER"
        ];


        if (!allowedCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid category. Use SUPPLIER, DELIVERY, TRANSPORT, REFUND or OTHER."
            });
        }


        const transaction =
            await prisma.cashtransaction.create({
                data: {
                    type: "CASH_OUT",

                    category,

                    amount: cashAmount,

                    reference:
                        reference || null,

                    description:
                        description || null
                }
            });


        return res.status(201).json({
            success: true,
            message: "Cash OUT recorded successfully.",
            transaction
        });


    } catch (error) {

        console.error(
            "CASH OUT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to record cash OUT.",
            error: error.message
        });
    }
});


// ======================================================
// GET SINGLE CASH TRANSACTION
// GET /api/cash-transactions/:id
// ======================================================

router.get("/:id", async (req, res) => {
    try {

        const id = Number(req.params.id);


        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid transaction ID."
            });
        }


        const transaction =
            await prisma.cashtransaction.findUnique({
                where: {
                    id
                },

                include: {
                    payment: true
                }
            });


        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Cash transaction not found."
            });
        }


        return res.json({
            success: true,
            transaction
        });


    } catch (error) {

        console.error(
            "GET CASH TRANSACTION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch cash transaction.",
            error: error.message
        });
    }
});


// ======================================================
// DELETE CASH TRANSACTION
// DELETE /api/cash-transactions/:id
// ======================================================

router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {

        const id = Number(req.params.id);


        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid transaction ID."
            });
        }


        const transaction =
            await prisma.cashtransaction.findUnique({
                where: {
                    id
                }
            });


        if (!transaction) {
            return res.status(404).json({
                success: false,
                message: "Cash transaction not found."
            });
        }


        await prisma.cashtransaction.delete({
            where: {
                id
            }
        });


        return res.json({
            success: true,
            message: "Cash transaction deleted successfully."
        });


    } catch (error) {

        console.error(
            "DELETE CASH TRANSACTION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to delete cash transaction.",
            error: error.message
        });
    }
});


module.exports = router;



