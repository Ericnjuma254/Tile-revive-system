const express = require("express");
const router = express.Router();

const prisma = require("../db");

// ======================================================
// GET ALL CATEGORIES
// GET /api/categories
// ======================================================

router.get("/", async (req, res) => {
    try {

        const products = await prisma.product.findMany({
            select: {
                category: true
            },
            where: {
                category: {
                    not: null
                }
            }
        });

        const categories = [
            ...new Set(
                products
                    .map(product => product.category)
                    .filter(category => category && category.trim() !== "")
            )
        ].sort();

        return res.json({
            success: true,
            count: categories.length,
            categories
        });

    } catch (error) {

        console.error(
            "GET CATEGORIES ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to fetch categories.",
            error: error.message
        });
    }
});

module.exports = router;