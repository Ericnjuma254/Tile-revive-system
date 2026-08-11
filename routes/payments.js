const express = require("express");
const router = express.Router();
const prisma = require("../db");

// ======================================================
// PAYMENT METHODS
// ======================================================

const ALLOWED_PAYMENT_METHODS = [
    "MPESA",
    "KCB",
    "COD"
];

const ALLOWED_STATUSES = [
    "PENDING",
    "SUCCESS",
    "FAILED",
    "RECONCILED"
];

// ======================================================
// HELPER
// CREATE CASH-IN FOR SUCCESSFUL PAYMENT
// DUPLICATE SAFE
// ======================================================

async function createCashInForPayment(payment) {

    // Only successful/reconciled payments create cash-in
    if (
        payment.status !== "SUCCESS" &&
        payment.status !== "RECONCILED"
    ) {
        return null;
    }

    // Check whether this payment already has
    // a cash transaction
    const existingCashTransaction =
        await prisma.cashTransaction.findFirst({
            where: {
                paymentId: payment.id,
                type: "CASH_IN"
            }
        });

    // Prevent duplicate cash entries
    if (existingCashTransaction) {
        return existingCashTransaction;
    }

    const reference =
        payment.paymentMethod === "KCB"
            ? payment.kcbPaymentCode
            : payment.paymentMethod === "MPESA"
                ? payment.mpesaReceiptNumber
                : `COD-${payment.id}`;

    return await prisma.cashTransaction.create({
        data: {
            type: "CASH_IN",

            category: payment.paymentMethod,

            amount: payment.amountPaid,

            reference: reference || null,

            description:
                `${payment.paymentMethod} payment received`,

            paymentId: payment.id
        }
    });
}


// ======================================================
// GET ALL PAYMENTS
// GET /api/payments
// ======================================================

router.get("/", async (req, res) => {

    try {

        const {
            paymentMethod,
            status,
            reconciled
        } = req.query;

        const where = {};

        // Payment method filter
        if (paymentMethod) {

            const method =
                paymentMethod.toUpperCase();

            if (
                !ALLOWED_PAYMENT_METHODS.includes(method)
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid payment method. Use MPESA, KCB or COD."
                });
            }

            where.paymentMethod = method;
        }

        // Status filter
        if (status) {

            const paymentStatus =
                status.toUpperCase();

            if (
                !ALLOWED_STATUSES.includes(
                    paymentStatus
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid payment status."
                });
            }

            where.status = paymentStatus;
        }

        // Reconciliation filter
        if (reconciled !== undefined) {

            where.reconciled =
                reconciled === "true";
        }

        const payments =
            await prisma.payment.findMany({

                where,

                include: {
                    customer: true,
                    order: true,
                    cashTransaction: true
                },

                orderBy: {
                    createdAt: "desc"
                }
            });

        return res.json({
            success: true,
            count: payments.length,
            payments
        });

    } catch (error) {

        console.error(
            "GET PAYMENTS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch payments.",
            error: error.message
        });
    }
});


// ======================================================
// CREATE MANUAL PAYMENT
// POST /api/payments/manual
// ======================================================

router.post("/manual", async (req, res) => {

    try {

        const {
            amountPaid,
            paymentMethod,
            phoneNumber,
            kcbPaymentCode,
            customerId,
            orderId,
            accountReference,
            note
        } = req.body;

        // ----------------------------------------------
        // VALIDATE AMOUNT
        // ----------------------------------------------

        const amount = Number(amountPaid);

        if (
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "amountPaid must be greater than 0."
            });
        }

        // ----------------------------------------------
        // VALIDATE PAYMENT METHOD
        // ----------------------------------------------

        if (!paymentMethod) {

            return res.status(400).json({
                success: false,
                message:
                    "paymentMethod is required."
            });
        }

        const method =
            paymentMethod.toUpperCase();

        if (
            !ALLOWED_PAYMENT_METHODS.includes(method)
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Payment method must be MPESA, KCB or COD."
            });
        }

        // ----------------------------------------------
        // KCB PAYMENT CODE
        // ----------------------------------------------

        if (
            method === "KCB" &&
            !kcbPaymentCode
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "KCB payment code is required for KCB payments."
            });
        }

        // ----------------------------------------------
        // VERIFY CUSTOMER
        // ----------------------------------------------

        if (
            customerId !== undefined &&
            customerId !== null
        ) {

            const customer =
                await prisma.customer.findUnique({
                    where: {
                        id: Number(customerId)
                    }
                });

            if (!customer) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Customer not found."
                });
            }
        }

        // ----------------------------------------------
        // VERIFY ORDER
        // ----------------------------------------------

        let order = null;

        if (
            orderId !== undefined &&
            orderId !== null
        ) {

            order =
                await prisma.order.findUnique({
                    where: {
                        id: Number(orderId)
                    }
                });

            if (!order) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Order not found."
                });
            }
        }

        // ----------------------------------------------
        // CREATE PAYMENT
        // ----------------------------------------------

        const payment =
            await prisma.payment.create({

                data: {

                    amountPaid: amount,

                    paymentMethod: method,

                    status:
                        method === "COD"
                            ? "PENDING"
                            : "SUCCESS",

                    phoneNumber:
                        phoneNumber || null,

                    kcbPaymentCode:
                        method === "KCB"
                            ? kcbPaymentCode
                            : null,

                    accountReference:
                        accountReference || null,

                    customerId:
                        customerId !== undefined &&
                        customerId !== null
                            ? Number(customerId)
                            : null,

                    orderId:
                        orderId !== undefined &&
                        orderId !== null
                            ? Number(orderId)
                            : null,

                    reconciliationNote:
                        note || null
                },

                include: {
                    customer: true,
                    order: true
                }
            });

        // ----------------------------------------------
        // CREATE CASH-IN
        // ----------------------------------------------

        const cashTransaction =
            await createCashInForPayment(
                payment
            );

        // ----------------------------------------------
        // UPDATE ORDER PAYMENT STATUS
        // ----------------------------------------------

        if (order) {

            let newPaymentStatus;

            if (method === "COD") {

                newPaymentStatus = "Pending";

            } else {

                newPaymentStatus = "Paid";
            }

            await prisma.order.update({

                where: {
                    id: order.id
                },

                data: {
                    paymentStatus:
                        newPaymentStatus
                }
            });
        }

        return res.status(201).json({

            success: true,

            message:
                "Payment recorded successfully.",

            payment,

            cashTransaction
        });

    } catch (error) {

        console.error(
            "CREATE MANUAL PAYMENT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to create payment.",
            error: error.message
        });
    }
});


