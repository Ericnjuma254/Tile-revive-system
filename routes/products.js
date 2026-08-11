const express = require("express");
const router = express.Router();
const prisma = require("../db");

// ======================================================
// ADD PRODUCT
// POST /api/products
// ======================================================

router.post("/", async (req, res) => {
    try {
        const {
            name,
            description,
            shortDescription,
            sku,
            barcode,
            price,
            costPrice,
            discountPrice,
            stock,
            minimumStock,
            category,
            brand,
            image,
            featured,
            status
        } = req.body;

        if (!name || price === undefined) {
            return res.status(400).json({
                message: "Product name and price are required"
            });
        }

        const product = await prisma.product.create({
            data: {
                name,
                description,
                shortDescription,
                sku,
                barcode,

                price: Number(price),

                costPrice:
                    costPrice !== undefined
                        ? Number(costPrice)
                        : null,

                discountPrice:
                    discountPrice !== undefined
                        ? Number(discountPrice)
                        : null,

                stock:
                    stock !== undefined
                        ? Number(stock)
                        : 0,

                minimumStock:
                    minimumStock !== undefined
                        ? Number(minimumStock)
                        : 5,

                category,
                brand,
                image,

                featured:
                    featured !== undefined
                        ? Boolean(featured)
                        : false,

                status:
                    status || "ACTIVE"
            }
        });

        // ==================================================
        // CREATE INITIAL INVENTORY TRANSACTION
        // ==================================================

        if (Number(stock || 0) > 0) {
            await prisma.inventoryTransaction.create({
                data: {
                    productId: product.id,
                    type: "INITIAL_STOCK",
                    quantity: Number(stock),
                    previousStock: 0,
                    newStock: Number(stock),
                    reference: product.sku || null,
                    note: "Initial product stock"
                }
            });
        }

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product
        });

    } catch (error) {
        console.error("ADD PRODUCT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create product",
            error: error.message
        });
    }
});


// ======================================================
// GET ALL PRODUCTS
// GET /api/products
// ======================================================

router.get("/", async (req, res) => {
    try {
        const products = await prisma.product.findMany({
            orderBy: {
                createdAt: "desc"
            }
        });

        res.json({
            success: true,
            count: products.length,
            products
        });

    } catch (error) {
        console.error("GET PRODUCTS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Failed to get products",
            error: error.message
        });
    }
});


// ======================================================
// GET LOW STOCK PRODUCTS
// GET /api/products/low-stock
// ======================================================

router.get("/low-stock", async (req, res) => {
    try {

        // Get all active products
        const products = await prisma.product.findMany({
            where: {
                status: "ACTIVE"
            },
            orderBy: {
                stock: "asc"
            }
        });

        // Check stock against minimumStock
        const lowStockProducts = products
            .filter(product => {
                return product.stock <= product.minimumStock;
            })
            .map(product => ({
                id: product.id,
                name: product.name,
                sku: product.sku,
                stock: product.stock,
                minimumStock: product.minimumStock,
                price: product.price,
                status: product.status,

                alert:
                    product.stock === 0
                        ? "OUT_OF_STOCK"
                        : "LOW_STOCK"
            }));

        return res.json({
            success: true,
            count: lowStockProducts.length,
            lowStockProducts
        });

    } catch (error) {

        console.error("LOW STOCK ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch low stock products.",
            error: error.message
        });
    }
});


// ======================================================
// GET ONE PRODUCT
// GET /api/products/:id
// ======================================================

router.get("/:id", async (req, res) => {

    try {

        const product = await prisma.product.findUnique({
            where: {
                id: Number(req.params.id)
            }
        });

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json(product);

    } catch (error) {

        console.error("GET PRODUCT ERROR:", error);

        res.status(500).json({
            message: "Failed to get product",
            error: error.message
        });
    }
});


// ======================================================
// UPDATE PRODUCT
// PUT /api/products/:id
// ======================================================

router.put("/:id", async (req, res) => {
    try {

        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        const oldProduct =
            await prisma.product.findUnique({
                where: {
                    id
                }
            });

        if (!oldProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const newStock =
            req.body.stock !== undefined
                ? Number(req.body.stock)
                : oldProduct.stock;

        const product =
            await prisma.product.update({
                where: {
                    id
                },
                data: {
                    ...req.body,

                    price:
                        req.body.price !== undefined
                            ? Number(req.body.price)
                            : undefined,

                    costPrice:
                        req.body.costPrice !== undefined
                            ? Number(req.body.costPrice)
                            : undefined,

                    discountPrice:
                        req.body.discountPrice !== undefined
                            ? Number(req.body.discountPrice)
                            : undefined,

                    stock:
                        req.body.stock !== undefined
                            ? Number(req.body.stock)
                            : undefined,

                    minimumStock:
                        req.body.minimumStock !== undefined
                            ? Number(req.body.minimumStock)
                            : undefined
                }
            });

        // ==================================================
        // RECORD STOCK ADJUSTMENT
        // ==================================================

        if (newStock !== oldProduct.stock) {

            const difference =
                newStock - oldProduct.stock;

            await prisma.inventoryTransaction.create({
                data: {
                    productId: product.id,

                    type:
                        difference > 0
                            ? "STOCK_IN"
                            : "STOCK_OUT",

                    quantity:
                        Math.abs(difference),

                    previousStock:
                        oldProduct.stock,

                    newStock,

                    reference:
                        product.sku || null,

                    note:
                        "Stock manually adjusted"
                }
            });
        }

        res.json({
            success: true,
            message: "Product updated successfully",
            product
        });

    } catch (error) {

        console.error(
            "UPDATE PRODUCT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to update product",
            error: error.message
        });
    }
});


