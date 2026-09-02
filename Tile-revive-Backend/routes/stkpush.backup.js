const express = require("express");
const axios = require("axios");
const prisma = require("../db");

const router = express.Router();

// ======================================================
// PAYMENT METHODS
// ======================================================

const MPESA_METHOD = "MPESA";
const COD_METHOD = "COD";

// ==================================================
// EXISTING ORDER / PAYMENT
// ==================================================

let order;
let payment;
let customer;
let product;
let requestedQuantity;
let unitPrice;
let totalAmount;

if (orderId) {
    const requestedOrderId = Number(orderId);

    if (!Number.isInteger(requestedOrderId) || requestedOrderId <= 0) {
        return res.status(400).json({
            success: false,
            message: "Invalid orderId."
        });
    }

    const existingOrder = await prisma.order.findUnique({
        where: {
            id: requestedOrderId
        },
        include: {
            customer: true,
            orderitem: {
                include: {
                    product: true
                }
            },
            payment: true
        }
    });

    if (!existingOrder) {
        return res.status(404).json({
            success: false,
            message: "Order not found."
        });
    }

    if (!existingOrder.orderitem || existingOrder.orderitem.length === 0) {
        return res.status(400).json({
            success: false,
            message: "Order has no products."
        });
    }

    if (existingOrder.orderStatus !== ORDER_PENDING) {
        return res.status(400).json({
            success: false,
            message: `Order is not pending. Current status: ${existingOrder.orderStatus}`
        });
    }

    const existingPayment = existingOrder.payment?.find(
        paymentRecord =>
            paymentRecord.paymentMethod === MPESA_METHOD &&
            paymentRecord.status === PAYMENT_PENDING
    );

    if (!existingPayment) {
        return res.status(400).json({
            success: false,
            message: "No pending M-PESA payment exists for this order."
        });
    }

    customer = existingOrder.customer;

    const orderItem = existingOrder.orderitem[0];

    product = orderItem.product;

    requestedQuantity = orderItem.quantity;

    unitPrice = Number(orderItem.unitPrice);

    totalAmount = Number(existingOrder.totalAmount);

    order = existingOrder;

    payment = existingPayment;

    // Make sure the phone belongs to the order/customer
    customerPhone = customer.phoneNumber;

    console.log("======================================");
    console.log("♻️ EXISTING ORDER");
    console.log("Order:", order.orderNumber);
    console.log("Payment ID:", payment.id);
    console.log("Amount:", totalAmount);
    console.log("======================================");
}

// ======================================================
// PAYMENT STATUSES
// ======================================================

const PAYMENT_PENDING = "PENDING";
const PAYMENT_SUCCESS = "SUCCESS";
const PAYMENT_FAILED = "FAILED";

// ======================================================
// ORDER STATUSES
// ======================================================

const ORDER_PENDING = "PENDING";
const ORDER_PAID = "PAID";
const ORDER_FAILED = "FAILED";
const ORDER_CANCELLED = "CANCELLED";
const ORDER_COMPLETED = "COMPLETED";

// ======================================================
// COD LOCATIONS
// ======================================================

const COD_ALLOWED_LOCATIONS = [
    "nairobi",
    "kiambu"
];

// ======================================================
// M-PESA OAUTH TOKEN
// ======================================================

async function getMpesaToken() {

    const consumerKey =
        process.env.MPESA_CONSUMER_KEY;

    const consumerSecret =
        process.env.MPESA_CONSUMER_SECRET;

    if (!consumerKey || !consumerSecret) {

        throw new Error(
            "MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET is missing."
        );
    }

    const auth = Buffer
        .from(
            `${consumerKey}:${consumerSecret}`
        )
        .toString("base64");

    const response = await axios.get(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        {
            headers: {
                Authorization: `Basic ${auth}`
            }
        }
    );

    if (!response.data?.access_token) {

        throw new Error(
            "Safaricom did not return an OAuth access token."
        );
    }

    return response.data.access_token;
}

