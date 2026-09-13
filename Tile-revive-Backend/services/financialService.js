const prisma = require("../db");

/**
 * CENTRAL FINANCIAL ENGINE
 *
 * Revenue:
 *   Actual successful payments linked to orders.
 *
 * COGS:
 *   quantity sold × product.costPrice
 *
 * Gross Profit:
 *   Revenue - COGS
 *
 * Operating Expenses:
 *   DELIVERY + PACKAGING + LABOUR + UTILITIES + OTHER
 *
 * Marketing:
 *   MARKETING
 *
 * Net Profit:
 *   Gross Profit - Operating Expenses - Marketing
 *
 * Cash Flow:
 *   Cash In - Cash Out
 */

const OPERATING_CATEGORIES = [
    "DELIVERY",
    "PACKAGING",
    "LABOUR",
    "UTILITIES",
    "OTHER",
];

const MARKETING_CATEGORY = "MARKETING";

const STOCK_CATEGORIES = [
    "RESTOCKING",
    "PRODUCTION",
];

function startOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
}

function getDateRange(startDate, endDate) {
    const now = new Date();

    const start = startDate
        ? startOfDay(new Date(startDate))
        : new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const end = endDate
        ? endOfDay(new Date(endDate))
        : endOfDay(now);

    return {
        start,
        end,
    };
}

function money(value) {
    return Number(Number(value || 0).toFixed(2));
}

function percentage(value) {
    return Number(Number(value || 0).toFixed(2));
}

