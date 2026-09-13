const express = require("express");
const { authenticateToken, requireAdmin } = require("../middleware/auth");
const prisma = require("../db");

const router = express.Router();

// ======================================================
// GET ALL INVENTORY
// GET /api/inventory
// ======================================================

router.get("/", async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            orderBy: {
                name: "asc"
            }
        });

        const inventory = products.map((product) => {
            let stockStatus = "IN STOCK";

            if (product.stock <= 0) {
                stockStatus = "OUT OF STOCK";
            } else if (product.stock <= product.minimumStock) {
                stockStatus = "LOW STOCK";
            }

            return {
                id: product.id,
                name: product.name,
                sku: product.sku,
                barcode: product.barcode,
                stock: product.stock,
                minimumStock: product.minimumStock,
                stockStatus,
                price: product.price,
                discountPrice: product.discountPrice,
                status: product.status,
                updatedAt: product.updatedAt
            };
        });

        return res.json({
            success: true,
            count: inventory.length,
            inventory
        });

    } catch (error) {
        console.error("GET INVENTORY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch inventory.",
            error: error.message
        });
    }
});

// ======================================================
// GET LOW STOCK PRODUCTS
// GET /api/inventory/low-stock
// ======================================================

router.get("/low-stock", async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            where: {
                status: "ACTIVE"
            },
            orderBy: {
                stock: "asc"
            }
        });

        const lowStockProducts = products
            .filter((product) => {
                return product.stock <= product.minimumStock;
            })
            .map((product) => ({
                id: product.id,
                name: product.name,
                sku: product.sku,
                stock: product.stock,
                minimumStock: product.minimumStock,
                stockStatus:
                    product.stock === 0
                        ? "OUT OF STOCK"
                        : "LOW STOCK"
            }));

        return res.json({
            success: true,
            count: lowStockProducts.length,
            products: lowStockProducts
        });

    } catch (error) {
        console.error("LOW STOCK ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch low-stock products.",
            error: error.message
        });
    }
});

// ======================================================
// GET INVENTORY HISTORY
// GET /api/inventory/:productId/history
// ======================================================

