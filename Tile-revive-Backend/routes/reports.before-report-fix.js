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
            // DATE RANGE
            // ==================================================

            const now = new Date();

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
                await prisma.user.count({
                    where: {
                        role: "USER",
                    },
                });

            const verifiedCustomers =
                await prisma.user.count({
                    where: {
                        role: "USER",
                        emailVerified: true,
                    },
                });

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
                                item.order?.paymentStatus ===
                                "PAID"
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
