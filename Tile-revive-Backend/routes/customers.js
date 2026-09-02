const express = require("express");
const prisma = require("../db");

const router = express.Router();

// ======================================================
// CREATE CUSTOMER
// POST /api/customers
// ======================================================

router.post("/", async (req, res) => {
    try {
        const {
            fullName,
            phoneNumber,
            email
        } = req.body;

        if (!fullName || !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "Full name and phone number are required."
            });
        }

        const phone = phoneNumber.trim();

        const existingCustomer = await prisma.customer.findUnique({
            where: {
                phoneNumber: phone
            }
        });

        if (existingCustomer) {
            return res.status(409).json({
                success: false,
                message: "A customer with this phone number already exists.",
                customer: existingCustomer
            });
        }

        const customer = await prisma.customer.create({
            data: {
                fullName: fullName.trim(),
                phoneNumber: phone,
                email: email?.trim() || null
            }
        });

        return res.status(201).json({
            success: true,
            message: "Customer created successfully.",
            customer
        });

    } catch (error) {
        console.error("CREATE CUSTOMER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create customer.",
            error: error.message
        });
    }
});

// ======================================================
// GET ALL CUSTOMERS
// GET /api/customers
// ======================================================

router.get("/", async (req, res) => {
    try {
        const customers = await prisma.customer.findMany({
            include: {
                order: {
                    orderBy: {
                        createdAt: "desc"
                    },
                    select: {
                        id: true,
                        orderNumber: true,
                        totalAmount: true,
                        paymentStatus: true,
                        orderStatus: true,
                        createdAt: true
                    }
                },

                payment: {
                    where: {
                        status: "SUCCESS"
                    },
                    select: {
                        id: true,
                        amountPaid: true,
                        status: true,
                        createdAt: true
                    }
                }
            },

            orderBy: {
                createdAt: "desc"
            }
        });

        const customerList = customers.map((customer) => {

            const totalOrders = customer.order.length;

            const totalSpent = customer.payment.reduce(
                (total, payment) =>
                    total + Number(payment.amountPaid || 0),
                0
            );

            const lastOrder =
                customer.order.length > 0
                    ? customer.order[0]
                    : null;

            return {
                id: customer.id,
                fullName: customer.fullName,
                phoneNumber: customer.phoneNumber,
                email: customer.email,

                totalOrders,
                totalSpent,

                lastOrder: lastOrder
                    ? {
                        id: lastOrder.id,
                        orderNumber: lastOrder.orderNumber,
                        totalAmount: lastOrder.totalAmount,
                        paymentStatus: lastOrder.paymentStatus,
                        orderStatus: lastOrder.orderStatus,
                        createdAt: lastOrder.createdAt
                    }
                    : null,

                createdAt: customer.createdAt,
                updatedAt: customer.updatedAt
            };
        });

        return res.json({
            success: true,
            count: customerList.length,
            customers: customerList
        });

    } catch (error) {
        console.error("GET CUSTOMERS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch customers.",
            error: error.message
        });
    }
});

// ======================================================
// SEARCH CUSTOMERS
// GET /api/customers/search?q=
// ======================================================

router.get("/search", async (req, res) => {
    try {
        const { q } = req.query;

        if (!q || !q.trim()) {
            return res.status(400).json({
                success: false,
                message: "Search query is required."
            });
        }

        const search = q.trim();

        const customers = await prisma.customer.findMany({
            where: {
                OR: [
                    {
                        fullName: {
                            contains: search
                        }
                    },
                    {
                        phoneNumber: {
                            contains: search
                        }
                    },
                    {
                        email: {
                            contains: search
                        }
                    }
                ]
            },

            orderBy: {
                createdAt: "desc"
            }
        });

        return res.json({
            success: true,
            count: customers.length,
            customers
        });

    } catch (error) {
        console.error("SEARCH CUSTOMERS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to search customers.",
            error: error.message
        });
    }
});

