const express = require("express");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const prisma = require("../db");

const router = express.Router();

// ======================================================
// GET ALL GALLERY ITEMS
// GET /api/gallery
// ======================================================

router.get("/", async (req, res) => {
    try {
        const gallery = await prisma.gallery.findMany({
            orderBy: {
                createdAt: "desc"
            }
        });

        res.json({
            success: true,
            gallery
        });

    } catch (error) {
        console.error("======================================");
        console.error("❌ GALLERY DATABASE ERROR");
        console.error("======================================");
        console.error(error);
        console.error("Message:", error.message);
        console.error("Code:", error.code);
        console.error("Meta:", error.meta);
        console.error("======================================");

        res.status(500).json({
            success: false,
            message: "Failed to load gallery",
            error: error.message,
            code: error.code || null
        });
    }
});


// ======================================================
// GET PUBLIC GALLERY
// GET /api/gallery/public
// ======================================================

router.get("/public", async (req, res) => {
    try {
        const gallery = await prisma.gallery.findMany({
            where: {
                isVisible: true
            },
            orderBy: [
                {
                    featured: "desc"
                },
                {
                    createdAt: "desc"
                }
            ]
        });

        res.json({
            success: true,
            gallery
        });

    } catch (error) {
        console.error("Public gallery error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load gallery"
        });
    }
});


// ======================================================
// GET SINGLE GALLERY ITEM
// GET /api/gallery/:id
// ======================================================

router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        const item = await prisma.gallery.findUnique({
            where: {
                id
            }
        });

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Gallery item not found"
            });
        }

        res.json({
            success: true,
            gallery: item
        });

    } catch (error) {
        console.error("Gallery item error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to load gallery item"
        });
    }
});


// ======================================================
// CREATE GALLERY ITEM
// POST /api/gallery
// ======================================================

router.post("/", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const {
            title,
            description,
            type,
            imageUrl,
            beforeImage,
            afterImage,
            featured,
            isVisible
        } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: "Gallery title is required"
            });
        }

        if (
            type !== "BEFORE_AFTER" &&
            type !== "PRODUCT" &&
            type !== "GENERAL"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid gallery type"
            });
        }

        if (type === "BEFORE_AFTER") {
            if (!beforeImage || !afterImage) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Before and after images are required"
                });
            }
        } else if (!imageUrl) {
            return res.status(400).json({
                success: false,
                message: "Image URL is required"
            });
        }

        const gallery = await prisma.gallery.create({
            data: {
                title,
                description: description || null,
                type,
                imageUrl:
                    type === "BEFORE_AFTER"
                        ? afterImage
                        : imageUrl,
                beforeImage:
                    type === "BEFORE_AFTER"
                        ? beforeImage
                        : null,
                afterImage:
                    type === "BEFORE_AFTER"
                        ? afterImage
                        : null,
                featured: Boolean(featured),
                isVisible:
                    isVisible === undefined
                        ? true
                        : Boolean(isVisible)
            }
        });

        res.status(201).json({
            success: true,
            message: "Gallery image added successfully",
            gallery
        });

    } catch (error) {
        console.error("Gallery create error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create gallery item"
        });
    }
});


// ======================================================
// UPDATE GALLERY ITEM
// PUT /api/gallery/:id
// ======================================================

router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        const existing = await prisma.gallery.findUnique({
            where: {
                id
            }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Gallery item not found"
            });
        }

        const {
            title,
            description,
            type,
            imageUrl,
            beforeImage,
            afterImage,
            featured,
            isVisible
        } = req.body;

        const gallery = await prisma.gallery.update({
            where: {
                id
            },

            data: {
                title:
                    title !== undefined
                        ? title
                        : existing.title,

                description:
                    description !== undefined
                        ? description
                        : existing.description,

                type:
                    type !== undefined
                        ? type
                        : existing.type,

                imageUrl:
                    imageUrl !== undefined
                        ? imageUrl
                        : existing.imageUrl,

                beforeImage:
                    beforeImage !== undefined
                        ? beforeImage
                        : existing.beforeImage,

                afterImage:
                    afterImage !== undefined
                        ? afterImage
                        : existing.afterImage,

                featured:
                    featured !== undefined
                        ? Boolean(featured)
                        : existing.featured,

                isVisible:
                    isVisible !== undefined
                        ? Boolean(isVisible)
                        : existing.isVisible
            }
        });

        res.json({
            success: true,
            message: "Gallery updated successfully",
            gallery
        });

    } catch (error) {
        console.error("Gallery update error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update gallery"
        });
    }
});


// ======================================================
// DELETE GALLERY ITEM
// DELETE /api/gallery/:id
// ======================================================

router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const id = Number(req.params.id);

        const existing = await prisma.gallery.findUnique({
            where: {
                id
            }
        });

        if (!existing) {
            return res.status(404).json({
                success: false,
                message: "Gallery item not found"
            });
        }

        await prisma.gallery.delete({
            where: {
                id
            }
        });

        res.json({
            success: true,
            message: "Gallery item deleted successfully"
        });

    } catch (error) {
        console.error("Gallery delete error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete gallery item"
        });
    }
});


module.exports = router;

