const express = require("express");
const prisma = require("../db");

const router = express.Router();

// ======================================================
// TEMPORARY IN-MEMORY CART STORAGE
// ======================================================

const carts = new Map();


// ======================================================
// CREATE CART
// POST /api/cart
// ======================================================

router.post("/", async (req, res) => {

    try {

        const cartId =
            `CART-${Date.now()}-${Math.floor(
                Math.random() * 10000
            )}`;

        carts.set(cartId, {
            cartId,
            items: [],
            createdAt: new Date()
        });

        return res.status(201).json({

            success: true,

            message:
                "Cart created successfully.",

            cart: carts.get(cartId)
        });

    } catch (error) {

        console.error(
            "CREATE CART ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to create cart.",

            error:
                error.message
        });
    }
});


// ======================================================
// GET CART
// GET /api/cart/:cartId
// ======================================================

router.get("/:cartId", async (req, res) => {

    try {

        const { cartId } = req.params;

        const cart = carts.get(cartId);

        if (!cart) {

            return res.status(404).json({

                success: false,

                message:
                    "Cart not found."
            });
        }

        // ------------------------------------------------
        // Refresh product information
        // ------------------------------------------------

        const updatedItems = [];

        for (const item of cart.items) {

            const product =
                await prisma.product.findUnique({

                    where: {
                        id: item.productId
                    }
                });

            if (!product) {
                continue;
            }

            updatedItems.push({

                productId:
                    product.id,

                name:
                    product.name,

                sku:
                    product.sku,

                quantity:
                    item.quantity,

                unitPrice:
                    Number(product.price),

                subtotal:
                    Number(product.price) *
                    item.quantity,

                availableStock:
                    product.stock,

                status:
                    product.status
            });
        }

        // ------------------------------------------------
        // Calculate totals
        // ------------------------------------------------

        const totalItems =
            updatedItems.reduce(

                (total, item) =>
                    total + item.quantity,

                0
            );

        const totalAmount =
            updatedItems.reduce(

                (total, item) =>
                    total + item.subtotal,

                0
            );

        return res.json({

            success: true,

            cart: {

                cartId,

                items:
                    updatedItems,

                totalItems,

                totalAmount
            }
        });

    } catch (error) {

        console.error(
            "GET CART ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to load cart.",

            error:
                error.message
        });
    }
});


// ======================================================
// ADD PRODUCT TO CART
// POST /api/cart/:cartId/items
// ======================================================

router.post("/:cartId/items", async (req, res) => {

    try {

        const { cartId } = req.params;

        const {
            productId,
            quantity
        } = req.body;

        const cart = carts.get(cartId);

        if (!cart) {

            return res.status(404).json({

                success: false,

                message:
                    "Cart not found."
            });
        }

        const id = Number(productId);
        const qty = Number(quantity);

        if (!Number.isInteger(id)) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid product ID."
            });
        }

        if (
            !Number.isInteger(qty) ||
            qty <= 0
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Quantity must be a positive whole number."
            });
        }

        // ------------------------------------------------
        // Find product
        // ------------------------------------------------

        const product =
            await prisma.product.findUnique({

                where: {
                    id
                }
            });

        if (!product) {

            return res.status(404).json({

                success: false,

                message:
                    "Product not found."
            });
        }

        // ------------------------------------------------
        // Check product status
        // ------------------------------------------------

        if (product.status !== "ACTIVE") {

            return res.status(400).json({

                success: false,

                message:
                    `${product.name} is currently unavailable.`
            });
        }

        // ------------------------------------------------
        // Check existing cart quantity
        // ------------------------------------------------

        const existingItem =
            cart.items.find(

                item =>
                    item.productId === id
            );

        const currentQuantity =
            existingItem
                ? existingItem.quantity
                : 0;

        const newQuantity =
            currentQuantity + qty;

        // ------------------------------------------------
        // Check stock
        // ------------------------------------------------

        if (
            newQuantity >
            product.stock
        ) {

            return res.status(400).json({

                success: false,

                message:
                    `${product.name} has insufficient stock.`,

                availableStock:
                    product.stock,

                requestedQuantity:
                    newQuantity
            });
        }

        // ------------------------------------------------
        // Update existing item
        // ------------------------------------------------

        if (existingItem) {

            existingItem.quantity =
                newQuantity;

        } else {

            cart.items.push({

                productId:
                    id,

                quantity:
                    qty
            });
        }

        return res.status(201).json({

            success: true,

            message:
                "Product added to cart.",

            cart
        });

    } catch (error) {

        console.error(
            "ADD TO CART ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to add product to cart.",

            error:
                error.message
        });
    }
});


