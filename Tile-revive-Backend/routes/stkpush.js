const express = require("express");
const axios = require("axios");
const prisma = require("../db");

const router = express.Router();

// ======================================================
// PAYMENT METHODS
// ======================================================

const MPESA_METHOD = "MPESA";
const COD_METHOD = "COD";

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
// MPESA OAUTH TOKEN
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
        .from(`${consumerKey}:${consumerSecret}`)
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
// FORMAT KENYAN PHONE
// ======================================================

function formatPhoneNumber(phoneNumber) {

    let phone = String(phoneNumber)
        .trim()
        .replace(/\D/g, "");

    if (phone.startsWith("0")) {
        phone = `254${phone.substring(1)}`;
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
// TIMESTAMP
// ======================================================

function generateTimestamp() {

    const date = new Date();

    return (
        date.getFullYear().toString() +
        String(date.getMonth() + 1).padStart(2, "0") +
        String(date.getDate()).padStart(2, "0") +
        String(date.getHours()).padStart(2, "0") +
        String(date.getMinutes()).padStart(2, "0") +
        String(date.getSeconds()).padStart(2, "0")
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
// GET ORDER
// ======================================================

async function getOrder(orderId) {

    const id = Number(orderId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error("Invalid orderId.");
    }

    const order =
        await prisma.order.findUnique({

            where: {
                id
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

    if (!order) {
        throw new Error("Order not found.");
    }

    return order;
}

// ======================================================
// GET EXISTING PAYMENT
// ======================================================

async function getOrderPayment(orderId) {

    const payment =
        await prisma.payment.findFirst({

            where: {
                orderId: Number(orderId)
            },

            orderBy: {
                id: "desc"
            }
        });

    if (!payment) {
        throw new Error(
            "No payment record exists for this order."
        );
    }

    return payment;
}

// ======================================================
// POST /api/stkpush
//
// CART FLOW:
//
// CART
// ↓
// CHECKOUT
// ↓
// ORDER CREATED
// ↓
// PAYMENT PENDING
// ↓
// /api/stkpush { orderId }
// ↓
// STK PUSH
// ↓
// CUSTOMER ENTERS MPESA PIN
// ↓
// MPESA CALLBACK
// ↓
// PAYMENT SUCCESS
// ↓
// STOCK REDUCTION
// ↓
// RECEIPT
// ↓
// EMAIL / WHATSAPP
//
// ======================================================

router.post(
    "/stkpush",
    async (req, res) => {

        try {

            const {
                orderId,
                customerPhone,
                paymentMethod
            } = req.body;

            // ==================================================
            // VALIDATE ORDER ID
            // ==================================================

            if (!orderId) {

                return res.status(400).json({

                    success: false,

                    message:
                        "orderId is required."
                });
            }

            const numericOrderId =
                Number(orderId);

            if (
                !Number.isInteger(
                    numericOrderId
                ) ||
                numericOrderId <= 0
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid orderId."
                });
            }

            // ==================================================
            // GET ORDER
            // ==================================================

            const order =
                await getOrder(
                    numericOrderId
                );

            // ==================================================
            // GET PAYMENT
            // ==================================================

            const payment =
                await getOrderPayment(
                    numericOrderId
                );

            // ==================================================
            // NORMALIZE PAYMENT METHOD
            // ==================================================

            const method =
                String(
                    paymentMethod ||
                    payment.paymentMethod ||
                    MPESA_METHOD
                )
                    .trim()
                    .toUpperCase();

            // ==================================================
            // VALIDATE PAYMENT METHOD
            // ==================================================

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
            // PREVENT PAYING ALREADY PAID ORDER
            // ==================================================

            if (
                order.paymentStatus === PAYMENT_SUCCESS ||
                payment.status === PAYMENT_SUCCESS
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "This order has already been paid."
                });
            }

            // ==================================================
            // FORMAT PHONE
            // ==================================================

            const phone =
                formatPhoneNumber(
                    customerPhone ||
                    order.customer?.phoneNumber
                );

            // ==================================================
            // TOTAL
            // ==================================================

            const totalAmount =
                Number(order.totalAmount);

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
            // COD
            // ==================================================

            if (
                method === COD_METHOD
            ) {

                const location =
                    order.location || "";

                if (
                    !isCodAllowed(
                        location
                    )
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Cash on Delivery is currently available only within Nairobi and Kiambu."
                    });
                }

                const updatedPayment =
                    await prisma.payment.update({

                        where: {
                            id: payment.id
                        },

                        data: {

                            paymentMethod:
                                COD_METHOD,

                            status:
                                PAYMENT_PENDING,

                            resultDescription:
                                "Cash on Delivery - payment pending",

                            phoneNumber:
                                phone
                        }
                    });

                await prisma.order.update({

                    where: {
                        id: order.id
                    },

                    data: {

                        paymentStatus:
                            PAYMENT_PENDING,

                        orderStatus:
                            ORDER_PENDING
                    }
                });

                return res.status(200).json({

                    success: true,

                    message:
                        "Cash on Delivery selected successfully.",

                    paymentMethod:
                        COD_METHOD,

                    paymentStatus:
                        PAYMENT_PENDING,

                    order: {

                        id:
                            order.id,

                        orderNumber:
                            order.orderNumber,

                        totalAmount,

                        customerName:
                            order.customer?.fullName,

                        customerPhone:
                            order.customer?.phoneNumber,

                        county:
                            order.county,

                        location:
                            order.location
                    },

                    payment: {

                        id:
                            updatedPayment.id,

                        status:
                            updatedPayment.status
                    }
                });
            }

            // ==================================================
            // MPESA CONFIGURATION
            // ==================================================

            const shortcode =
                process.env.MPESA_SHORTCODE;

            const passkey =
                process.env.MPESA_PASSKEY;

            const serverUrl =
                process.env.SERVER_URL;
                
            // ==================================================
            // VALIDATE MPESA CONFIGURATION
            // ==================================================

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
                            PAYMENT_FAILED,

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

            // ==================================================
            // SERVER URL
            // ==================================================

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
                            PAYMENT_FAILED,

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
            // BUILD CALLBACK URL
            // ==================================================

            const callbackUrl =
                `${serverUrl.replace(/\/$/, "")}/api/mpesa-callback`;

            console.log(
                "📡 M-Pesa Callback URL:",
                callbackUrl
            );

            // ==================================================
            // UPDATE PAYMENT PHONE
            // ==================================================

            await prisma.payment.update({

                where: {
                    id: payment.id
                },

                data: {

                    paymentMethod:
                        MPESA_METHOD,

                    phoneNumber:
                        phone,

                    status:
                        PAYMENT_PENDING
                }
            });

            // ==================================================
            // TIMESTAMP
            // ==================================================

            const timestamp =
                generateTimestamp();

            // ==================================================
            // PASSWORD
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
            // GET MPESA TOKEN
            // ==================================================

            const token =
                await getMpesaToken();

            // ==================================================
            // PRODUCT DESCRIPTION
            // ==================================================

            let transactionDescription =
                `Purchase ${order.orderNumber}`;

            if (
                order.orderitem &&
                order.orderitem.length > 0
            ) {

                const firstProduct =
                    order.orderitem[0]?.product?.name;

                if (firstProduct) {

                    transactionDescription =
                        `Purchase ${firstProduct}`;
                }
            }

            // ==================================================
            // SEND STK PUSH
            // ==================================================

            console.log(
                "======================================"
            );

            console.log(
                "📲 SENDING CART ORDER STK PUSH"
            );

            console.log(
                "Order ID:",
                order.id
            );

            console.log(
                "Order Number:",
                order.orderNumber
            );

            console.log(
                "Payment ID:",
                payment.id
            );

            console.log(
                "Phone:",
                phone
            );

            console.log(
                "Amount:",
                totalAmount
            );

            console.log(
                "Callback URL:",
                callbackUrl
            );

            console.log(
                "======================================"
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
                            callbackUrl,

                        AccountReference:
                            order.orderNumber,

                        TransactionDesc:
                            transactionDescription
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
            } = stkResponse.data || {};

            console.log(
                "M-Pesa Response:",
                stkResponse.data
            );

            // ==================================================
            // FAILED STK PUSH
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
                            PAYMENT_FAILED,

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

            if (!CheckoutRequestID) {

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
                            PAYMENT_FAILED,

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
            // SAVE STK DETAILS
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

                        paymentMethod:
                            MPESA_METHOD,

                        status:
                            PAYMENT_PENDING,

                        phoneNumber:
                            phone,

                        resultDescription:
                            ResponseDescription ||
                            "STK Push sent. Waiting for customer payment."
                    }
                });

            // ==================================================
            // SUCCESS RESPONSE
            // ==================================================

            console.log(
                "======================================"
            );

            console.log(
                "✅ STK PUSH SENT SUCCESSFULLY"
            );

            console.log(
                "Order:",
                order.orderNumber
            );

            console.log(
                "Payment:",
                updatedPayment.id
            );

            console.log(
                "CheckoutRequestID:",
                CheckoutRequestID
            );

            console.log(
                "======================================"
            );

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
                        order.customer?.fullName,

                    customerPhone:
                        order.customer?.phoneNumber,

                    totalAmount,

                    county:
                        order.county,

                    location:
                        order.location,

                    items:
                        order.orderitem
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
// EXPORT
// ======================================================

module.exports = router;