router.get("/:productId/history", async (req, res) => {
    try {
        const productId = Number(req.params.productId);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        const product = await prisma.product.findUnique({
            where: {
                id: productId
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        const transactions =
            await prisma.inventoryTransaction.findMany({
                where: {
                    productId
                },
                orderBy: {
                    createdAt: "desc"
                }
            });

        return res.json({
            success: true,

            product: {
                id: product.id,
                name: product.name,
                sku: product.sku,
                currentStock: product.stock,
                minimumStock: product.minimumStock
            },

            count: transactions.length,

            transactions
        });

    } catch (error) {
        console.error("INVENTORY HISTORY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch inventory history.",
            error: error.message
        });
    }
});

// ======================================================
// GET SINGLE PRODUCT INVENTORY
// GET /api/inventory/:productId
// ======================================================

router.get("/:productId", async (req, res) => {
    try {
        const productId = Number(req.params.productId);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        const product = await prisma.product.findUnique({
            where: {
                id: productId
            },

            include: {
                inventoryTransactions: {
                    orderBy: {
                        createdAt: "desc"
                    }
                }
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        let stockStatus = "IN STOCK";

        if (product.stock <= 0) {
            stockStatus = "OUT OF STOCK";
        } else if (product.stock <= product.minimumStock) {
            stockStatus = "LOW STOCK";
        }

        return res.json({
            success: true,

            product: {
                id: product.id,
                name: product.name,
                sku: product.sku,
                barcode: product.barcode,

                stock: product.stock,
                minimumStock: product.minimumStock,

                stockStatus,

                transactions: product.inventoryTransactions
            }
        });

    } catch (error) {
        console.error("GET PRODUCT INVENTORY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch product inventory.",
            error: error.message
        });
    }
});

// ======================================================
// ADD STOCK
// POST /api/inventory/:productId/add
// ======================================================

router.post("/:productId/add", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const productId = Number(req.params.productId);

        const {
            quantity,
            reference,
            note
        } = req.body;

        const stockToAdd = Number(quantity);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        if (
            !Number.isInteger(stockToAdd) ||
            stockToAdd <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive whole number."
            });
        }

        const product = await prisma.product.findUnique({
            where: {
                id: productId
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        const previousStock = product.stock;
        const newStock = previousStock + stockToAdd;

        await prisma.$transaction([
            prisma.product.update({
                where: {
                    id: productId
                },

                data: {
                    stock: newStock
                }
            }),

            prisma.inventoryTransaction.create({
                data: {
                    productId,

                    type: "STOCK_IN",

                    quantity: stockToAdd,

                    previousStock,

                    newStock,

                    reference: reference || null,

                    note: note || null
                }
            })
        ]);

        return res.json({
            success: true,
            message: "Stock added successfully.",

            inventory: {
                productId,
                productName: product.name,
                previousStock,
                quantityAdded: stockToAdd,
                newStock
            }
        });

    } catch (error) {
        console.error("ADD STOCK ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to add stock.",
            error: error.message
        });
    }
});

// ======================================================
// REMOVE STOCK
// POST /api/inventory/:productId/remove
// ======================================================

router.post("/:productId/remove", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const productId = Number(req.params.productId);

        const {
            quantity,
            reference,
            note
        } = req.body;

        const stockToRemove = Number(quantity);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        if (
            !Number.isInteger(stockToRemove) ||
            stockToRemove <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive whole number."
            });
        }

        const product = await prisma.product.findUnique({
            where: {
                id: productId
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        if (stockToRemove > product.stock) {
            return res.status(400).json({
                success: false,
                message:
                    `Cannot remove ${stockToRemove}. Only ${product.stock} available.`
            });
        }

        const previousStock = product.stock;
        const newStock = previousStock - stockToRemove;

        await prisma.$transaction([
            prisma.product.update({
                where: {
                    id: productId
                },

                data: {
                    stock: newStock
                }
            }),

            prisma.inventoryTransaction.create({
                data: {
                    productId,

                    type: "STOCK_OUT",

                    quantity: stockToRemove,

                    previousStock,

                    newStock,

                    reference: reference || null,

                    note: note || null
                }
            })
        ]);

        return res.json({
            success: true,
            message: "Stock removed successfully.",

            inventory: {
                productId,
                productName: product.name,
                previousStock,
                quantityRemoved: stockToRemove,
                newStock
            }
        });

    } catch (error) {
        console.error("REMOVE STOCK ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to remove stock.",
            error: error.message
        });
    }
});

// ======================================================
// MANUALLY SET STOCK
// PUT /api/inventory/:productId
// ======================================================

router.put("/:productId", authenticateToken, requireAdmin, async (req, res) => {
    try {
        const productId = Number(req.params.productId);

        const {
            stock,
            minimumStock,
            note
        } = req.body;

        const newStock = Number(stock);

        if (!Number.isInteger(productId) || productId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID."
            });
        }

        if (
            !Number.isInteger(newStock) ||
            newStock < 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Stock must be a whole number greater than or equal to 0."
            });
        }

        const product = await prisma.product.findUnique({
            where: {
                id: productId
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        const previousStock = product.stock;

        const updateData = {
            stock: newStock
        };

        if (minimumStock !== undefined) {
            const newMinimumStock = Number(minimumStock);

            if (
                !Number.isInteger(newMinimumStock) ||
                newMinimumStock < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "minimumStock must be a whole number greater than or equal to 0."
                });
            }

            updateData.minimumStock = newMinimumStock;
        }

        await prisma.$transaction([
            prisma.product.update({
                where: {
                    id: productId
                },

                data: updateData
            }),

            prisma.inventoryTransaction.create({
                data: {
                    productId,

                    type: "STOCK_ADJUSTMENT",

                    quantity: Math.abs(newStock - previousStock),

                    previousStock,

                    newStock,

                    note: note || "Manual stock adjustment"
                }
            })
        ]);

        return res.json({
            success: true,
            message: "Inventory updated successfully.",

            inventory: {
                productId,
                productName: product.name,
                previousStock,
                newStock
            }
        });

    } catch (error) {
        console.error("UPDATE INVENTORY ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update inventory.",
            error: error.message
        });
    }
});

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;