// ======================================================
// UPDATE CART ITEM QUANTITY
// PATCH /api/cart/:cartId/items/:productId
// ======================================================

router.patch(
    "/:cartId/items/:productId",
    async (req, res) => {

        try {

            const {
                cartId,
                productId
            } = req.params;

            const {
                quantity
            } = req.body;

            const cart =
                carts.get(cartId);

            if (!cart) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Cart not found."
                });
            }

            const id =
                Number(productId);

            const qty =
                Number(quantity);

            if (
                !Number.isInteger(qty) ||
                qty <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Quantity must be a positive whole number."
                });
            }

            const item =
                cart.items.find(

                    item =>
                        item.productId === id
                );

            if (!item) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product is not in the cart."
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

                    message:
                        "Product not found."
                });
            }

            if (
                qty >
                product.stock
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        `${product.name} has insufficient stock.`,

                    availableStock:
                        product.stock
                });
            }

            item.quantity =
                qty;

            return res.json({

                success: true,

                message:
                    "Cart quantity updated.",

                cart
            });

        } catch (error) {

            console.error(
                "UPDATE CART ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to update cart.",

                error:
                    error.message
            });
        }
    }
);


// ======================================================
// REMOVE PRODUCT FROM CART
// DELETE /api/cart/:cartId/items/:productId
// ======================================================

router.delete(
    "/:cartId/items/:productId",
    async (req, res) => {

        try {

            const {
                cartId,
                productId
            } = req.params;

            const cart =
                carts.get(cartId);

            if (!cart) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Cart not found."
                });
            }

            const id =
                Number(productId);

            const originalLength =
                cart.items.length;

            cart.items =
                cart.items.filter(

                    item =>
                        item.productId !== id
                );

            if (
                cart.items.length ===
                originalLength
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Product is not in the cart."
                });
            }

            return res.json({

                success: true,

                message:
                    "Product removed from cart.",

                cart
            });

        } catch (error) {

            console.error(
                "REMOVE CART ITEM ERROR:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Failed to remove cart item.",

                error:
                    error.message
            });
        }
    }
);


// ======================================================
// CLEAR CART
// DELETE /api/cart/:cartId
// ======================================================

router.delete("/:cartId", async (req, res) => {

    try {

        const { cartId } = req.params;

        const cart =
            carts.get(cartId);

        if (!cart) {

            return res.status(404).json({

                success: false,

                message:
                    "Cart not found."
            });
        }

        cart.items = [];

        return res.json({

            success: true,

            message:
                "Cart cleared successfully.",

            cart
        });

    } catch (error) {

        console.error(
            "CLEAR CART ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to clear cart.",

            error:
                error.message
        });
    }
});

// ======================================================
// CHECKOUT CART
// POST /api/cart/:cartId/checkout
// ======================================================

