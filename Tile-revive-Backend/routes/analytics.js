const express = require("express");
const prisma = require("../db");

const {
    authenticateToken,
    requireAdmin
} = require("../middleware/auth");

const router = express.Router();


// ======================================================
// CREATE / UPDATE VISITOR SESSION
// POST /api/analytics/session
// PUBLIC
// ======================================================

router.post("/session", async (req, res) => {
    try {
        const {
            sessionId,
            page,
            productId,
            productName,
            device,
            browser,
            city,
            country
        } = req.body;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: "sessionId is required"
            });
        }

        const ipAddress =
            req.headers["x-forwarded-for"] ||
            req.socket.remoteAddress ||
            null;

        const session =
            await prisma.visitorsession.upsert({
                where: {
                    sessionId
                },

                update: {
                    currentPage: page || null,
                    currentProduct:
                        productName ||
                        (productId ? `Product ${productId}` : null),
                    device: device || null,
                    browser: browser || null,
                    city: city || null,
                    country: country || null,
                    lastSeenAt: new Date()
                },

                create: {
                    sessionId,
                    currentPage: page || null,
                    currentProduct:
                        productName ||
                        (productId ? `Product ${productId}` : null),
                    device: device || null,
                    browser: browser || null,
                    city: city || null,
                    country: country || null,
                    firstSeenAt: new Date(),
                    lastSeenAt: new Date()
                }
            });

        return res.json({
            success: true,
            sessionId: session.sessionId
        });

    } catch (error) {
        console.error(
            "VISITOR SESSION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to create visitor session"
        });
    }
});


// ======================================================
// TRACK EVENT
// POST /api/analytics/event
// PUBLIC
// ======================================================

router.post("/event", async (req, res) => {
    try {
        const {
            sessionId,
            eventType,
            page,
            productId,
            productName,
            orderId,
            metadata
        } = req.body;

        if (!sessionId || !eventType) {
            return res.status(400).json({
                success: false,
                message: "sessionId and eventType are required"
            });
        }

        let parsedMetadata = {};

        if (metadata && typeof metadata === "object") {
            parsedMetadata = {
                ...metadata
            };
        } else if (metadata) {
            parsedMetadata = {
                value: String(metadata)
            };
        }

        if (productName) {
            parsedMetadata.productName = productName;
        }

        if (orderId !== undefined && orderId !== null) {
            parsedMetadata.orderId = Number(orderId);
        }

        if (productId !== undefined && productId !== null) {
            parsedMetadata.productId = Number(productId);
        }

        const metadataString =
            Object.keys(parsedMetadata).length > 0
                ? JSON.stringify(parsedMetadata)
                : null;

        await prisma.visitorevent.create({
            data: {
                sessionId,
                eventType,
                page: page || null,
                productId:
                    productId !== undefined &&
                    productId !== null &&
                    productId !== ""
                        ? Number(productId)
                        : null,
                metadata: metadataString
            }
        });

        await prisma.visitorsession.update({
            where: {
                sessionId
            },

            data: {
                currentPage:
                    page !== undefined
                        ? page || null
                        : undefined,

                currentProduct:
                    productName !== undefined
                        ? productName || null
                        : undefined,

                lastSeenAt: new Date()
            }
        });

        return res.json({
            success: true
        });

    } catch (error) {
        console.error(
            "ANALYTICS EVENT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to record event"
        });
    }
});


// ======================================================
// LIVE VISITORS
// GET /api/analytics/live
// ADMIN ONLY
// ======================================================

router.get(
    "/live",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const activeSince =
                new Date(
                    Date.now() - 2 * 60 * 1000
                );

            const visitors =
                await prisma.visitorsession.findMany({
                    where: {
                        lastSeenAt: {
                            gte: activeSince
                        }
                    },

                    orderBy: {
                        lastSeenAt: "desc"
                    },

                    take: 50,

                    select: {
                        sessionId: true,
                        currentPage: true,
                        currentProduct: true,
                        device: true,
                        browser: true,
                        country: true,
                        city: true,
                        firstSeenAt: true,
                        lastSeenAt: true
                    }
                });

            return res.json({
                success: true,
                count: visitors.length,
                active: visitors.length > 0,
                visitors
            });

        } catch (error) {
            console.error(
                "LIVE ACTIVITY ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to load live activity"
            });
        }
    }
);


// ======================================================
// CUSTOMER JOURNEY
// GET /api/analytics/journey
// ADMIN ONLY
// ======================================================

router.get(
    "/journey",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const now = new Date();

            const period =
                String(req.query.period || "30D")
                    .toUpperCase();

            const periodDays = {
                "1D": 1,
                "7D": 7,
                "30D": 30,
                "90D": 90,
                "1Y": 365
            };

            const days =
                periodDays[period] || 30;

            const startDate =
                new Date(
                    now.getTime() -
                    days * 24 * 60 * 60 * 1000
                );

            const events =
                await prisma.visitorevent.groupBy({
                    by: [
                        "eventType"
                    ],

                    where: {
                        createdAt: {
                            gte: startDate,
                            lte: now
                        }
                    },

                    _count: {
                        id: true
                    }
                });

            const getCount = (name) => {
                const found =
                    events.find(
                        event =>
                            event.eventType === name
                    );

                return found
                    ? found._count.id
                    : 0;
            };

            const websiteVisitors =
                await prisma.visitorsession.count({
                    where: {
                        firstSeenAt: {
                            gte: startDate,
                            lte: now
                        }
                    }
                });

            const pageViews =
                getCount("PAGE_VIEW");

            const productViews =
                getCount("PRODUCT_VIEW");

            const addToCart =
                getCount("ADD_TO_CART");

            const checkoutStarted =
                getCount("CHECKOUT_STARTED");

            const orderPlaced =
                getCount("ORDER_PLACED");

            const orderCompleted =
                getCount("ORDER_COMPLETED");

            const paymentStarted =
                getCount("PAYMENT_STARTED");

            const paymentCompleted =
                getCount("PAYMENT_COMPLETED");

            return res.json({
                success: true,

                period,

                journey: {
                    websiteVisitors,

                    pageViews,

                    productViews,

                    addToCart,

                    checkoutStarted,

                    orderPlaced,

                    orderCompleted,

                    paymentStarted,

                    paymentCompleted,

                    ordersCompleted:
                        orderCompleted ||
                        orderPlaced,

                    conversionRate:
                        websiteVisitors > 0
                            ? Number(
                                (
                                    ((orderCompleted ||
                                        orderPlaced) /
                                        websiteVisitors) *
                                    100
                                ).toFixed(2)
                            )
                            : 0
                }
            });

        } catch (error) {
            console.error(
                "CUSTOMER JOURNEY ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to load customer journey"
            });
        }
    }
);


module.exports = router;
