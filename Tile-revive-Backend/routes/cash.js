const express = require("express");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const router = express.Router();
const prisma = require("../db");

// ======================================================
// ALLOWED VALUES
// ======================================================

const CASH_IN_CATEGORIES = [
    "MPESA",
    "KCB",
    "COD"
];

const CASH_OUT_CATEGORIES = [
    "SUPPLIER",
    "DELIVERY",
    "TRANSPORT",
    "REFUND",
    "OTHER"
];

// ======================================================
// CREATE CASH IN
// POST /api/cash/in
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

        if (!Number.isFinite(cashAmount) || cashAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0."
            });
        }

        if (!CASH_IN_CATEGORIES.includes(category)) {
            return res.status(400).json({
                success: false,
                message: "Invalid cash-in category. Use MPESA, KCB or COD."
            });
        }

        let payment = null;

        if (paymentId !== undefined && paymentId !== null) {
            const id = Number(paymentId);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid payment ID."
                });
            }

            payment = await prisma.payment.findUnique({
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

            if (payment.status !== "SUCCESS" &&
                payment.status !== "RECONCILED") {
                return res.status(400).json({
                    success: false,
                    message: "Only successful or reconciled payments can be linked to cash-in."
                });
            }

            if (Number(payment.amountPaid) !== cashAmount) {
                return res.status(400).json({
                    success: false,
                    message: "Cash amount must match the payment amount."
                });
            }
        }

        const transaction = await prisma.cashTransaction.create({
            data: {
                type: "CASH_IN",
                category,
                amount: cashAmount,
                reference: reference || null,
                description: description || null,
                paymentId: payment ? payment.id : null
            }
        });

        return res.status(201).json({
            success: true,
            message: "Cash-in recorded successfully.",
            transaction
        });

    } catch (error) {
        console.error("CASH IN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to record cash-in.",
            error: error.message
        });
    }
});

// ======================================================
// CREATE CASH OUT
// POST /api/cash/out
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

        if (!Number.isFinite(cashAmount) || cashAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Amount must be greater than 0."
            });
        }

        if (!CASH_OUT_CATEGORIES.includes(category)) {
            return res.status(400).json({
                success: false,
                message:
                    "Invalid cash-out category. Use SUPPLIER, DELIVERY, TRANSPORT, REFUND or OTHER."
            });
        }

        const transaction = await prisma.cashTransaction.create({
            data: {
                type: "CASH_OUT",
                category,
                amount: cashAmount,
                reference: reference || null,
                description: description || null
            }
        });

        return res.status(201).json({
            success: true,
            message: "Cash-out recorded successfully.",
            transaction
        });

    } catch (error) {
        console.error("CASH OUT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to record cash-out.",
            error: error.message
        });
    }
});

// ======================================================
// GET ALL CASH TRANSACTIONS
// GET /api/cash
// ======================================================

router.get("/", async (req, res) => {
    try {
        const transactions =
            await prisma.cashTransaction.findMany({
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
        console.error("GET CASH ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch cash transactions.",
            error: error.message
        });
    }
});

// ======================================================
// GET CASH IN
// GET /api/cash/in
// ======================================================

router.get("/in", async (req, res) => {
    try {
        const transactions =
            await prisma.cashTransaction.findMany({
                where: {
                    type: "CASH_IN"
                },
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
        console.error("GET CASH IN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch cash-in transactions.",
            error: error.message
        });
    }
});

// ======================================================
// GET CASH OUT
// GET /api/cash/out
// ======================================================

router.get("/out", async (req, res) => {
    try {
        const transactions =
            await prisma.cashTransaction.findMany({
                where: {
                    type: "CASH_OUT"
                },
                orderBy: {
                    createdAt: "desc"
                }
            });

        return res.json({
            success: true,
            count: transactions.length,
            transactions
        });

    } catch (error) {
        console.error("GET CASH OUT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch cash-out transactions.",
            error: error.message
        });
    }
});

// ======================================================
// GET CASH SUMMARY
// GET /api/cash/summary
// ======================================================

router.get("/summary", async (req, res) => {
    try {
        const cashIn =
            await prisma.cashTransaction.aggregate({
                _sum: {
                    amount: true
                },
                where: {
                    type: "CASH_IN"
                }
            });

        const cashOut =
            await prisma.cashTransaction.aggregate({
                _sum: {
                    amount: true
                },
                where: {
                    type: "CASH_OUT"
                }
            });

        const cashInByCategory = {};

        for (const category of CASH_IN_CATEGORIES) {
            const result =
                await prisma.cashTransaction.aggregate({
                    _sum: {
                        amount: true
                    },
                    where: {
                        type: "CASH_IN",
                        category
                    }
                });

            cashInByCategory[category] =
                result._sum.amount || 0;
        }

        const cashOutByCategory = {};

        for (const category of CASH_OUT_CATEGORIES) {
            const result =
                await prisma.cashTransaction.aggregate({
                    _sum: {
                        amount: true
                    },
                    where: {
                        type: "CASH_OUT",
                        category
                    }
                });

            cashOutByCategory[category] =
                result._sum.amount || 0;
        }

        const totalCashIn =
            cashIn._sum.amount || 0;

        const totalCashOut =
            cashOut._sum.amount || 0;

        const netCash =
            totalCashIn - totalCashOut;

        return res.json({
            success: true,

            summary: {
                totalCashIn,
                totalCashOut,
                netCash,

                cashIn: cashInByCategory,
                cashOut: cashOutByCategory
            }
        });

    } catch (error) {
        console.error("CASH SUMMARY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to generate cash summary.",
            error: error.message
        });
    }
});

// ======================================================
// GET SINGLE CASH TRANSACTION
// GET /api/cash/:id
// ======================================================

router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid cash transaction ID."
            });
        }

        const transaction =
            await prisma.cashTransaction.findUnique({
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
        console.error("GET CASH TRANSACTION ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch cash transaction.",
            error: error.message
        });
    }
});

// ======================================================
// DELETE CASH TRANSACTION
// DELETE /api/cash/:id
// ======================================================

router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid cash transaction ID."
            });
        }

        const transaction =
            await prisma.cashTransaction.findUnique({
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

        await prisma.cashTransaction.delete({
            where: {
                id
            }
        });

        return res.json({
            success: true,
            message: "Cash transaction deleted successfully."
        });

    } catch (error) {
        console.error("DELETE CASH ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete cash transaction.",
            error: error.message
        });
    }
});

module.exports = router;