// ======================================================
// FORMAT KENYAN PHONE NUMBER
// ======================================================

function formatPhoneNumber(phoneNumber) {

    let phone = String(phoneNumber)
        .trim()
        .replace(/\D/g, "");

    if (phone.startsWith("0")) {

        phone =
            `254${phone.substring(1)}`;
    }

    if (
        phone.startsWith("254") &&
        phone.length === 12
    ) {

        return phone;
    }

    throw new Error(
        "Invalid Kenyan phone number. Use 07XXXXXXXX or 2547XXXXXXXX."
    );
}

// ======================================================
// GENERATE M-PESA TIMESTAMP
// ======================================================

function generateTimestamp() {

    const date = new Date();

    return (
        date.getFullYear().toString() +

        String(
            date.getMonth() + 1
        ).padStart(2, "0") +

        String(
            date.getDate()
        ).padStart(2, "0") +

        String(
            date.getHours()
        ).padStart(2, "0") +

        String(
            date.getMinutes()
        ).padStart(2, "0") +

        String(
            date.getSeconds()
        ).padStart(2, "0")
    );
}

// ======================================================
// NORMALIZE LOCATION
// ======================================================

function normalizeLocation(location) {

    if (!location) {
        return "";
    }

    return String(location)
        .trim()
        .toLowerCase();
}

// ======================================================
// CHECK COD LOCATION
// ======================================================

function isCodAllowed(location) {

    const normalized =
        normalizeLocation(location);

    return COD_ALLOWED_LOCATIONS.some(
        allowed =>
            normalized === allowed ||
            normalized.includes(allowed)
    );
}

// ======================================================
// FIND OR CREATE CUSTOMER
// ======================================================

