const express = require("express");
const router = express.Router();

const prisma = require("../db");

// Get All Categories
router.get("/", async (req, res) => {

    try {

        const categories = await prisma.category.findMany({

            include: {

                products: true

            }

        });

        res.json(categories);

    } catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

// Create Category
router.post("/", async (req, res) => {

    try {

        const category = await prisma.category.create({

            data: req.body

        });

        res.status(201).json(category);

    } catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

module.exports = router;