const express = require("express");
const prisma = require("../db");

const router = express.Router();

// =====================================================
// TILE REVIVE C2B PAYBILL CONFIGURATION
// =====================================================

const PAYBILL_NUMBER = "522533";
const ACCOUNT_NUMBER = "7927213";

// =====================================================
// PHONE NUMBER NORMALIZATION
// =====================================================

function getPhoneVariants(phone) {
    if (!phone) {
        return [];
    }

    const cleaned = String(phone)
        .replace(/\s+/g, "")
        .replace(/-/g, "");

    const variants = new Set();

    variants.add(cleaned);

    // 254712345678 -> 0712345678
    if (cleaned.startsWith("254") && cleaned.length === 12) {
        variants.add(`0${cleaned.slice(3)}`);
        variants.add(`+${cleaned}`);
    }

    // +254712345678 -> 0712345678
    if (cleaned.startsWith("+254") && cleaned.length === 13) {
        variants.add(`0${cleaned.slice(4)}`);
        variants.add(cleaned.slice(1));
    }

    // 0712345678 -> 254712345678
    if (cleaned.startsWith("0") && cleaned.length === 10) {
        variants.add(`254${cleaned.slice(1)}`);
        variants.add(`+254${cleaned.slice(1)}`);
    }

    return [...variants];
}

// =====================================================
// HEALTH CHECK
// GET /api/c2b
// =====================================================

router.get("/", (req, res) => {
    res.json({
        success: true,
        service: "Tile Revive C2B PayBill",
        paybill: PAYBILL_NUMBER,
        accountNumber: ACCOUNT_NUMBER
    });
});

// =====================================================
// VALIDATION URL
// POST /api/c2b/validation
// =====================================================

router.post("/validation", async (req, res) => {
    console.log("");
    console.log("======================================");
    console.log("📥 C2B VALIDATION");
    console.log("======================================");
    console.log("C2B request received.");
    console.log("======================================");

    return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted"
    });
});

// =====================================================
// CONFIRMATION URL
// POST /api/c2b/confirmation
// =====================================================