// ======================================================
// GET CUSTOMER BY PHONE
// GET /api/customers/phone/:phone
// ======================================================

router.get("/phone/:phone", async (req, res) => {
    try {
        const { phone } = req.params;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: "Customer phone number is required."
            });
        }

        const customer = await prisma.customer.findUnique({
            where: {
                phoneNumber: phone
            },

            include: {
                order: {
                    include: {
                        orderitem: {
                            include: {
                                product: true
                            }
                        },

                        payment: true
                    },

                    orderBy: {
                        createdAt: "desc"
                    }
                },

                payment: true,

                productreview: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found."
            });
        }

        const totalSpent = customer.payment
            .filter((payment) => payment.status === "SUCCESS")
            .reduce(
                (total, payment) =>
                    total + Number(payment.amountPaid || 0),
                0
            );

        return res.json({
            success: true,

            customer: {
                ...customer,
                totalOrders: customer.order.length,
                totalSpent
            }
        });

    } catch (error) {
        console.error("GET CUSTOMER BY PHONE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch customer.",
            error: error.message
        });
    }
});

// ======================================================
// GET SINGLE CUSTOMER
// GET /api/customers/:id
// ======================================================

router.get("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid customer ID."
            });
        }

        const customer = await prisma.customer.findUnique({
            where: {
                id
            },

            include: {
                order: {
                    include: {
                        orderitem: {
                            include: {
                                product: true
                            }
                        },

                        payment: true
                    },

                    orderBy: {
                        createdAt: "desc"
                    }
                },

                payment: true,

                productreview: {
                    include: {
                        product: true
                    }
                }
            }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found."
            });
        }

        const totalSpent = customer.payment
            .filter((payment) => payment.status === "SUCCESS")
            .reduce(
                (total, payment) =>
                    total + Number(payment.amountPaid || 0),
                0
            );

        return res.json({
            success: true,

            customer: {
                ...customer,
                totalOrders: customer.order.length,
                totalSpent
            }
        });

    } catch (error) {
        console.error("GET CUSTOMER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch customer.",
            error: error.message
        });
    }
});

// ======================================================
// UPDATE CUSTOMER
// PUT /api/customers/:id
// ======================================================

router.put("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid customer ID."
            });
        }

        const {
            fullName,
            phoneNumber,
            email
        } = req.body;

        if (!fullName || !phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "Full name and phone number are required."
            });
        }

        const existingCustomer = await prisma.customer.findFirst({
            where: {
                phoneNumber: phoneNumber.trim(),
                NOT: {
                    id
                }
            }
        });

        if (existingCustomer) {
            return res.status(409).json({
                success: false,
                message: "Another customer already uses this phone number."
            });
        }

        const customer = await prisma.customer.update({
            where: {
                id
            },

            data: {
                fullName: fullName.trim(),
                phoneNumber: phoneNumber.trim(),
                email: email?.trim() || null
            }
        });

        return res.json({
            success: true,
            message: "Customer updated successfully.",
            customer
        });

    } catch (error) {
        console.error("UPDATE CUSTOMER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update customer.",
            error: error.message
        });
    }
});

// ======================================================
// DELETE CUSTOMER
// DELETE /api/customers/:id
// ======================================================

router.delete("/:id", async (req, res) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid customer ID."
            });
        }

        const customer = await prisma.customer.findUnique({
            where: {
                id
            },

            include: {
                order: true,
                payment: true,
                productreview: true
            }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found."
            });
        }

        if (
            customer.order.length > 0 ||
            customer.payment.length > 0 ||
            customer.productreview.length > 0
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Customer cannot be deleted because they have existing orders, payments, or reviews."
            });
        }

        await prisma.customer.delete({
            where: {
                id
            }
        });

        return res.json({
            success: true,
            message: "Customer deleted successfully."
        });

    } catch (error) {
        console.error("DELETE CUSTOMER ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete customer.",
            error: error.message
        });
    }
});

// ======================================================
// EXPORT ROUTER
// ======================================================

module.exports = router;