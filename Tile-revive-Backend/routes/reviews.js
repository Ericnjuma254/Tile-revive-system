const express = require("express");
const prisma = require("../db");
const { requireCustomerAuth } = require("./customerAuth");

const router = express.Router();

// ======================================================
/**
 * GET ALL REVIEWS
 * Public
 *
 * Used by the customer-facing Reviews page.
 */
router.get("/", async (req, res) => {
    try {
        const reviews = await prisma.productreview.findMany({
            orderBy: {
                createdAt: "desc"
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        fullName: true
                    }
                },
                product: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        const total = reviews.length;

        const averageRating =
            total > 0
                ? Number(
                    (
                        reviews.reduce(
                            (sum, review) =>
                                sum + Number(review.rating || 0),
                            0
                        ) / total
                    ).toFixed(1)
                )
                : 0;

        return res.json({
            success: true,
            reviews,
            summary: {
                averageRating,
                reviewCount: total
            }
        });

    } catch (error) {
        console.error(
            "GET ALL REVIEWS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to load reviews"
        });
    }
});


/**
 * GET PRODUCTS THE CUSTOMER CAN REVIEW
 *
 * Customer authentication required.
 *
 * Only products appearing in a customer's paid or
 * delivered orders are returned.
 */
router.get(
    "/my-products",
    requireCustomerAuth,
    async (req, res) => {
        try {
            const customerId =
                Number(req.customer.customerId || req.customer.id);

            if (!Number.isInteger(customerId) || customerId <= 0) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid customer session"
                });
            }

            const items = await prisma.orderitem.findMany({
                where: {
                    order: {
                        customerId,
                        OR: [
                            {
                                orderStatus: "DELIVERED"
                            },
                            {
                                paymentStatus: "PAID"
                            }
                        ]
                    }
                },
                select: {
                    productId: true,
                    product: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                distinct: ["productId"]
            });

            const existingReviews =
                await prisma.productreview.findMany({
                    where: {
                        customerId
                    },
                    select: {
                        productId: true
                    }
                });

            const reviewedProductIds =
                new Set(
                    existingReviews.map(
                        (review) => review.productId
                    )
                );

            const products = items
                .filter(
                    (item) =>
                        !reviewedProductIds.has(item.productId)
                )
                .map((item) => item.product);

            return res.json({
                success: true,
                products
            });

        } catch (error) {
            console.error(
                "GET CUSTOMER REVIEW PRODUCTS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Unable to load products available for review"
            });
        }
    }
);

// GET REVIEWS FOR A PRODUCT
// Public
// ======================================================

router.get("/product/:productId", async (req, res) => {
    try {
        const productId = Number(req.params.productId);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        const reviews = await prisma.productreview.findMany({
            where: {
                productId
            },
            orderBy: {
                createdAt: "desc"
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        fullName: true
                    }
                }
            }
        });

        const summary = await prisma.productreview.aggregate({
            where: {
                productId
            },
            _avg: {
                rating: true
            },
            _count: {
                id: true
            }
        });

        return res.json({
            success: true,
            reviews,
            summary: {
                averageRating: summary._avg.rating
                    ? Number(summary._avg.rating.toFixed(1))
                    : 0,
                reviewCount: summary._count.id
            }
        });

    } catch (error) {
        console.error("GET PRODUCT REVIEWS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to load reviews"
        });
    }
});

// ======================================================
// SUBMIT PRODUCT REVIEW
// Customer authentication required
// Purchase verification required
// ======================================================

router.post("/product/:productId", requireCustomerAuth, async (req, res) => {
    try {
        const productId = Number(req.params.productId);
        const customerId = Number(req.customer.customerId);

        const rating = Number(req.body.rating);
        const comment = String(req.body.comment || "").trim();

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        if (comment.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "Review must be 1000 characters or less"
            });
        }

        // --------------------------------------------------
        // Confirm product exists
        // --------------------------------------------------

        const product = await prisma.product.findUnique({
            where: {
                id: productId
            },
            select: {
                id: true
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // --------------------------------------------------
        // REAL PURCHASE VERIFICATION
        // --------------------------------------------------

        const purchase = await prisma.orderitem.findFirst({
            where: {
                productId,
                order: {
                    customerId,
                    OR: [
                        {
                            orderStatus: {
                                equals: "DELIVERED"
                            }
                        },
                        {
                            paymentStatus: {
                                equals: "PAID"
                            }
                        }
                    ]
                }
            },
            select: {
                id: true
            }
        });

        if (!purchase) {
            return res.status(403).json({
                success: false,
                message: "You can only review products you have purchased."
            });
        }

        // --------------------------------------------------
        // ONE REVIEW PER CUSTOMER / PRODUCT
        // --------------------------------------------------

        const existingReview = await prisma.productreview.findUnique({
            where: {
                productId_customerId: {
                    productId,
                    customerId
                }
            }
        });

        if (existingReview) {
            return res.status(409).json({
                success: false,
                message: "You have already reviewed this product."
            });
        }

        // --------------------------------------------------
        // CREATE REAL REVIEW
        // --------------------------------------------------

        const review = await prisma.productreview.create({
            data: {
                productId,
                customerId,
                rating,
                comment: comment || null
            },
            include: {
                customer: {
                    select: {
                        id: true,
                        fullName: true
                    }
                }
            }
        });

        // --------------------------------------------------
        // RECALCULATE REAL PRODUCT RATING
        // --------------------------------------------------

        const aggregate = await prisma.productreview.aggregate({
            where: {
                productId
            },
            _avg: {
                rating: true
            },
            _count: {
                id: true
            }
        });

        await prisma.product.update({
            where: {
                id: productId
            },
            data: {
                rating: aggregate._avg.rating || 0,
                reviewCount: aggregate._count.id
            }
        });

        return res.status(201).json({
            success: true,
            message: "Review submitted successfully",
            review,
            summary: {
                averageRating: aggregate._avg.rating
                    ? Number(aggregate._avg.rating.toFixed(1))
                    : 0,
                reviewCount: aggregate._count.id
            }
        });

    } catch (error) {

        if (error.code === "P2002") {
            return res.status(409).json({
                success: false,
                message: "You have already reviewed this product."
            });
        }

        console.error("CREATE PRODUCT REVIEW ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to submit review"
        });
    }
});

module.exports = router;

