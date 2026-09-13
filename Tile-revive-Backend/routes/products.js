const express = require("express");
const router = express.Router();
const prisma = require("..\/db");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

// ======================================================
// PRODUCT IMAGE UPLOAD CONFIGURATION
// ======================================================

const productUploadDirectory = path.join(
    process.cwd(),
    "uploads",
    "products"
);

if (!fs.existsSync(productUploadDirectory)) {
    fs.mkdirSync(productUploadDirectory, {
        recursive: true
    });
}

const productImageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, productUploadDirectory);
    },

    filename: function (req, file, cb) {
        const extension =
            path.extname(file.originalname).toLowerCase();

        const safeName =
            path
                .basename(
                    file.originalname,
                    extension
                )
                .replace(/[^a-zA-Z0-9-_]/g, "-")
                .replace(/-+/g, "-")
                .toLowerCase();

        const uniqueName =
            `${safeName}-${Date.now()}${extension}`;

        cb(null, uniqueName);
    }
});

const uploadProductImage = multer({
    storage: productImageStorage,

    limits: {
        fileSize: 5 * 1024 * 1024
    },

    fileFilter: function (req, file, cb) {
        const allowedTypes = [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
        ];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(
                new Error(
                    "Only JPG, JPEG, PNG and WEBP images are allowed."
                )
            );
        }

        cb(null, true);
    }
});



// ======================================================
// PRODUCT IMAGE GALLERY HELPERS
// ======================================================

const MAX_PRODUCT_IMAGES = 10;

function isLocalProductGalleryImage(image) {
    if (!image || typeof image !== "string") return false;

    return image.startsWith("/uploads/products/");
}

function deleteLocalProductGalleryImage(image) {
    if (!isLocalProductGalleryImage(image)) return;

    try {
        const filename = path.basename(image);

        const filePath = path.join(
            process.cwd(),
            "uploads",
            "products",
            filename
        );

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.warn(
            "Unable to delete gallery image:",
            error.message
        );
    }
}

function normaliseProductImages(product) {
    const gallery = Array.isArray(product.productimage)
        ? product.productimage
            .sort((a, b) => {
                if (a.sortOrder !== b.sortOrder) {
                    return a.sortOrder - b.sortOrder;
                }

                return a.id - b.id;
            })
            .map((item) => ({
                id: item.id,
                image: item.image,
                sortOrder: item.sortOrder,
                createdAt: item.createdAt
            }))
        : [];

    return {
        ...product,
        images: [
            ...(product.image
                ? [{
                    id: "primary",
                    image: product.image,
                    sortOrder: 1,
                    primary: true
                }]
                : []),
            ...gallery.map((item) => ({
                ...item,
                primary: false
            }))
        ].slice(0, MAX_PRODUCT_IMAGES)
    };
}

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

        console.log("==============================================");
        console.log("UPDATE PRODUCT REQUEST");
        console.log("Product ID:", id);
        console.log("Request body:", req.body);

        const oldProduct = await prisma.product.findUnique({
            where: { id }
        });

        if (!oldProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const body = req.body || {};

        const productData = {};

        if (body.name !== undefined) {
            productData.name = String(body.name).trim();
        }

        if (body.description !== undefined) {
            productData.description = body.description;
        }

        if (body.shortDescription !== undefined) {
            productData.shortDescription = body.shortDescription;
        }

        if (body.sku !== undefined) {
            productData.sku = body.sku === "" ? null : body.sku;
        }

        if (body.barcode !== undefined) {
            productData.barcode = body.barcode === "" ? null : body.barcode;
        }

        if (body.price !== undefined) {
            productData.price = Number(body.price);
        }

        if (body.costPrice !== undefined) {
            productData.costPrice =
                body.costPrice === null || body.costPrice === ""
                    ? null
                    : Number(body.costPrice);
        }

        if (body.discountPrice !== undefined) {
            productData.discountPrice =
                body.discountPrice === null || body.discountPrice === ""
                    ? null
                    : Number(body.discountPrice);
        }

        if (body.stock !== undefined) {
            productData.stock = Number(body.stock);
        }

        if (body.minimumStock !== undefined) {
            productData.minimumStock = Number(body.minimumStock);
        }

        if (body.category !== undefined) {
            productData.category =
                body.category === "" ? null : body.category;
        }

        if (body.brand !== undefined) {
            productData.brand =
                body.brand === "" ? null : body.brand;
        }

        if (body.featured !== undefined) {
            productData.featured = Boolean(body.featured);
        }

        if (body.status !== undefined) {
            productData.status = body.status;
        }

        console.log("Prisma update data:", productData);

        const newStock =
            productData.stock !== undefined
                ? productData.stock
                : oldProduct.stock;

        const product = await prisma.$transaction(async (tx) => {

            const updatedProduct = await tx.product.update({
                where: { id },
                data: productData
            });

            if (newStock !== oldProduct.stock) {

                const difference =
                    newStock - oldProduct.stock;

                await tx.inventoryTransaction.create({
                    data: {
                        productId: id,

                        type:
                            difference > 0
                                ? "STOCK_IN"
                                : "STOCK_OUT",

                        quantity: Math.abs(difference),

                        previousStock: oldProduct.stock,

                        newStock,

                        reference:
                            updatedProduct.sku || null,

                        note:
                            "Stock manually adjusted"
                    }
                });
            }

            return updatedProduct;
        });

        console.log(
            "PRODUCT UPDATE SUCCESS:",
            product.id
        );

        return res.json({
            success: true,
            message: "Product updated successfully",
            product
        });

    } catch (error) {

        console.error("==============================================");
        console.error("UPDATE PRODUCT ERROR");
        console.error("Name:", error.name);
        console.error("Message:", error.message);
        console.error("Code:", error.code);
        console.error("Meta:", error.meta);
        console.error("Stack:", error.stack);
        console.error("==============================================");

        return res.status(500).json({
            success: false,
            message: "Failed to update product",
            error: error.message,
            code: error.code || null
        });
    }
});
// ======================================================

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

