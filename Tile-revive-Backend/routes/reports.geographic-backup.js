const express = require("express");
const prisma = require("../db");

const {
    authenticateToken,
    requireAdmin,
} = require("../middleware/auth");

const router = express.Router();

// ======================================================
// ADMIN REPORTS
// GET /api/reports
// ADMIN ONLY
// ======================================================

router.get(
    "/",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            // ==================================================
// REPORT DATE RANGE
// ==================================================

const now = new Date();

const requestedPeriod =
    String(req.query.period || "30D")
        .trim()
        .toUpperCase();

const allowedPeriods = [
    "1D",
    "7D",
    "30D",
    "90D",
    "1Y",
];

const period = allowedPeriods.includes(
    requestedPeriod
)
    ? requestedPeriod
    : "30D";

const startDate = new Date(now);

if (period === "1D") {
    startDate.setHours(0, 0, 0, 0);
}

if (period === "7D") {
    startDate.setDate(
        startDate.getDate() - 7
    );
}

if (period === "30D") {
    startDate.setDate(
        startDate.getDate() - 30
    );
}

if (period === "90D") {
    startDate.setDate(
        startDate.getDate() - 90
    );
}

if (period === "1Y") {
    startDate.setDate(
        startDate.getDate() - 365
    );
}

// Previous period boundaries.
// These will be used for growth comparisons.

const periodDuration =
    now.getTime() -
    startDate.getTime();

const previousStartDate =
    new Date(
        startDate.getTime() -
        periodDuration
    );

const previousEndDate =
    new Date(startDate);

// Existing boundaries retained for
// legacy summary fields.

const startOfToday = new Date(now);
startOfToday.setHours(0, 0, 0, 0);

const startOfMonth = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
);

            // ==================================================
            // ORDERS
            // ==================================================

            const totalOrders =
                await prisma.order.count();

            const todayOrders =
                await prisma.order.count({
                    where: {
                        createdAt: {
                            gte: startOfToday,
                        },
                    },
                });

            const monthOrders =
                await prisma.order.count({
                    where: {
                        createdAt: {
                            gte: startOfMonth,
                        },
                    },
                });

            // ==================================================
            // REVENUE
            // ==================================================

            const revenue =
                await prisma.payment.aggregate({
                    _sum: {
                        amountPaid: true,
                    },
                    where: {
                        status: "SUCCESS",
                        createdAt: {
                            gte: startDate,
                            lte: now,
                        },
                    },
                });

            const todayRevenue =
                await prisma.payment.aggregate({
                    _sum: {
                        amountPaid: true,
                    },
                    where: {
                        status: "SUCCESS",
                        createdAt: {
                            gte: startOfToday,
                        },
                    },
                });

            const monthRevenue =
                await prisma.payment.aggregate({
                    _sum: {
                        amountPaid: true,
                    },
                    where: {
                        status: "SUCCESS",
                        createdAt: {
                            gte: startOfMonth,
                        },
                    },
                });

            const totalRevenue =
                Number(
                    revenue._sum.amountPaid || 0
                );

            const revenueToday =
                Number(
                    todayRevenue._sum.amountPaid || 0
                );

            const revenueThisMonth =
                Number(
                    monthRevenue._sum.amountPaid || 0
                );

            // ==================================================
            // PAYMENT STATISTICS
            // ==================================================

            const successfulPayments =
                await prisma.payment.count({
                    where: {
                        status: "SUCCESS",
                    },
                });

            const pendingPayments =
                await prisma.payment.count({
                    where: {
                        status: "PENDING",
                    },
                });

            const failedPayments =
                await prisma.payment.count({
                    where: {
                        status: "FAILED",
                    },
                });

            // ==================================================
            // CUSTOMERS
            // ==================================================

            const totalCustomers =
                await prisma.customer.count();

            const verifiedCustomers =
                await prisma.customer.count();