// ======================================================
// DELETE PRODUCT
// DELETE /api/products/:id
// ======================================================

router.delete("/:id", async (req, res) => {
    try {

        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        await prisma.product.delete({
            where: {
                id
            }
        });

        res.json({
            success: true,
            message: "Product deleted successfully"
        });

    } catch (error) {

        console.error(
            "DELETE PRODUCT ERROR:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to delete product",
            error: error.message
        });
    }
});

// ======================================================
// STOCK IN
// POST /api/products/:id/stock/in
// ======================================================

router.post("/:id/stock/in", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const quantity = Number(req.body.quantity);
        const note = req.body.note || "Stock received";

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive whole number"
            });
        }

        const product = await prisma.product.findUnique({
            where: { id }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const previousStock = product.stock;
        const newStock = previousStock + quantity;

        const result = await prisma.$transaction(async (tx) => {

            const updatedProduct = await tx.product.update({
                where: { id },
                data: {
                    stock: newStock
                }
            });

            await tx.inventoryTransaction.create({
                data: {
                    productId: id,
                    type: "STOCK_IN",
                    quantity,
                    previousStock,
                    newStock,
                    reference: product.sku || null,
                    note
                }
            });

            return updatedProduct;
        });

        return res.json({
            success: true,
            message: "Stock added successfully",
            product: result,
            inventory: {
                previousStock,
                quantityAdded: quantity,
                newStock
            }
        });

    } catch (error) {
        console.error("STOCK IN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to add stock",
            error: error.message
        });
    }
});

// ======================================================
// STOCK OUT
// POST /api/products/:id/stock/out
// ======================================================

router.post("/:id/stock/out", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const quantity = Number(req.body.quantity);
        const note = req.body.note || "Stock removed";

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive whole number"
            });
        }

        const product = await prisma.product.findUnique({
            where: { id }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        if (quantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Only ${product.stock} available.`
            });
        }

        const previousStock = product.stock;
        const newStock = previousStock - quantity;

        const result = await prisma.$transaction(async (tx) => {

            const updatedProduct = await tx.product.update({
                where: { id },
                data: {
                    stock: newStock
                }
            });

            await tx.inventoryTransaction.create({
                data: {
                    productId: id,
                    type: "STOCK_OUT",
                    quantity,
                    previousStock,
                    newStock,
                    reference: product.sku || null,
                    note
                }
            });

            return updatedProduct;
        });

        return res.json({
            success: true,
            message: "Stock removed successfully",
            product: result,
            inventory: {
                previousStock,
                quantityRemoved: quantity,
                newStock
            }
        });

    } catch (error) {
        console.error("STOCK OUT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to remove stock",
            error: error.message
        });
    }
});

// ======================================================
// STOCK ADJUSTMENT
// POST /api/products/:id/stock/adjust
// ======================================================

router.post("/:id/stock/adjust", async (req, res) => {
    try {
        const id = Number(req.params.id);
        const newStock = Number(req.body.newStock);
        const note = req.body.note || "Stock adjustment";

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        if (!Number.isInteger(newStock) || newStock < 0) {
            return res.status(400).json({
                success: false,
                message: "New stock must be zero or a positive whole number"
            });
        }

        const product = await prisma.product.findUnique({
            where: { id }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const previousStock = product.stock;

        if (newStock === previousStock) {
            return res.status(400).json({
                success: false,
                message: "New stock is the same as current stock"
            });
        }

        const difference = newStock - previousStock;

        const result = await prisma.$transaction(async (tx) => {

            const updatedProduct = await tx.product.update({
                where: { id },
                data: {
                    stock: newStock
                }
            });

            await tx.inventoryTransaction.create({
                data: {
                    productId: id,

                    type: "STOCK_ADJUSTMENT",

                    quantity: Math.abs(difference),

                    previousStock,

                    newStock,

                    reference: product.sku || null,

                    note
                }
            });

            return updatedProduct;
        });

        return res.json({
            success: true,
            message: "Stock adjusted successfully",
            product: result,
            inventory: {
                previousStock,
                newStock,
                difference
            }
        });

    } catch (error) {
        console.error("STOCK ADJUSTMENT ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to adjust stock",
            error: error.message
        });
    }
});

module.exports = router;