/* ============================================================
   PRODUCT IMAGE MANAGEMENT
   ============================================================ */

function isLocalProductImage(image) {
    if (!image || typeof image !== "string") {
        return false;
    }

    return image.startsWith("/uploads/products/");
}

function deleteLocalProductImage(image) {
    if (!isLocalProductImage(image)) {
        return;
    }

    const filename = path.basename(image);

    const filePath = path.join(
        process.cwd(),
        "uploads",
        "products",
        filename
    );

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (error) {
        console.error(
            "PRODUCT IMAGE DELETE ERROR:",
            error
        );
    }
}


/* ============================================================
   UPLOAD / REPLACE PRODUCT IMAGE
   POST /api/products/:id/image
   ============================================================ */

router.post(
    "/:id/image",
    uploadProductImage.single("image"),
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID."
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Please select a product image."
                });
            }

            const existingProduct =
                await prisma.product.findUnique({
                    where: { id }
                });

            if (!existingProduct) {
                deleteLocalProductImage(
                    `/uploads/products/${req.file.filename}`
                );

                return res.status(404).json({
                    success: false,
                    message: "Product not found."
                });
            }

            const newImage =
                `/uploads/products/${req.file.filename}`;

            const product =
                await prisma.product.update({
                    where: { id },
                    data: {
                        image: newImage
                    }
                });

            deleteLocalProductImage(
                existingProduct.image
            );

            return res.json({
                success: true,
                message: "Product image updated successfully.",
                product
            });

        } catch (error) {
            console.error(
                "PRODUCT IMAGE UPLOAD ERROR:",
                error
            );

            if (req.file) {
                deleteLocalProductImage(
                    `/uploads/products/${req.file.filename}`
                );
            }

            return res.status(500).json({
                success: false,
                message: "Failed to upload product image.",
                error: error.message
            });
        }
    }
);


/* ============================================================
   REMOVE PRODUCT IMAGE
   DELETE /api/products/:id/image
   ============================================================ */

router.delete(
    "/:id/image",
    async (req, res) => {
        try {
            const id = Number(req.params.id);

            if (!Number.isInteger(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID."
                });
            }

            const existingProduct =
                await prisma.product.findUnique({
                    where: { id }
                });

            if (!existingProduct) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found."
                });
            }

            const product =
                await prisma.product.update({
                    where: { id },
                    data: {
                        image: null
                    }
                });

            deleteLocalProductImage(
                existingProduct.image
            );

            return res.json({
                success: true,
                message: "Product image removed successfully.",
                product
            });

        } catch (error) {
            console.error(
                "PRODUCT IMAGE REMOVE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to remove product image."
            });
        }
    }
);









// ======================================================
// PRODUCT GALLERY IMAGE MANAGEMENT
// ======================================================

// POST /api/products/:id/images
// Upload or replace one of the 10 image slots.
// Slot 1 = primary image.
// Slots 2-10 = productimage gallery records.