// ==================================================
            // PRODUCT PERFORMANCE
            // ==================================================

            const products =
                await prisma.product.findMany({
                    where: {
                        status: "ACTIVE",
                    },

                    select: {
                        id: true,
                        name: true,
                        sku: true,
                        stock: true,
                    },

                    orderBy: {
                        name: "asc",
                    },
                });

            // ==================================================
            // ORDER ITEM PERFORMANCE
            // ==================================================

            const orderItems =
                await prisma.orderitem.findMany({
                    include: {
                        product: true,

                        order: {
                            select: {
                                id: true,
                                orderStatus: true,
                                paymentStatus: true,
                                createdAt: true,
                            },
                        },
                    },
                });

            const productPerformance =
                products.map(product => {
                    const items =
                        orderItems.filter(
                            item =>
                                item.productId ===
                                product.id
                        );

                    const unitsSold =
                        items.reduce(
                            (total, item) =>
                                total +
                                Number(
                                    item.quantity || 0
                                ),
                            0
                        );

                    const paidItems =
                        items.filter(
                            item =>
                                item.order?.paymentStatus === "SUCCESS"
                        );

                    const productRevenue =
                        paidItems.reduce(
                            (total, item) =>
                                total +
                                Number(
                                    item.totalPrice || 0
                                ),
                            0
                        );

                    return {
                        id: product.id,
                        name: product.name,
                        sku: product.sku,
                        stock: product.stock,
                        unitsSold,
                        revenue: productRevenue,
                    };
                });

            // ==================================================
            // ORDER STATUS BREAKDOWN
            // ==================================================

            const statusGroups =
                await prisma.order.groupBy({
                    by: [
                        "orderStatus",
                    ],

                    _count: {
                        id: true,
                    },
                });

            const orderStatusBreakdown =
                statusGroups.map(group => ({
                    status: group.orderStatus,
                    count: group._count.id,
                }));

            // ==================================================
            // PAYMENT STATUS BREAKDOWN
            // ==================================================

            const paymentGroups =
                await prisma.order.groupBy({
                    by: [
                        "paymentStatus",
                    ],

                    _count: {
                        id: true,
                    },
                });

            const paymentStatusBreakdown =
                paymentGroups.map(group => ({
                    status: group.paymentStatus,
                    count: group._count.id,
                }));

            // ==================================================
            // RECENT ORDERS
            // ==================================================

            const recentOrders =
                await prisma.order.findMany({
                    orderBy: {
                        createdAt: "desc",
                    },

                    take: 10,

                    select: {
                        id: true,
                        orderNumber: true,
                        totalAmount: true,
                        orderStatus: true,
                        paymentStatus: true,
                        createdAt: true,

                        customer: {
                            select: {
                                id: true,
                                fullName: true,
                                email: true,
                            },
                        },
                    },
                });

            // ======================================================
            // LIVE CUSTOMERS
            // ======================================================

            // Customer is considered active if seen
            // within the last 2 minutes.

            const activeSince =
                new Date(
                    Date.now() - 2 * 60 * 1000
                );

            const activeVisitors =
                await prisma.visitorsession.findMany({
                    where: {
                        lastSeenAt: {
                            gte: activeSince,
                        },
                    },

                    orderBy: {
                        lastSeenAt: "desc",
                    },

                    take: 20,

                    select: {
                        sessionId: true,
                        currentPage: true,
                        currentProduct: true,
                        device: true,
                        browser: true,
                        city: true,
                        country: true,
                        firstSeenAt: true,
                        lastSeenAt: true,
                    },
                });

            const activeCustomerCount =
                activeVisitors.length;

            const customerActivityStatus =
                activeCustomerCount > 0
                    ? "ACTIVE"
                    : "INACTIVE";

            // ======================================================
            // CUSTOMER JOURNEY
            // ======================================================

            const journeyEvents =
                await prisma.visitorevent.groupBy({
                    by: [
                        "eventType",
                    ],

                    where: {
                        createdAt: {
                            gte: startDate,
                            lte: now,
                        },
                    },

                    _count: {
                        id: true,
                    },
                });

            const eventCount = type => {
                const event =
                    journeyEvents.find(
                        item =>
                            item.eventType === type
                    );

                return event
                    ? event._count.id
                    : 0;
            };

            const customerJourney = {
                pageViews: eventCount("PAGE_VIEW"),
                productViews: eventCount("PRODUCT_VIEW"),
                addToCart: eventCount("ADD_TO_CART"),
                checkoutStarted: eventCount("CHECKOUT_STARTED"),
                ordersPlaced: eventCount("ORDER_PLACED"),
                paymentsStarted: eventCount("PAYMENT_STARTED"),
                paymentsCompleted: eventCount("PAYMENT_COMPLETED"),
            };

            // ======================================================
            // EXPENSES
            // ======================================================

            const expenses =
                await prisma.expense.aggregate({
                    _sum: {
                        amount: true,
                    },

                    where: {
                        expenseDate: {
                            gte: startDate,
                            lte: now,
                        },
                    },
                });

            const todayExpenses =
                await prisma.expense.aggregate({
                    _sum: {
                        amount: true,
                    },

                    where: {
                        expenseDate: {
                            gte: startOfToday,
                        },
                    },
                });

            const monthExpenses =
                await prisma.expense.aggregate({
                    _sum: {
                        amount: true,
                    },

                    where: {
                        expenseDate: {
                            gte: startOfMonth,
                        },
                    },
                });

            const totalExpenditure =
                Number(
                    expenses._sum.amount || 0
                );

            const expenditureToday =
                Number(
                    todayExpenses._sum.amount || 0
                );

            const expenditureMonth =
                Number(
                    monthExpenses._sum.amount || 0
                );

            // ======================================================
            // PROFIT
            // ======================================================

            const trendOrders = await prisma.order.findMany({
    where: {
        createdAt: {
            gte: startDate,
            lte: now,
        },
        paymentStatus: "SUCCESS",
    },
    select: {
        createdAt: true,
        totalAmount: true,
    },
    orderBy: {
        createdAt: "asc",
    },
});

