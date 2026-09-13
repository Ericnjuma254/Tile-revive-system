const express = require("express");

const {
    authenticateToken,
    requireAdmin,
} = require("../middleware/auth");

const {
    getFinancialData,
    getFinancialTrend,
} = require("../services/financialService");

const router = express.Router();

router.get(
    "/financial-summary",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const data =
                await getFinancialData({
                    startDate:
                        req.query.startDate,
                    endDate:
                        req.query.endDate,
                });

            res.json({
                success: true,
                data,
            });
        } catch (error) {
            console.error(
                "FINANCIAL SUMMARY ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to calculate financial summary",
            });
        }
    }
);

router.get(
    "/financial-trend",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const data =
                await getFinancialTrend({
                    startDate:
                        req.query.startDate,
                    endDate:
                        req.query.endDate,
                });

            res.json({
                success: true,
                data,
            });
        } catch (error) {
            console.error(
                "FINANCIAL TREND ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to calculate financial trend",
            });
        }
    }
);

router.get(
    "/product-profitability",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const data =
                await getFinancialData({
                    startDate:
                        req.query.startDate,
                    endDate:
                        req.query.endDate,
                });

            res.json({
                success: true,
                data:
                    data.productProfitability,
            });
        } catch (error) {
            console.error(
                "PRODUCT PROFITABILITY ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to calculate product profitability",
            });
        }
    }
);

router.get(
    "/expense-breakdown",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const data =
                await getFinancialData({
                    startDate:
                        req.query.startDate,
                    endDate:
                        req.query.endDate,
                });

            res.json({
                success: true,
                data:
                    data.expenseBreakdown,
            });
        } catch (error) {
            console.error(
                "EXPENSE BREAKDOWN ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to calculate expense breakdown",
            });
        }
    }
);

router.get(
    "/cash-flow",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const data =
                await getFinancialData({
                    startDate:
                        req.query.startDate,
                    endDate:
                        req.query.endDate,
                });

            res.json({
                success: true,
                data: {
                    cashIn: data.cashIn,
                    cashOut: data.cashOut,
                    cashFlow: data.cashFlow,
                },
            });
        } catch (error) {
            console.error(
                "CASH FLOW ERROR:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Failed to calculate cash flow",
            });
        }
    }
);

module.exports = router;