router.post("/confirmation", async (req, res) => {
    try {
        console.log("");
        console.log("======================================");
        console.log("💰 C2B PAYMENT CONFIRMATION");
        console.log("======================================");

        console.log("C2B confirmation received.");



        console.log("======================================");

        const {
            TransID: transactionId,
            TransAmount,
            BillRefNumber,
            MSISDN,
            FirstName,
            MiddleName,
            LastName
        } = req.body;

        const amount = Number(TransAmount);

        const accountReference =
            String(BillRefNumber || "").trim();

        const phoneNumber = MSISDN
            ? String(MSISDN).trim()
            : null;

        const customerName =
            `${FirstName || ""} ${MiddleName || ""} ${LastName || ""}`
                .replace(/\s+/g, " ")
                .trim();

        console.log("Transaction ID:", transactionId);
        console.log("Amount:", amount);
        console.log("Account:", accountReference);
        console.log("Phone:", phoneNumber);
        console.log("Customer:", customerName);

        // =================================================
        // BASIC VALIDATION
        // =================================================

        if (!transactionId) {
            console.error("❌ Missing TransID");

            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: "Accepted"
            });
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            console.error("❌ Invalid payment amount");

            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: "Accepted"
            });
        }

        // =================================================
        // VERIFY PAYBILL ACCOUNT
        // =================================================

        if (accountReference !== ACCOUNT_NUMBER) {
            console.error("❌ INVALID PAYBILL ACCOUNT");
            console.error("Expected:", ACCOUNT_NUMBER);
            console.error("Received:", accountReference);

            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: "Accepted"
            });
        }

        // =================================================
        // DUPLICATE TRANSACTION PROTECTION
        // =================================================

        const existingPayment =
            await prisma.payment.findFirst({
                where: {
                    mpesaReceiptNumber: transactionId
                }
            });

        if (existingPayment) {
            console.log(
                "⚠️ DUPLICATE C2B TRANSACTION"
            );

            console.log(
                "Payment ID:",
                existingPayment.id
            );

            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: "Accepted"
            });
        }

        // =================================================
        // NORMALIZE PHONE NUMBER
        // =================================================

        const phoneVariants =
            getPhoneVariants(phoneNumber);

        console.log(
            "Phone variants:",
            phoneVariants
        );

        // =================================================
        // FIND CUSTOMER
        // =================================================

        let customer = null;

        if (phoneVariants.length > 0) {
            customer =
                await prisma.customer.findFirst({
                    where: {
                        OR: phoneVariants.map(
                            (phone) => ({
                                phoneNumber: phone
                            })
                        )
                    }
                });
        }

        if (customer) {
            console.log(
                "👤 MATCHED CUSTOMER:",
                customer.fullName
            );

            console.log(
                "Customer ID:",
                customer.id
            );
        } else {
            console.log(
                "⚠️ CUSTOMER NOT FOUND BY PHONE"
            );
        }

        // =================================================
        // FIND PENDING PAYMENT
        // =================================================

        let payment = null;

        if (customer) {
            payment =
                await prisma.payment.findFirst({
                    where: {
                        customerId: customer.id,
                        status: "PENDING",
                        paymentMethod: "MPESA"
                    },
                    include: {
                        order: {
                            include: {
                                customer: true,
                                orderitem: {
                                    include: {
                                        product: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        createdAt: "desc"
                    }
                });
        }

        // =================================================
        // NO MATCHING ORDER
        // =================================================

        if (!payment || !payment.order) {
            console.error(
                "❌ NO PENDING ORDER FOUND FOR C2B PAYMENT"
            );

            console.error(
                "Account received:",
                accountReference
            );

            console.error(
                "Amount received:",
                amount
            );

            console.error(
                "Phone received:",
                phoneNumber
            );

            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: "Accepted"
            });
        }

        const order = payment.order;

        console.log(
            "🛒 MATCHED ORDER:",
            order.orderNumber
        );

        console.log(
            "Expected amount:",
            order.totalAmount
        );

        // =================================================
        // VERIFY PAYMENT AMOUNT
        // =================================================

        const expectedAmount =
            Number(order.totalAmount);

        if (
            Math.round(amount) !==
            Math.round(expectedAmount)
        ) {
            console.error(
                "❌ PAYMENT AMOUNT DOES NOT MATCH ORDER"
            );

            console.error(
                "Expected:",
                expectedAmount
            );

            console.error(
                "Received:",
                amount
            );

            await prisma.payment.update({
                where: {
                    id: payment.id
                },
                data: {
                    amountPaid: amount,
                    mpesaReceiptNumber: transactionId,
                    phoneNumber: phoneNumber,
                    accountReference: accountReference,
                    resultDescription:
                        "C2B payment amount does not match order total.",
                    status: "FAILED"
                }
            });

            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: "Accepted"
            });
        }

        // =================================================
        // CHECK ORDER STATUS
        // =================================================

        if (
            String(order.paymentStatus)
                .toUpperCase() === "PAID"
        ) {
            console.log(
                "⚠️ ORDER ALREADY PAID"
            );

            return res.status(200).json({
                ResultCode: 0,
                ResultDesc: "Accepted"
            });
        }

        // =================================================
        // MARK PAYMENT SUCCESS
        // =================================================

        await prisma.payment.update({
            where: {
                id: payment.id
            },
            data: {
                amountPaid: amount,
                mpesaReceiptNumber: transactionId,
                phoneNumber: phoneNumber,
                accountReference: accountReference,
                resultCode: 0,
                resultDescription:
                    "C2B PayBill payment received successfully.",
                status: "SUCCESS"
            }
        });

        // =================================================
        // MARK ORDER PAID
        // =================================================

        await prisma.order.update({
            where: {
                id: order.id
            },
            data: {
                paymentStatus: "PAID",
                orderStatus: "PROCESSING"
            }
        });

        console.log(
            "======================================"
        );

        console.log(
            "✅ PAYMENT MARKED SUCCESS"
        );

        console.log(
            "Order:",
            order.orderNumber
        );

        console.log(
            "Amount:",
            amount
        );

        console.log(
            "M-Pesa Receipt:",
            transactionId
        );

        console.log(
            "PayBill:",
            PAYBILL_NUMBER
        );

        console.log(
            "Account:",
            ACCOUNT_NUMBER
        );

        console.log(
            "======================================");

        return res.status(200).json({
            ResultCode: 0,
            ResultDesc: "Success"
        });

    } catch (error) {
        console.error("");
        console.error(
            "======================================"
        );

        console.error(
            "❌ C2B CONFIRMATION ERROR"
        );

        console.error(error);

        console.error(
            "======================================"
        );

        // Always acknowledge Safaricom.
        return res.status(200).json({
            ResultCode: 0,
            ResultDesc: "Accepted"
        });
    }
});

module.exports = router;