async function getFinancialData({
    startDate,
    endDate,
} = {}) {
    const { start, end } = getDateRange(
        startDate,
        endDate
    );

    // =====================================================
    // SUCCESSFUL PAYMENTS
    // =====================================================

    const payments = await prisma.payment.findMany({
        where: {
            status: "SUCCESS",
            createdAt: {
                gte: start,
                lte: end,
            },
            orderId: {
                not: null,
            },
        },
        select: {
            id: true,
            amountPaid: true,
            paymentMethod: true,
            orderId: true,
            createdAt: true,
            order: {
                select: {
                    id: true,
                    orderNumber: true,
                    totalAmount: true,
                    createdAt: true,
                    orderitem: {
                        select: {
                            id: true,
                            productId: true,
                            quantity: true,
                            unitPrice: true,
                            totalPrice: true,
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                    costPrice: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    // =====================================================
    // REVENUE + COGS
    // =====================================================

    let revenue = 0;
    let cogs = 0;
    let orders = 0;
    let unitsSold = 0;
    const missingCostItems = [];

    const productMap = new Map();
    const orderIds = new Set();

    for (const payment of payments) {
        if (!payment.order) continue;

        const paymentAmount = Number(
            payment.amountPaid || 0
        );

        revenue += paymentAmount;

        if (!orderIds.has(payment.order.id)) {
            orderIds.add(payment.order.id);
            orders += 1;
        }

        for (const item of payment.order.orderitem || []) {
            const quantity = Number(
                item.quantity || 0
            );

            unitsSold += quantity;

            const costPrice =
                item.product?.costPrice;

            if (costPrice == null) {
                missingCostItems.push({
                    productId: item.product?.id ?? item.productId ?? null,
                    name: item.product?.name ?? "Unknown product",
                    quantity,
                    costPrice: null,
                });
                continue;
            }

            const itemCost =
                quantity * Number(costPrice);

            cogs += itemCost;

            const productId =
                item.productId;

            if (!productMap.has(productId)) {
                productMap.set(productId, {
                    id: productId,
                    name:
                        item.product?.name ||
                        "Unknown Product",
                    sku:
                        item.product?.sku ||
                        "",
                    unitsSold: 0,
                    revenue: 0,
                    cogs: 0,
                    grossProfit: 0,
                });
            }

            const product =
                productMap.get(productId);

            product.unitsSold += quantity;

            product.revenue +=
                quantity *
                Number(item.unitPrice || 0);

            product.cogs += itemCost;

            product.grossProfit =
                product.revenue -
                product.cogs;
        }
    }

    // =====================================================
    // EXPENSES
    // =====================================================

    const expenses =
        await prisma.expense.findMany({
            where: {
                status: "PAID",
                expenseDate: {
                    gte: start,
                    lte: end,
                },
            },
            select: {
                id: true,
                title: true,
                category: true,
                amount: true,
                paymentMethod: true,
                expenseDate: true,
            },
            orderBy: {
                expenseDate: "asc",
            },
        });

    let operatingExpenses = 0;
    let marketing = 0;
    let stockPurchases = 0;
    let totalExpenses = 0;

    const expenseBreakdownMap =
        new Map();

    const paymentMethodMap =
        new Map();

    for (const expense of expenses) {
        const amount =
            Number(expense.amount || 0);

        totalExpenses += amount;

        const category =
            String(
                expense.category || "OTHER"
            ).toUpperCase();

        if (
            OPERATING_CATEGORIES.includes(
                category
            )
        ) {
            operatingExpenses += amount;
        }

        if (
            category === MARKETING_CATEGORY
        ) {
            marketing += amount;
        }

        if (
            STOCK_CATEGORIES.includes(category)
        ) {
            stockPurchases += amount;
        }

        if (
            !expenseBreakdownMap.has(category)
        ) {
            expenseBreakdownMap.set(
                category,
                0
            );
        }

        expenseBreakdownMap.set(
            category,
            expenseBreakdownMap.get(category) +
                amount
        );

        const method =
            String(
                expense.paymentMethod ||
                    "OTHER"
            ).toUpperCase();

        if (!paymentMethodMap.has(method)) {
            paymentMethodMap.set(method, 0);
        }

        paymentMethodMap.set(
            method,
            paymentMethodMap.get(method) +
                amount
        );
    }

    // =====================================================
    // PROFIT
    // =====================================================

    const grossProfit =
        revenue - cogs;

    const netProfit =
        grossProfit -
        operatingExpenses -
        marketing;

    const profitMargin =
        revenue > 0
            ? (netProfit / revenue) * 100
            : 0;

    const grossMargin =
        revenue > 0
            ? (grossProfit / revenue) * 100
            : 0;

    // =====================================================
    // CASH FLOW
    // =====================================================

    const cashIn = revenue;
    const cashOut = totalExpenses;

    const cashFlow =
        cashIn - cashOut;

    // =====================================================
    // BREAKDOWNS
    // =====================================================

    const expenseBreakdown =
        Array.from(
            expenseBreakdownMap.entries()
        )
            .map(
                ([category, amount]) => ({
                    category,
                    amount: money(amount),
                })
            )
            .sort(
                (a, b) =>
                    b.amount - a.amount
            );

    const paymentMethods =
        Array.from(
            paymentMethodMap.entries()
        )
            .map(
                ([method, amount]) => ({
                    method,
                    amount: money(amount),
                })
            )
            .sort(
                (a, b) =>
                    b.amount - a.amount
            );

    const productProfitability =
        Array.from(
            productMap.values()
        )
            .map(product => ({
                ...product,
                revenue: money(
                    product.revenue
                ),
                cogs: money(
                    product.cogs
                ),
                grossProfit: money(
                    product.grossProfit
                ),
                margin:
                    product.revenue > 0
                        ? percentage(
                              (product.grossProfit /
                                  product.revenue) *
                                  100
                          )
                        : 0,
            }))
            .sort(
                (a, b) =>
                    b.grossProfit -
                    a.grossProfit
            );

    return {
        period: {
            start: start.toISOString(),
            end: end.toISOString(),
        },

        revenue: money(revenue),

        cogs: money(cogs),

        grossProfit: money(
            grossProfit
        ),

        operatingExpenses: money(
            operatingExpenses
        ),

        marketing: money(marketing),

        totalExpenses: money(
            totalExpenses
        ),

        netProfit: money(
            netProfit
        ),

        grossMargin: percentage(
            grossMargin
        ),

        profitMargin: percentage(
            profitMargin
        ),

        cashIn: money(cashIn),

        cashOut: money(cashOut),

        cashFlow: money(cashFlow),

        orders,

        unitsSold,

        stockPurchases: money(
            stockPurchases
        ),

        missingCostItems: missingCostItems.length,
        missingCostProducts: missingCostItems,
expenseBreakdown,

        paymentMethods,

        productProfitability,

        expenseCount: expenses.length,

        paymentCount: payments.length,
    };
}

async function getFinancialTrend({
    startDate,
    endDate,
} = {}) {
    const { start, end } =
        getDateRange(
            startDate,
            endDate
        );

    const payments =
        await prisma.payment.findMany({
            where: {
                status: "SUCCESS",
                createdAt: {
                    gte: start,
                    lte: end,
                },
                orderId: {
                    not: null,
                },
            },
            select: {
                amountPaid: true,
                createdAt: true,
                order: {
                    select: {
                        orderitem: {
                            select: {
                                quantity: true,
                                product: {
                                    select: {
                                        costPrice: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

    const expenses =
        await prisma.expense.findMany({
            where: {
                status: "PAID",
                expenseDate: {
                    gte: start,
                    lte: end,
                },
            },
            select: {
                amount: true,
                expenseDate: true,
            },
        });

    const buckets = new Map();

    function getKey(date) {
        const d = new Date(date);

        return [
            d.getFullYear(),
            String(
                d.getMonth() + 1
            ).padStart(2, "0"),
            String(
                d.getDate()
            ).padStart(2, "0"),
        ].join("-");
    }

    function getLabel(date) {
        return new Date(
            date
        ).toLocaleDateString(
            "en-KE",
            {
                day: "2-digit",
                month: "short",
            }
        );
    }

    function getBucket(date) {
        const key =
            getKey(date);

        if (!buckets.has(key)) {
            buckets.set(key, {
                name: getLabel(date),
                date: key,
                revenue: 0,
                cogs: 0,
                grossProfit: 0,
                expenses: 0,
                netProfit: 0,
            });
        }

        return buckets.get(key);
    }

    for (const payment of payments) {
        const bucket =
            getBucket(payment.createdAt);

        const revenue =
            Number(
                payment.amountPaid || 0
            );

        let orderCogs = 0;

        for (
            const item of
                payment.order?.orderitem ||
                []
        ) {
            if (
                item.product?.costPrice !==
                    null &&
                item.product?.costPrice !==
                    undefined
            ) {
                orderCogs +=
                    Number(
                        item.quantity || 0
                    ) *
                    Number(
                        item.product.costPrice
                    );
            }
        }

        bucket.revenue += revenue;
        bucket.cogs += orderCogs;
    }

    for (const expense of expenses) {
        const bucket =
            getBucket(
                expense.expenseDate
            );

        bucket.expenses +=
            Number(
                expense.amount || 0
            );
    }

    const result =
        Array.from(
            buckets.values()
        )
            .sort(
                (a, b) =>
                    a.date.localeCompare(
                        b.date
                    )
            )
            .map(bucket => {
                bucket.grossProfit =
                    bucket.revenue -
                    bucket.cogs;

                bucket.netProfit =
                    bucket.grossProfit -
                    bucket.expenses;

                bucket.revenue =
                    money(bucket.revenue);

                bucket.cogs =
                    money(bucket.cogs);

                bucket.grossProfit =
                    money(
                        bucket.grossProfit
                    );

                bucket.expenses =
                    money(bucket.expenses);

                bucket.netProfit =
                    money(
                        bucket.netProfit
                    );

                return bucket;
            });

    return result;
}

module.exports = {
    getFinancialData,
    getFinancialTrend,
};