const salesTrendMap = new Map();

const trendKey = (date) => {

    const d = new Date(date);

    // ======================================================
    // 1D = HOURLY
    // ======================================================

    if (period === "1D") {

        d.setMinutes(0, 0, 0);

        return d.toISOString();

    }

    // ======================================================
    // 7D / 30D = DAILY
    // ======================================================

    if (
        period === "7D" ||
        period === "30D"
    ) {

        d.setHours(0, 0, 0, 0);

        return d.toISOString();

    }

    // ======================================================
    // 90D = WEEKLY
    // ======================================================

    if (period === "90D") {

        d.setHours(0, 0, 0, 0);

        const day =
            d.getDay();

        const difference =
            day === 0
                ? -6
                : 1 - day;

        d.setDate(
            d.getDate() + difference
        );

        return d.toISOString();

    }

    // ======================================================
    // 1Y = MONTHLY
    // ======================================================

    if (period === "1Y") {

        d.setDate(1);
        d.setHours(0, 0, 0, 0);

        return d.toISOString();

    }

    return d.toISOString();
};


const trendLabel = (date) => {

    const d = new Date(date);

    // ======================================================
    // 1D
    // ======================================================

    if (period === "1D") {

        return d.toLocaleTimeString(
            "en-KE",
            {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
            }
        );

    }

    // ======================================================
    // 7D / 30D
    // ======================================================

    if (
        period === "7D" ||
        period === "30D"
    ) {

        return d.toLocaleDateString(
            "en-KE",
            {
                day: "2-digit",
                month: "short",
            }
        );

    }

    // ======================================================
    // 90D
    // ======================================================

    if (period === "90D") {

        return `Week of ${d.toLocaleDateString(
            "en-KE",
            {
                day: "2-digit",
                month: "short",
            }
        )}`;

    }

    // ======================================================
    // 1Y
    // ======================================================

    if (period === "1Y") {

        return d.toLocaleDateString(
            "en-KE",
            {
                month: "short",
                year: "numeric",
            }
        );

    }

    return d.toLocaleDateString(
        "en-KE"
    );
};


for (const order of trendOrders) {

    const date =
        new Date(order.createdAt);

    const key =
        trendKey(date);

    if (!salesTrendMap.has(key)) {

        salesTrendMap.set(
            key,
            {
                name:
                    trendLabel(date),

                revenue: 0,

                orders: 0,
            }
        );

    }

    const bucket =
        salesTrendMap.get(key);

    bucket.revenue +=
        Number(
            order.totalAmount || 0
        );

    bucket.orders += 1;

}


// ======================================================
// SORT CHRONOLOGICALLY
// ======================================================

