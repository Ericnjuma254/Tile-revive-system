const express = require("express");
const prisma = require("../db");

const {
    authenticateToken,
    requireAdmin,
} = require("../middleware/auth");

const router = express.Router();

// ======================================================
// GET PENDING USERS
// GET /api/admin/users/pending
// ADMIN ONLY
// ======================================================

router.get(
    "/users/pending",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const users = await prisma.user.findMany({
                where: {
                    role: "USER",
                    emailVerified: true,
                    adminApproved: false,
                },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                    emailVerified: true,
                    adminApproved: true,
                    createdAt: true,
                },
                orderBy: {
                    createdAt: "asc",
                },
            });

            return res.json({
                success: true,
                count: users.length,
                users,
            });
        } catch (error) {
            console.error("GET PENDING USERS ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to load pending users",
            });
        }
    }
);

// ======================================================
// APPROVE USER
// PATCH /api/admin/users/:id/approve
// ADMIN ONLY
// ======================================================

router.patch(
    "/users/:id/approve",
    authenticateToken,
    requireAdmin,
    async (req, res) => {
        try {
            const userId = Number(req.params.id);

            if (!Number.isInteger(userId)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID",
                });
            }

            const user = await prisma.user.findUnique({
                where: {
                    id: userId,
                },
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }

            if (user.role === "ADMIN") {
                return res.status(400).json({
                    success: false,
                    message: "Admin accounts do not require approval",
                });
            }

            if (!user.emailVerified) {
                return res.status(400).json({
                    success: false,
                    message: "User must verify their email first",
                });
            }

            if (user.adminApproved) {
                return res.status(400).json({
                    success: false,
                    message: "User is already approved",
                });
            }

            const approvedUser = await prisma.user.update({
                where: {
                    id: userId,
                },
                data: {
                    adminApproved: true,
                    approvedAt: new Date(),
                },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                    emailVerified: true,
                    adminApproved: true,
                    approvedAt: true,
                },
            });

            return res.json({
                success: true,
                message: "User approved successfully",
                user: approvedUser,
            });

        } catch (error) {
            console.error("APPROVE USER ERROR:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to approve user",
            });
        }
    }
);

module.exports = router;