// ======================================================
// RECONCILE PAYMENT
// PUT /api/payments/:id/reconcile
// ======================================================

router.put("/:id/reconcile", async (req, res) => {

    try {

        const id =
            Number(req.params.id);

        const {
            note
        } = req.body;

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid payment ID."
            });
        }

        const payment =
            await prisma.payment.findUnique({
                where: {
                    id
                }
            });

        if (!payment) {

            return res.status(404).json({
                success: false,
                message:
                    "Payment not found."
            });
        }

        if (payment.reconciled) {

            return res.status(400).json({
                success: false,
                message:
                    "Payment is already reconciled."
            });
        }

        // ----------------------------------------------
        // UPDATE PAYMENT
        // ----------------------------------------------

        const updatedPayment =
            await prisma.payment.update({

                where: {
                    id
                },

                data: {

                    reconciled: true,

                    reconciledAt:
                        new Date(),

                    reconciliationNote:
                        note ||
                        payment.reconciliationNote,

                    status:
                        "RECONCILED"
                }
            });

        // ----------------------------------------------
        // MAKE SURE CASH-IN EXISTS
        // ----------------------------------------------

        const cashTransaction =
            await createCashInForPayment(
                updatedPayment
            );

        return res.json({

            success: true,

            message:
                "Payment reconciled successfully.",

            payment:
                updatedPayment,

            cashTransaction
        });

    } catch (error) {

        console.error(
            "RECONCILE PAYMENT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to reconcile payment.",
            error: error.message
        });
    }
});


// ======================================================
// GET RECONCILIATION
// GET /api/payments/reconciliation
// ======================================================

router.get("/reconciliation", async (req, res) => {

    try {

        const payments =
            await prisma.payment.findMany({

                where: {
                    reconciled: false,

                    status: {
                        in: [
                            "SUCCESS",
                            "RECONCILED"
                        ]
                    }
                },

                include: {
                    customer: true,
                    order: true,
                    cashTransaction: true
                },

                orderBy: {
                    createdAt: "desc"
                }
            });

        return res.json({

            success: true,

            count:
                payments.length,

            payments
        });

    } catch (error) {

        console.error(
            "RECONCILIATION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch reconciliation records.",
            error: error.message
        });
    }
});


// ======================================================
// PAYMENT SUMMARY
// GET /api/payments/summary
// ======================================================

router.get("/summary", async (req, res) => {

    try {

        const totalPayments =
            await prisma.payment.count();

        const successfulPayments =
            await prisma.payment.count({
                where: {
                    status: "SUCCESS"
                }
            });

        const pendingPayments =
            await prisma.payment.count({
                where: {
                    status: "PENDING"
                }
            });

        const failedPayments =
            await prisma.payment.count({
                where: {
                    status: "FAILED"
                }
            });

        const reconciledPayments =
            await prisma.payment.count({
                where: {
                    reconciled: true
                }
            });

        const unreconciledPayments =
            await prisma.payment.count({
                where: {

                    reconciled: false,

                    status: {
                        in: [
                            "SUCCESS",
                            "RECONCILED"
                        ]
                    }
                }
            });

        const totalCashIn =
            await prisma.payment.aggregate({

                _sum: {
                    amountPaid: true
                },

                where: {

                    status: {
                        in: [
                            "SUCCESS",
                            "RECONCILED"
                        ]
                    }
                }
            });

        return res.json({

            success: true,

            summary: {

                totalPayments,

                successfulPayments,

                pendingPayments,

                failedPayments,

                reconciledPayments,

                unreconciledPayments,

                totalCashIn:
                    totalCashIn._sum.amountPaid || 0
            }
        });

    } catch (error) {

        console.error(
            "PAYMENT SUMMARY ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch payment summary.",
            error: error.message
        });
    }
});


// ======================================================
// GET SINGLE PAYMENT
// GET /api/payments/:id
// ======================================================

router.get("/:id", async (req, res) => {

    try {

        const id =
            Number(req.params.id);

        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    "Invalid payment ID."
            });
        }

        const payment =
            await prisma.payment.findUnique({

                where: {
                    id
                },

                include: {

                    customer: true,

                    order: true,

                    cashTransaction: true
                }
            });

        if (!payment) {

            return res.status(404).json({
                success: false,
                message:
                    "Payment not found."
            });
        }

        return res.json({

            success: true,

            payment
        });

    } catch (error) {

        console.error(
            "GET PAYMENT ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to fetch payment.",
            error: error.message
        });
    }
});


// ======================================================
// EXPORT
// ======================================================

module.exports = router;