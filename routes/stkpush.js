const express = require("express");
const axios = require("axios");
const prisma = require("../db");

const router = express.Router();

// =========================================
// Generate M-Pesa OAuth Token
// =========================================
async function getMpesaToken() {
    const auth = Buffer.from(
        `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
    ).toString("base64");

    const response = await axios.get(
        "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        {
            headers: {
                Authorization: `Basic ${auth}`
            }
        }
    );

    return response.data.access_token;
}

// =========================================
// Format Kenyan Phone Number
// =========================================
function formatPhoneNumber(phoneNumber) {
    let phone = String(phoneNumber).replace(/\D/g, "");

    if (phone.startsWith("0")) {
        phone = `254${phone.substring(1)}`;
    }

    if (phone.startsWith("+254")) {
        phone = phone.substring(1);
    }

    if (!phone.startsWith("254")) {
        throw new Error("Invalid Kenyan phone number");
    }

    return phone;
}

// =========================================
// Generate M-Pesa Timestamp
// =========================================
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

// =========================================
// POST /api/stkpush
// =========================================
router.post("/stkpush", async (req, res) => {
    try {
        const {
            customerName,
            customerPhone,
            email,
            productId,
            quantity
        } = req.body;

        // =====================================
        // Validate request
        // =====================================
        if (!customerName || !customerPhone || !productId || !quantity) {
            return res.status(400).json({
                success: false,
                message:
                    "customerName, customerPhone, productId and quantity are required."
            });
        }

        const requestedQuantity = Number(quantity);
        const requestedProductId = Number(productId);

        if (
            !Number.isInteger(requestedQuantity) ||
            requestedQuantity <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a positive whole number."
            });
        }

        if (
            !Number.isInteger(requestedProductId) ||
            requestedProductId <= 0
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid productId."
            });
        }

        // =====================================
        // Format phone
        // =====================================
        const phone = formatPhoneNumber(customerPhone);

        // =====================================
        // Find Product
        // =====================================
        const product = await prisma.product.findUnique({
            where: {
                id: requestedProductId
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        // =====================================
        // Check Product Status
        // =====================================
        if (product.status !== "ACTIVE") {
            return res.status(400).json({
                success: false,
                message: "This product is currently unavailable."
            });
        }

        // =====================================
        // Check Stock
        // =====================================
        if (product.stock < requestedQuantity) {
            return res.status(400).json({
                success: false,
                message: `Insufficient stock. Only ${product.stock} available.`
            });
        }

        // =====================================
        // Calculate Total
        // =====================================
        const unitPrice =
            product.discountPrice !== null &&
            product.discountPrice !== undefined
                ? Number(product.discountPrice)
                : Number(product.price);

        const totalAmount = unitPrice * requestedQuantity;

        // =====================================
        // Find or Create Customer
        // =====================================
        const customer = await prisma.customer.upsert({
            where: {
                phoneNumber: phone
            },
            update: {
                fullName: customerName,
                email: email || undefined
            },
            create: {
                fullName: customerName,
                phoneNumber: phone,
                email: email || null
            }
        });

        // =====================================
        // Generate Order Number
        // =====================================
        const orderNumber = `ORD-${Date.now()}`;

        // =====================================
        // Create Order
        // =====================================
        const order = await prisma.order.create({
            data: {
                orderNumber,
                customerId: customer.id,
                totalAmount,
                paymentStatus: "Pending",
                orderStatus: "Pending",

                items: {
                    create: {
                        productId: product.id,
                        quantity: requestedQuantity,
                        unitPrice,
                        totalPrice: totalAmount
                    }
                }
            },

            include: {
                customer: true,
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });

        console.log("====================================");
        console.log("ORDER CREATED");
        console.log("Order:", order.orderNumber);
        console.log("Product:", product.name);
        console.log("Quantity:", requestedQuantity);
        console.log("Total:", totalAmount);
        console.log("====================================");

        // =====================================
        // M-Pesa Timestamp
        // =====================================
        const timestamp = generateTimestamp();

        const shortcode = process.env.MPESA_SHORTCODE;
        const passkey = process.env.MPESA_PASSKEY;

        if (!shortcode || !passkey) {
            return res.status(500).json({
                success: false,
                message: "M-Pesa shortcode or passkey is missing."
            });
        }

        // =====================================
        // Generate Password
        // =====================================
        const password = Buffer.from(
            shortcode + passkey + timestamp
        ).toString("base64");

        // =====================================
        // Get OAuth Token
        // =====================================
        const token = await getMpesaToken();

        // =====================================
        // STK Push
        // =====================================
        const stkResponse = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",

            {
                BusinessShortCode: shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: "CustomerPayBillOnline",

                Amount: Math.round(totalAmount),

                PartyA: phone,
                PartyB: shortcode,
                PhoneNumber: phone,

                CallBackURL:
                    `${process.env.SERVER_URL}/api/mpesa-callback`,

                AccountReference: order.orderNumber,

                TransactionDesc:
                    `Purchase ${product.name}`
            },

            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        // =====================================
        // Get Safaricom Response
        // =====================================
        const {
            MerchantRequestID,
            CheckoutRequestID,
            ResponseCode,
            ResponseDescription,
            CustomerMessage
        } = stkResponse.data;

        // =====================================
        // Check STK Response
        // =====================================
        if (ResponseCode !== "0") {
            await prisma.order.update({
                where: {
                    id: order.id
                },
                data: {
                    paymentStatus: "Failed",
                    orderStatus: "Cancelled"
                }
            });

            return res.status(400).json({
                success: false,
                message: ResponseDescription || "STK Push failed.",
                orderNumber: order.orderNumber
            });
        }

        // =====================================
        // Create Pending Payment
        // =====================================
        await prisma.payment.create({
            data: {
                merchantRequestId: MerchantRequestID,
                checkoutRequestId: CheckoutRequestID,

                amountPaid: 0,

                phoneNumber: phone,

                accountReference: order.orderNumber,

                resultCode: null,

                resultDescription: ResponseDescription,

                paymentMethod: "M-PESA",

                status: "Pending",

                customerId: customer.id,

                orderId: order.id
            }
        });

        // =====================================
        // Return Response
        // =====================================
        return res.status(200).json({
            success: true,

            message: "STK Push sent successfully.",

            order: {
                id: order.id,
                orderNumber: order.orderNumber,
                customerName: customer.fullName,
                product: product.name,
                productId: product.id,
                quantity: requestedQuantity,
                unitPrice,
                totalAmount
            },

            mpesa: {
                merchantRequestId: MerchantRequestID,
                checkoutRequestId: CheckoutRequestID,
                responseDescription: ResponseDescription,
                customerMessage: CustomerMessage
            }
        });

    } catch (error) {
        console.error(
            "STK PUSH ERROR:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to process STK Push.",
            error:
                error.response?.data ||
                error.message
        });
    }
});

module.exports = router;