async function findOrCreateCustomer({
    customerName,
    customerPhone,
    email
}) {

    return prisma.customer.upsert({

        where: {
            phoneNumber: customerPhone
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
}

// ======================================================
// FIND PRODUCT
// ======================================================

async function getProduct(
    productId,
    quantity
) {

    const product =
        await prisma.product.findUnique({

            where: {
                id: productId
            }
        });

    if (!product) {

        throw new Error(
            "Product not found."
        );
    }

    // ==================================================
    // PRODUCT STATUS
    // ==================================================

    if (
        product.status &&
        String(product.status).toUpperCase() !== "ACTIVE"
    ) {

        throw new Error(
            "This product is currently unavailable."
        );
    }

    // ==================================================
    // STOCK
    // ==================================================

    if (product.stock < quantity) {

        throw new Error(
            `Insufficient stock. Only ${product.stock} available.`
        );
    }

    return product;
}

// ======================================================
// CREATE ORDER + PENDING PAYMENT
// ======================================================

async function createOrderAndPayment({

    customer,
    product,
    quantity,
    unitPrice,
    totalAmount,
    paymentMethod

}) {

    const orderNumber =
        `ORD-${Date.now()}`;

    // ==================================================
    // CREATE ORDER
    // ==================================================

    const order =
        await prisma.order.create({

            data: {

                orderNumber,

                customerId:
                    customer.id,

                totalAmount,

                paymentStatus:
                    "PENDING",

                orderStatus:
                    ORDER_PENDING,

                orderitem: {

                    create: {

                        productId:
                            product.id,

                        quantity,

                        unitPrice,

                        totalPrice:
                            totalAmount
                    }
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

    // ==================================================
    // CREATE PENDING PAYMENT
    // ==================================================

    const payment =
        await prisma.payment.create({

            data: {

                merchantRequestId:
                    null,

                checkoutRequestId:
                    null,

                amountPaid:
                    0,

                phoneNumber:
                    customer.phoneNumber,

                accountReference:
                    order.orderNumber,

                resultCode:
                    null,

                resultDescription:

                    paymentMethod === COD_METHOD
                        ? "Cash on Delivery - payment pending"
                        : "Waiting for M-Pesa payment",

                paymentMethod:
                    paymentMethod,

                status:
                    PAYMENT_PENDING,

                customerId:
                    customer.id,

                orderId:
                    order.id
            }
        });

    return {
        order,
        payment
    };
}

// ======================================================
// POST /api/stkpush
//
// MPESA:
// ORDER -> PAYMENT PENDING -> STK PUSH
//
// COD:
// ORDER -> PAYMENT PENDING
// ======================================================

router.post(
    "/stkpush",
    async (req, res) => {

        try {

            const {

                orderId
                customerName,
                customerPhone,
                email,
                productId,
                quantity,
                paymentMethod,
                location

            } = req.body;

            // ==================================================
            // VALIDATE REQUIRED FIELDS
            // ==================================================

            if (
                !customerName ||
                !customerPhone ||
                !productId ||
                !quantity ||
                !paymentMethod
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "customerName, customerPhone, productId, quantity and paymentMethod are required."
                });
            }

            // ==================================================
            // NORMALIZE PAYMENT METHOD
            // ==================================================

            const method =
                String(paymentMethod)
                    .trim()
                    .toUpperCase();

            if (
                method !== MPESA_METHOD &&
                method !== COD_METHOD
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid payment method. Use MPESA or COD."
                });
            }

            // ==================================================
            // VALIDATE QUANTITY
            // ==================================================

            const requestedQuantity =
                Number(quantity);

            if (
                !Number.isInteger(
                    requestedQuantity
                ) ||
                requestedQuantity <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Quantity must be a positive whole number."
                });
            }

            // ==================================================
            // VALIDATE PRODUCT ID
            // ==================================================

            const requestedProductId =
                Number(productId);

            if (
                !Number.isInteger(
                    requestedProductId
                ) ||
                requestedProductId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid productId."
                });
            }

            // ==================================================
            // FORMAT PHONE
            // ==================================================

            const phone =
                formatPhoneNumber(
                    customerPhone
                );

            // ==================================================
            // COD LOCATION VALIDATION
            // ==================================================

            if (
                method === COD_METHOD &&
                !isCodAllowed(location)
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Cash on Delivery is currently available only within Nairobi and Kiambu."
                });
            }

            // ==================================================
            // GET PRODUCT
            // ==================================================

            const product =
                await getProduct(
                    requestedProductId,
                    requestedQuantity
                );

            // ==================================================
            // CALCULATE PRICE
            // ==================================================

            const unitPrice =
                product.discountPrice !== null &&
                product.discountPrice !== undefined

                    ? Number(product.discountPrice)

                    : Number(product.price);

            const totalAmount =
                unitPrice *
                requestedQuantity;

            if (
                !Number.isFinite(
                    totalAmount
                ) ||
                totalAmount <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid order amount."
                });
            }

            // ==================================================
            // FIND / CREATE CUSTOMER
            // ==================================================

            const customer =
                await findOrCreateCustomer({

                    customerName,

                    customerPhone:
                        phone,

                    email
                });

            // ==================================================
            // CREATE ORDER + PAYMENT
            // ==================================================

            const {
                order,
                payment
            } =
                await createOrderAndPayment({

                    customer,

                    product,

                    quantity:
                        requestedQuantity,

                    unitPrice,

                    totalAmount,

                    paymentMethod:
                        method
                });

            console.log(
                "======================================"
            );

            console.log(
                "🛒 ORDER CREATED"
            );

            console.log(
                "Order:",
                order.orderNumber
            );

            console.log(
                "Payment ID:",
                payment.id
            );

            console.log(
                "Method:",
                method
            );

            console.log(
                "Amount:",
                totalAmount
            );

            console.log(
                "======================================"
            );

            // ==================================================
            // COD
            //
            // DO NOT SEND STK PUSH
            // ==================================================

            if (
                method === COD_METHOD
            ) {

                console.log(
                    "💵 COD ORDER"
                );

                return res.status(200).json({

                    success: true,

                    message:
                        "Order created successfully. Cash on Delivery selected.",

                    paymentMethod:
                        COD_METHOD,

                    paymentStatus:
                        PAYMENT_PENDING,

                    order: {

                        id:
                            order.id,

                        orderNumber:
                            order.orderNumber,

                        customerName:
                            customer.fullName,

                        product:
                            product.name,

                        productId:
                            product.id,

                        quantity:
                            requestedQuantity,

                        unitPrice,

                        totalAmount,

                        location:
                            location || null
                    },

                    payment: {

                        id:
                            payment.id,

                        status:
                            payment.status,

                        method:
                            payment.paymentMethod
                    }
                });
            }

            // ==================================================
            // M-PESA CONFIGURATION
            // ==================================================

            const shortcode =
                process.env.MPESA_SHORTCODE;

            const passkey =
                process.env.MPESA_PASSKEY;

            const serverUrl =
                process.env.SERVER_URL;

            if (
                !shortcode ||
                !passkey
            ) {

                await prisma.payment.update({

                    where: {
                        id: payment.id
                    },

                    data: {

                        status:
                            PAYMENT_FAILED,

                        resultDescription:
                            "M-Pesa shortcode or passkey is missing."
                    }
                });

                await prisma.order.update({

                    where: {
                        id: order.id
                    },

                    data: {

                        paymentStatus:
                            "FAILED",

                        orderStatus:
                            ORDER_CANCELLED
                    }
                });

                return res.status(500).json({

                    success: false,

                    message:
                        "M-Pesa shortcode or passkey is missing."
                });
            }

            if (!serverUrl) {

                await prisma.payment.update({

                    where: {
                        id: payment.id
                    },

                    data: {

                        status:
                            PAYMENT_FAILED,

                        resultDescription:
                            "SERVER_URL is missing."
                    }
                });

                await prisma.order.update({

                    where: {
                        id: order.id
                    },

                    data: {

                        paymentStatus:
                            "FAILED",

                        orderStatus:
                            ORDER_CANCELLED
                    }
                });

                return res.status(500).json({

                    success: false,

                    message:
                        "SERVER_URL is missing from .env."
                });
            }

            // ==================================================
            // TIMESTAMP
            // ==================================================

            const timestamp =
                generateTimestamp();

            // ==================================================
            // STK PASSWORD
            // ==================================================

            const password =
                Buffer
                    .from(
                        shortcode +
                        passkey +
                        timestamp
                    )
                    .toString("base64");

            // ==================================================
            // GET OAUTH TOKEN
            // ==================================================

            const token =
                await getMpesaToken();

            // ==================================================
            // SEND STK PUSH
            // ==================================================

            console.log(
                "📲 Sending STK Push..."
            );

            const stkResponse =
                await axios.post(

                    "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",

                    {

                        BusinessShortCode:
                            shortcode,

                        Password:
                            password,

                        Timestamp:
                            timestamp,

                        TransactionType:
                            "CustomerPayBillOnline",

                        Amount:
                            Math.round(
                                totalAmount
                            ),

                        PartyA:
                            phone,

                        PartyB:
                            shortcode,

                        PhoneNumber:
                            phone,

                        CallBackURL:
                            `${serverUrl}/api/mpesa-callback`,

                        AccountReference:
                            order.orderNumber,

                        TransactionDesc:
                            `Purchase ${product.name}`
                    },

                    {

                        headers: {

                            Authorization:
                                `Bearer ${token}`,

                            "Content-Type":
                                "application/json"
                        }
                    }
                );

            // ==================================================
            // SAFARICOM RESPONSE
            // ==================================================

            const {

                MerchantRequestID,
                CheckoutRequestID,
                ResponseCode,
                ResponseDescription,
                CustomerMessage

            } =
                stkResponse.data || {};

            console.log(
                "M-Pesa Response:",
                stkResponse.data
            );

            // ==================================================
            // STK REQUEST FAILED
            // ==================================================

            if (
                ResponseCode !== "0"
            ) {

                await prisma.payment.update({

                    where: {
                        id: payment.id
                    },

                    data: {

                        status:
                            PAYMENT_FAILED,

                        resultDescription:
                            ResponseDescription ||
                            "STK Push failed."
                    }
                });

                await prisma.order.update({

                    where: {
                        id: order.id
                    },

                    data: {

                        paymentStatus:
                            "FAILED",

                        orderStatus:
                            ORDER_CANCELLED
                    }
                });

                return res.status(400).json({

                    success: false,

                    message:
                        ResponseDescription ||
                        "STK Push failed.",

                    orderNumber:
                        order.orderNumber
                });
            }

            // ==================================================
            // CHECK CHECKOUT REQUEST ID
            // ==================================================

            if (
                !CheckoutRequestID
            ) {

                await prisma.payment.update({

                    where: {
                        id: payment.id
                    },

                    data: {

                        status:
                            PAYMENT_FAILED,

                        resultDescription:
                            "Safaricom did not return CheckoutRequestID."
                    }
                });

                await prisma.order.update({

                    where: {
                        id: order.id
                    },

                    data: {

                        paymentStatus:
                            "FAILED",

                        orderStatus:
                            ORDER_CANCELLED
                    }
                });

                return res.status(500).json({

                    success: false,

                    message:
                        "Safaricom did not return a CheckoutRequestID."
                });
            }

            // ==================================================
            // UPDATE PENDING PAYMENT
            //
            // THIS LINKS THE STK PUSH TO THE PAYMENT
            // ==================================================

            const updatedPayment =
                await prisma.payment.update({

                    where: {
                        id: payment.id
                    },

                    data: {

                        merchantRequestId:
                            MerchantRequestID || null,

                        checkoutRequestId:
                            CheckoutRequestID,

                        status:
                            PAYMENT_PENDING,

                        resultDescription:
                            ResponseDescription ||
                            "STK Push sent. Waiting for customer payment."
                    }
                });

            console.log(
                "======================================"
            );

            console.log(
                "✅ STK PUSH SENT"
            );

            console.log(
                "Order:",
                order.orderNumber
            );

            console.log(
                "Payment ID:",
                updatedPayment.id
            );

            console.log(
                "CheckoutRequestID:",
                CheckoutRequestID
            );

            console.log(
                "======================================"
            );

            // ==================================================
            // RESPONSE
            // ==================================================

            return res.status(200).json({

                success: true,

                message:
                    "STK Push sent successfully. Waiting for customer payment.",

                paymentMethod:
                    MPESA_METHOD,

                paymentStatus:
                    PAYMENT_PENDING,

                order: {

                    id:
                        order.id,

                    orderNumber:
                        order.orderNumber,

                    customerName:
                        customer.fullName,

                    product:
                        product.name,

                    productId:
                        product.id,

                    quantity:
                        requestedQuantity,

                    unitPrice,

                    totalAmount
                },

                payment: {

                    id:
                        updatedPayment.id,

                    status:
                        updatedPayment.status,

                    merchantRequestId:
                        updatedPayment.merchantRequestId,

                    checkoutRequestId:
                        updatedPayment.checkoutRequestId
                },

                mpesa: {

                    responseDescription:
                        ResponseDescription,

                    customerMessage:
                        CustomerMessage
                }
            });

        } catch (error) {

            console.error(
                "======================================"
            );

            console.error(
                "❌ STK PUSH ERROR"
            );

            console.error(
                error.response?.data ||
                error.message
            );

            console.error(
                "======================================"
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to process payment.",

                error:
                    error.response?.data ||
                    error.message
            });
        }
    }
);

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;