router.post("/:cartId/checkout", async (req, res) => {

    try {

        const { cartId } = req.params;

        const {
            customerName,
            customerPhone,
            email,
            county,
            location
        } = req.body;

        // ------------------------------------------------
        // VALIDATE CUSTOMER
        // ------------------------------------------------

        if (!customerName || !customerPhone) {

            return res.status(400).json({
                success: false,
                message:
                    "Customer name and phone number are required."
            });
        }

        // ------------------------------------------------
        // FIND CART
        // ------------------------------------------------

        const cart = carts.get(cartId);

        if (!cart) {

            return res.status(404).json({
                success: false,
                message: "Cart not found."
            });
        }

        // ------------------------------------------------
        // CHECK CART
        // ------------------------------------------------

        if (!cart.items || cart.items.length === 0) {

            return res.status(400).json({
                success: false,
                message: "Cannot checkout an empty cart."
            });
        }

        // ------------------------------------------------
        // VALIDATE CART PRODUCTS
        // ------------------------------------------------

        let totalAmount = 0;

        const orderItems = [];

        for (const cartItem of cart.items) {

            const product =
                await prisma.product.findUnique({

                    where: {
                        id: Number(cartItem.productId)
                    }
                });

            if (!product) {

                return res.status(404).json({
                    success: false,
                    message:
                        `Product ${cartItem.productId} not found.`
                });
            }

            // ------------------------------------------------
            // PRODUCT STATUS
            // ------------------------------------------------

            if (product.status !== "ACTIVE") {

                return res.status(400).json({
                    success: false,
                    message:
                        `${product.name} is currently unavailable.`
                });
            }

            // ------------------------------------------------
            // STOCK
            // ------------------------------------------------

            const quantity =
                Number(cartItem.quantity);

            if (product.stock < quantity) {

                return res.status(400).json({
                    success: false,
                    message:
                        `${product.name} has insufficient stock. ` +
                        `Available: ${product.stock}`
                });
            }

            // ------------------------------------------------
            // PRICE
            // ------------------------------------------------

            const unitPrice =
                Number(product.price);

            const totalPrice =
                unitPrice * quantity;

            totalAmount += totalPrice;

            orderItems.push({

                productId:
                    product.id,

                quantity,

                unitPrice,

                totalPrice
            });
        }

        // ------------------------------------------------
        // FIND OR CREATE CUSTOMER
        // ------------------------------------------------

        const customer =
            await prisma.customer.upsert({

                where: {

                    phoneNumber:
                        customerPhone
                },

                update: {

                    fullName:
                        customerName,

                    email:
                        email || undefined
                },

                create: {

                    fullName:
                        customerName,

                    phoneNumber:
                        customerPhone,

                    email:
                        email || null
                }
            });

        // ------------------------------------------------
        // CREATE ORDER NUMBER
        // ------------------------------------------------

        const orderNumber =
            `ORD-${Date.now()}`;

        // ------------------------------------------------
        // CREATE ORDER
        // ------------------------------------------------

        const order =
            await prisma.order.create({

                data: {

                    orderNumber,

                    customerId:
                        customer.id,

                    totalAmount,

                    county:
                        county || null,

                    location:
                        location || null,

                    paymentStatus:
                        "PENDING",

                    orderStatus:
                        "PENDING",

                    orderitem: {

                        create:
                            orderItems
                    }
                },

                include: {

                    customer: true,

                    orderitem: {

                        include: {

                            product: true
                        }
                    }
                }
            });

        // ------------------------------------------------
        // CREATE PAYMENT
        // ------------------------------------------------

        const payment =
            await prisma.payment.create({

                data: {

                    amountPaid:
                        0,

                    phoneNumber:
                        customer.phoneNumber,

                    customerId:
                        customer.id,

                    orderId:
                        order.id,

                    status:
                        "PENDING",

                    paymentMethod:
                        "MPESA"
                }
            });

        // ------------------------------------------------
        // CLEAR CART
        // ------------------------------------------------

        carts.delete(cartId);

        // ------------------------------------------------
        // LOG
        // ------------------------------------------------

        console.log(
            "======================================"
        );

        console.log(
            "🛒 CART CHECKOUT SUCCESSFUL"
        );

        console.log(
            "Cart:",
            cartId
        );

        console.log(
            "Order:",
            order.orderNumber
        );

        console.log(
            "Total:",
            totalAmount
        );

        console.log(
            "Payment:",
            payment.id
        );

        console.log(
            "======================================"
        );

        // ------------------------------------------------
        // RESPONSE
        // ------------------------------------------------

        return res.status(201).json({

            success: true,

            message:
                "Cart checkout successful.",

            cartId,

            order: {

                id:
                    order.id,

                orderNumber:
                    order.orderNumber,

                customer:
                    order.customer,

                county:
                    order.county,

                location:
                    order.location,

                totalAmount:
                    order.totalAmount,

                paymentStatus:
                    order.paymentStatus,

                orderStatus:
                    order.orderStatus,

                items:
                    order.orderitem
            },

            payment: {

                id:
                    payment.id,

                status:
                    payment.status,

                amountPaid:
                    payment.amountPaid,

                paymentMethod:
                    payment.paymentMethod
            }
        });

    } catch (error) {

        console.error(
            "CART CHECKOUT ERROR:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to checkout cart.",

            error:
                error.message
        });
    }
});

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;