const salesTrend =
    Array.from(
        salesTrendMap.entries()
    )
        .sort(
            (a, b) =>
                new Date(a[0]) -
                new Date(b[0])
        )
        .map(
            ([, value]) =>
                value
        );

const totalProfit =
                totalRevenue -
                totalExpenditure;

            const todayProfit =
                revenueToday -
                expenditureToday;

            const monthProfit =
                revenueThisMonth -
                expenditureMonth;

            // ======================================================
            // ADVERTISING
            // ======================================================

            const advertisingMetrics =
                await prisma.advertisingmetric.aggregate({
                    where: {
                        metricDate: {
                            gte: startDate,
                            lte: now,
                        },
                    },
                    _sum: {
                        spend: true,
                        impressions: true,
                        clicks: true,
                        conversions: true,
                        revenue: true,
                    },
                });

            const adSpend =
                Number(
                    advertisingMetrics._sum.spend || 0
                );

            const adImpressions =
                Number(
                    advertisingMetrics._sum.impressions || 0
                );

            const adClicks =
                Number(
                    advertisingMetrics._sum.clicks || 0
                );

            const adConversions =
                Number(
                    advertisingMetrics._sum.conversions || 0
                );

            const adRevenue =
                Number(
                    advertisingMetrics._sum.revenue || 0
                );

            // ======================================================
            // AD CALCULATIONS
            // ======================================================

            const ctr =
                adImpressions > 0
                    ? (
                        adClicks /
                        adImpressions
                    ) * 100
                    : 0;

            const cpc =
                adClicks > 0
                    ? adSpend / adClicks
                    : 0;

            const roas =
                adSpend > 0
                    ? adRevenue / adSpend
                    : 0;

            // CPM = cost per 1,000 impressions
            const cpm =
                adImpressions > 0
                    ? (
                        adSpend /
                        adImpressions
                    ) * 1000
                    : 0;

            // ======================================================
            // FINAL REPORT RESPONSE
            // ======================================================

            return res.json({
                success: true,

                generatedAt: new Date(),

                // ==================================================
                // SUMMARY
                // ==================================================

                salesTrend,

                summary: {
                    totalOrders,
                    todayOrders,
                    monthOrders,

                    totalRevenue,
                    revenueToday,
                    revenueThisMonth,

                    totalExpenditure,
                    expenditureToday,
                    expenditureMonth,

                    totalProfit,
                    todayProfit,
                    monthProfit,

                    totalCustomers,
                    verifiedCustomers,

                    successfulPayments,
                    pendingPayments,
                    failedPayments,
                },

                // ==================================================
                // LIVE CUSTOMER MONITOR
                // ==================================================

                liveCustomers: {
                    count: activeCustomerCount,

                    status: customerActivityStatus,

                    isActive:
                        activeCustomerCount > 0,

                    visitors: activeVisitors,
                },

                // ==================================================
                // CUSTOMER JOURNEY
                // ==================================================

                customerJourney,

                // ==================================================
                // ORDER ANALYTICS
                // ==================================================

                orderStatusBreakdown,

                paymentStatusBreakdown,

                // ==================================================
                // PRODUCT ANALYTICS
                // ==================================================

                productPerformance,

                // ==================================================
                // RECENT ORDERS
                // ==================================================

                recentOrders,

                // ==================================================
                // ADVERTISING ANALYTICS
                // ==================================================

                advertising: {
                    spend: adSpend,

                    impressions:
                        adImpressions,

                    clicks:
                        adClicks,

                    conversions:
                        adConversions,

                    revenue:
                        adRevenue,

                    ctr:
                        Number(
                            ctr.toFixed(2)
                        ),

                    cpc:
                        Number(
                            cpc.toFixed(2)
                        ),

                    cpm:
                        Number(
                            cpm.toFixed(2)
                        ),

                    roas:
                        Number(
                            roas.toFixed(2)
                        ),
                },
            });

        } catch (error) {
            console.error(
                "ADMIN REPORTS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,

                message:
                    "Failed to generate admin reports",

                error:
                    process.env.NODE_ENV === "development"
                        ? error.message
                        : undefined,
            });
        }
    }
);

module.exports = router;

