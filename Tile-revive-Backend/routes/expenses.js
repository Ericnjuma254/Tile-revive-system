const express = require("express");
const prisma = require("../db");

const {
    authenticateToken,
    requireAdmin
} = require("../middleware/auth");

const router = express.Router();


// ======================================================
// HELPERS
// ======================================================

const VALID_CATEGORIES = [
    "RESTOCKING",
    "DELIVERY",
    "PACKAGING",
    "PRODUCTION",
    "MARKETING",
    "LABOUR",
    "UTILITIES",
    "OTHER"
];

const VALID_PAYMENT_METHODS = [
    "CASH",
    "MPESA",
    "BANK",
    "CARD",
    "OTHER"
];

const VALID_STATUSES = [
    "PAID",
    "PENDING",
    "CANCELLED"
];


function cleanString(value) {
    if (value === undefined || value === null) {
        return null;
    }

    const cleaned = String(value).trim();

    return cleaned || null;
}


function parseAmount(value) {
    const amount = Number(value);

    if (!Number.isFinite(amount) || amount <= 0) {
        return null;
    }

    return amount;
}


function parseDate(value) {
    if (!value) {
        return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}


function buildDateFilter(startDate, endDate) {

    const filter = {};

    if (startDate) {
        const start = parseDate(startDate);

        if (start) {
            start.setHours(0, 0, 0, 0);
            filter.gte = start;
        }
    }

    if (endDate) {
        const end = parseDate(endDate);

        if (end) {
            end.setHours(23, 59, 59, 999);
            filter.lte = end;
        }
    }

    return Object.keys(filter).length
        ? filter
        : undefined;
}


// ======================================================
// GET EXPENSE SUMMARY
// GET /api/expenses/summary
// ======================================================

router.get(
    "/summary",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const now = new Date();

            const startOfToday = new Date(now);
            startOfToday.setHours(0, 0, 0, 0);

            const startOfMonth = new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            );

            const startOfYear = new Date(
                now.getFullYear(),
                0,
                1
            );

            const [
                totalResult,
                todayResult,
                monthResult,
                yearResult,
                categoryRows
            ] = await Promise.all([

                prisma.expense.aggregate({
                    _sum: {
                        amount: true
                    },
                    where: {
                        status: "PAID"
                    }
                }),

                prisma.expense.aggregate({
                    _sum: {
                        amount: true
                    },
                    where: {
                        status: "PAID",
                        expenseDate: {
                            gte: startOfToday
                        }
                    }
                }),

                prisma.expense.aggregate({
                    _sum: {
                        amount: true
                    },
                    where: {
                        status: "PAID",
                        expenseDate: {
                            gte: startOfMonth
                        }
                    }
                }),

                prisma.expense.aggregate({
                    _sum: {
                        amount: true
                    },
                    where: {
                        status: "PAID",
                        expenseDate: {
                            gte: startOfYear
                        }
                    }
                }),

                prisma.expense.groupBy({
                    by: ["category"],
                    where: {
                        status: "PAID"
                    },
                    _sum: {
                        amount: true
                    },
                    _count: {
                        id: true
                    },
                    orderBy: {
                        _sum: {
                            amount: "desc"
                        }
                    }
                })

            ]);

            const total =
                Number(totalResult._sum.amount || 0);

            const today =
                Number(todayResult._sum.amount || 0);

            const thisMonth =
                Number(monthResult._sum.amount || 0);

            const thisYear =
                Number(yearResult._sum.amount || 0);

            const stockCost = categoryRows
                .filter(row =>
                    ["RESTOCKING", "PRODUCTION"].includes(
                        row.category
                    )
                )
                .reduce(
                    (sum, row) =>
                        sum + Number(row._sum.amount || 0),
                    0
                );

            const marketingCost = categoryRows
                .filter(row =>
                    row.category === "MARKETING"
                )
                .reduce(
                    (sum, row) =>
                        sum + Number(row._sum.amount || 0),
                    0
                );

            const operatingCost = categoryRows
                .filter(row =>
                    [
                        "DELIVERY",
                        "PACKAGING",
                        "LABOUR",
                        "UTILITIES",
                        "OTHER"
                    ].includes(row.category)
                )
                .reduce(
                    (sum, row) =>
                        sum + Number(row._sum.amount || 0),
                    0
                );

            return res.json({

                success: true,

                summary: {
                    total,
                    today,
                    thisMonth,
                    thisYear,
                    stockCost,
                    marketingCost,
                    operatingCost
                },

                categories: categoryRows.map(row => ({
                    category: row.category,
                    total: Number(row._sum.amount || 0),
                    count: row._count.id
                }))

            });

        } catch (error) {

            console.error(
                "EXPENSE SUMMARY ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to load expense summary"
            });
        }
    }
);


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

            const {
                search,
                category,
                paymentMethod,
                status,
                startDate,
                endDate,
                page = 1,
                limit = 50
            } = req.query;

            const pageNumber =
                Math.max(Number(page) || 1, 1);

            const limitNumber =
                Math.min(
                    Math.max(Number(limit) || 50, 1),
                    100
                );

            const where = {};

            if (category) {
                where.category = String(category).toUpperCase();
            }

            if (paymentMethod) {
                where.paymentMethod =
                    String(paymentMethod).toUpperCase();
            }

            if (status) {
                where.status =
                    String(status).toUpperCase();
            }

            const dateFilter =
                buildDateFilter(startDate, endDate);

            if (dateFilter) {
                where.expenseDate = dateFilter;
            }

            if (search) {

                const query =
                    String(search).trim();

                if (query) {

                    where.OR = [
                        {
                            title: {
                                contains: query
                            }
                        },
                        {
                            description: {
                                contains: query
                            }
                        },
                        {
                            payee: {
                                contains: query
                            }
                        },
                        {
                            reference: {
                                contains: query
                            }
                        }
                    ];
                }
            }

            const skip =
                (pageNumber - 1) * limitNumber;

            const [
                expenses,
                totalCount,
                amountResult
            ] = await Promise.all([

                prisma.expense.findMany({
                    where,
                    orderBy: {
                        expenseDate: "desc"
                    },
                    skip,
                    take: limitNumber
                }),

                prisma.expense.count({
                    where
                }),

                prisma.expense.aggregate({
                    where,
                    _sum: {
                        amount: true
                    }
                })

            ]);

            return res.json({

                success: true,

                summary: {
                    total: Number(
                        amountResult._sum.amount || 0
                    ),
                    count: totalCount
                },

                pagination: {
                    page: pageNumber,
                    limit: limitNumber,
                    total: totalCount,
                    pages: Math.ceil(
                        totalCount / limitNumber
                    )
                },

                expenses

            });

        } catch (error) {

            console.error(
                "EXPENSE GET ERROR:",
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
// GET SINGLE EXPENSE
// GET /api/expenses/:id
// ======================================================

router.get(
    "/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const id = Number(req.params.id);

            if (!Number.isInteger(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid expense ID"
                });
            }

            const expense =
                await prisma.expense.findUnique({
                    where: {
                        id
                    }
                });

            if (!expense) {
                return res.status(404).json({
                    success: false,
                    message: "Expense not found"
                });
            }

            return res.json({
                success: true,
                expense
            });

        } catch (error) {

            console.error(
                "GET EXPENSE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to load expense"
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
                expenseDate,
                paymentMethod,
                payee,
                reference,
                status,
                notes
            } = req.body;

            const cleanTitle =
                cleanString(title);

            const cleanCategory =
                String(category || "OTHER")
                    .trim()
                    .toUpperCase();

            const cleanPaymentMethod =
                String(paymentMethod || "CASH")
                    .trim()
                    .toUpperCase();

            const cleanStatus =
                String(status || "PAID")
                    .trim()
                    .toUpperCase();

            const parsedAmount =
                parseAmount(amount);

            if (!cleanTitle) {

                return res.status(400).json({
                    success: false,
                    message: "Expense title is required"
                });
            }

            if (!parsedAmount) {

                return res.status(400).json({
                    success: false,
                    message: "A valid expense amount is required"
                });
            }

            if (!VALID_CATEGORIES.includes(cleanCategory)) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid expense category"
                });
            }

            if (
                !VALID_PAYMENT_METHODS.includes(
                    cleanPaymentMethod
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid payment method"
                });
            }

            if (!VALID_STATUSES.includes(cleanStatus)) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid expense status"
                });
            }

            const parsedDate =
                expenseDate
                    ? parseDate(expenseDate)
                    : new Date();

            if (!parsedDate) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid expense date"
                });
            }

            const expense =
                await prisma.expense.create({

                    data: {
                        title: cleanTitle,
                        category: cleanCategory,
                        amount: parsedAmount,
                        description:
                            cleanString(description),
                        expenseDate: parsedDate,
                        paymentMethod:
                            cleanPaymentMethod,
                        payee:
                            cleanString(payee),
                        reference:
                            cleanString(reference),
                        status: cleanStatus,
                        notes:
                            cleanString(notes)
                    }

                });

            return res.status(201).json({

                success: true,

                message: "Expense recorded successfully",

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


// ======================================================
// UPDATE EXPENSE
// PUT /api/expenses/:id
// ======================================================

router.put(
    "/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const id = Number(req.params.id);

            if (!Number.isInteger(id)) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid expense ID"
                });
            }

            const existing =
                await prisma.expense.findUnique({
                    where: {
                        id
                    }
                });

            if (!existing) {

                return res.status(404).json({
                    success: false,
                    message: "Expense not found"
                });
            }

            const {
                title,
                category,
                amount,
                description,
                expenseDate,
                paymentMethod,
                payee,
                reference,
                status,
                notes
            } = req.body;

            const data = {};

            if (title !== undefined) {
                const value = cleanString(title);

                if (!value) {
                    return res.status(400).json({
                        success: false,
                        message: "Expense title cannot be empty"
                    });
                }

                data.title = value;
            }

            if (category !== undefined) {

                const value =
                    String(category)
                        .trim()
                        .toUpperCase();

                if (!VALID_CATEGORIES.includes(value)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid expense category"
                    });
                }

                data.category = value;
            }

            if (amount !== undefined) {

                const value =
                    parseAmount(amount);

                if (!value) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid expense amount"
                    });
                }

                data.amount = value;
            }

            if (description !== undefined) {
                data.description =
                    cleanString(description);
            }

            if (expenseDate !== undefined) {

                const value =
                    parseDate(expenseDate);

                if (!value) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid expense date"
                    });
                }

                data.expenseDate = value;
            }

            if (paymentMethod !== undefined) {

                const value =
                    String(paymentMethod)
                        .trim()
                        .toUpperCase();

                if (
                    !VALID_PAYMENT_METHODS.includes(value)
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid payment method"
                    });
                }

                data.paymentMethod = value;
            }

            if (payee !== undefined) {
                data.payee =
                    cleanString(payee);
            }

            if (reference !== undefined) {
                data.reference =
                    cleanString(reference);
            }

            if (status !== undefined) {

                const value =
                    String(status)
                        .trim()
                        .toUpperCase();

                if (!VALID_STATUSES.includes(value)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid expense status"
                    });
                }

                data.status = value;
            }

            if (notes !== undefined) {
                data.notes =
                    cleanString(notes);
            }

            const expense =
                await prisma.expense.update({

                    where: {
                        id
                    },

                    data

                });

            return res.json({

                success: true,

                message: "Expense updated successfully",

                expense

            });

        } catch (error) {

            console.error(
                "UPDATE EXPENSE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to update expense"
            });
        }
    }
);


// ======================================================
// DELETE EXPENSE
// DELETE /api/expenses/:id
// ======================================================

router.delete(
    "/:id",
    authenticateToken,
    requireAdmin,
    async (req, res) => {

        try {

            const id = Number(req.params.id);

            if (!Number.isInteger(id)) {

                return res.status(400).json({
                    success: false,
                    message: "Invalid expense ID"
                });
            }

            const existing =
                await prisma.expense.findUnique({
                    where: {
                        id
                    }
                });

            if (!existing) {

                return res.status(404).json({
                    success: false,
                    message: "Expense not found"
                });
            }

            await prisma.expense.delete({
                where: {
                    id
                }
            });

            return res.json({

                success: true,

                message: "Expense deleted successfully"

            });

        } catch (error) {

            console.error(
                "DELETE EXPENSE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to delete expense"
            });
        }
    }
);


module.exports = router;
