const express = require("express");
const prisma = require("../db");

const {
    authenticateToken,
    requireAdmin
} = require("../middleware/auth");

const router = express.Router();


// ======================================================
// GET EXPENSES
// GET /api/expenses
// ======================================================

router.get(
    "/",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const expenses =
                await prisma.expense.findMany({
                    orderBy: {
                        expenseDate: "desc"
                    }
                });

            const total =
                expenses.reduce(
                    (sum, expense) =>
                        sum + Number(expense.amount),
                    0
                );

            const today =
                new Date();

            today.setHours(0, 0, 0, 0);

            const todayTotal =
                expenses
                    .filter(
                        expense =>
                            new Date(
                                expense.expenseDate
                            ) >= today
                    )
                    .reduce(
                        (sum, expense) =>
                            sum + Number(expense.amount),
                        0
                    );

            return res.json({

                success: true,

                summary: {
                    total,
                    today: todayTotal
                },

                expenses

            });

        } catch (error) {

            console.error(
                "EXPENSE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to load expenses"
            });
        }
    }
);


// ======================================================
// CREATE EXPENSE
// POST /api/expenses
// ======================================================

router.post(
    "/",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const {
                title,
                category,
                amount,
                description,
                expenseDate
            } = req.body;

            if (
                !title ||
                !amount ||
                Number(amount) <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Title and valid amount are required"
                });
            }

            const expense =
                await prisma.expense.create({

                    data: {
                        title,
                        category:
                            category || null,
                        amount:
                            Number(amount),
                        description:
                            description || null,
                        expenseDate:
                            expenseDate
                                ? new Date(expenseDate)
                                : new Date()
                    }

                });

            return res.status(201).json({
                success: true,
                expense
            });

        } catch (error) {

            console.error(
                "CREATE EXPENSE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to create expense"
            });
        }
    }
);


module.exports = router;