router.post(
    "/:id/images",
    uploadProductImage.single("image"),
    async (req, res) => {

        try {
            const id = Number(req.params.id);
            const slot = Number(req.body.slot || 1);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product ID."
                });
            }

            if (!Number.isInteger(slot) || slot < 1 || slot > 10) {
                if (req.file) {
                    deleteLocalProductGalleryImage(
                        `/uploads/products/${req.file.filename}`
                    );
                }

                return res.status(400).json({
                    success: false,
                    message: "Image slot must be between 1 and 10."
                });
            }

            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Please select an image."
                });
            }

            const product = await prisma.product.findUnique({
                where: {
                    id
                }
            });

            if (!product) {
                deleteLocalProductGalleryImage(
                    `/uploads/products/${req.file.filename}`
                );

                return res.status(404).json({
                    success: false,
                    message: "Product not found."
                });
            }

            const newImage =
                `/uploads/products/${req.file.filename}`;

            // ==================================================
            // SLOT 1 = PRIMARY PRODUCT IMAGE
            // ==================================================

            if (slot === 1) {

                const oldImage = product.image;

                await prisma.product.update({
                    where: {
                        id
                    },
                    data: {
                        image: newImage
                    }
                });

                if (
                    oldImage &&
                    oldImage !== newImage
                ) {
                    deleteLocalProductGalleryImage(oldImage);
                }

                return res.json({
                    success: true,
                    message: "Primary product image updated.",
                    slot: 1,
                    image: newImage
                });
            }

            // ==================================================
            // SLOTS 2-10 = GALLERY
            // ==================================================

            const existing =
                await prisma.productimage.findFirst({
                    where: {
                        productId: id,
                        sortOrder: slot
                    }
                });

            if (existing) {

                await prisma.productimage.update({
                    where: {
                        id: existing.id
                    },
                    data: {
                        image: newImage
                    }
                });

                deleteLocalProductGalleryImage(
                    existing.image
                );

                return res.json({
                    success: true,
                    message: `Product image slot ${slot} updated.`,
                    slot,
                    image: newImage,
                    id: existing.id
                });
            }

            const totalGalleryImages =
                await prisma.productimage.count({
                    where: {
                        productId: id
                    }
                });

            if (totalGalleryImages >= 9) {
                deleteLocalProductGalleryImage(newImage);

                return res.status(400).json({
                    success: false,
                    message: "A product can have a maximum of 10 images."
                });
            }

            const created =
                await prisma.productimage.create({
                    data: {
                        productId: id,
                        image: newImage,
                        sortOrder: slot
                    }
                });

            return res.status(201).json({
                success: true,
                message: `Product image slot ${slot} added.`,
                slot,
                image: newImage,
                id: created.id
            });

        } catch (error) {

            if (req.file) {
                deleteLocalProductGalleryImage(
                    `/uploads/products/${req.file.filename}`
                );
            }

            console.error(
                "PRODUCT GALLERY UPLOAD ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to upload product image.",
                error: error.message
            });
        }
    }
);


// DELETE /api/products/:id/images/:slot

router.delete(
    "/:id/images/:slot",
    async (req, res) => {

        try {

            const id = Number(req.params.id);
            const slot = Number(req.params.slot);

            if (
                !Number.isInteger(id) ||
                !Number.isInteger(slot) ||
                slot < 1 ||
                slot > 10
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid product image slot."
                });
            }

            const product =
                await prisma.product.findUnique({
                    where: {
                        id
                    }
                });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found."
                });
            }

            // ==================================================
            // PRIMARY IMAGE
            // ==================================================

            if (slot === 1) {

                const oldImage = product.image;

                await prisma.product.update({
                    where: {
                        id
                    },
                    data: {
                        image: null
                    }
                });

                deleteLocalProductGalleryImage(
                    oldImage
                );

                return res.json({
                    success: true,
                    message: "Primary product image removed."
                });
            }

            // ==================================================
            // GALLERY IMAGE
            // ==================================================

            const galleryImage =
                await prisma.productimage.findFirst({
                    where: {
                        productId: id,
                        sortOrder: slot
                    }
                });

            if (!galleryImage) {
                return res.status(404).json({
                    success: false,
                    message: "Image slot is empty."
                });
            }

            await prisma.productimage.delete({
                where: {
                    id: galleryImage.id
                }
            });

            deleteLocalProductGalleryImage(
                galleryImage.image
            );

            return res.json({
                success: true,
                message: `Product image slot ${slot} removed.`
            });

        } catch (error) {

            console.error(
                "PRODUCT GALLERY DELETE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to remove product image.",
                error: error.message
            });
        }
    }
);


// GET /api/products/:id/images

router.get(
    "/:id/images",
    async (req, res) => {

        try {

            const id = Number(req.params.id);

            const product =
                await prisma.product.findUnique({
                    where: {
                        id
                    },
                    include: {
                        productimage: {
                            orderBy: [
                                {
                                    sortOrder: "asc"
                                },
                                {
                                    id: "asc"
                                }
                            ]
                        }
                    }
                });

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: "Product not found."
                });
            }

            const result =
                normaliseProductImages(product);

            return res.json({
                success: true,
                images: result.images
            });

        } catch (error) {

            console.error(
                "GET PRODUCT IMAGES ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to load product images.",
                error: error.message
            });
        }
    }
);


