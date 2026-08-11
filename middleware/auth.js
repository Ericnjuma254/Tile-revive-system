const jwt = require("jsonwebtoken");
const prisma = require("../db");

// ======================================================
// AUTHENTICATE JWT
// ======================================================

async function authenticateToken(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token missing",
            });
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        const user = await prisma.user.findUnique({
            where: {
                id: decoded.userId,
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                emailVerified: true,
                adminApproved: true,
            },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User account not found",
            });
        }

        if (!user.emailVerified) {
            return res.status(403).json({
                success: false,
                message: "Email is not verified",
            });
        }

        if (!user.adminApproved) {
            return res.status(403).json({
                success: false,
                message: "Account has not been approved",
            });
        }

        req.user = user;

        next();

    } catch (error) {
        console.error("AUTH ERROR:", error.message);

        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Authentication token has expired",
            });
        }

        return res.status(401).json({
            success: false,
            message: "Invalid authentication token",
        });
    }
}

// ======================================================
// ADMIN ONLY
// ======================================================

function requireAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }

    if (req.user.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            message: "Admin access required",
        });
    }

    next();
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
    authenticateToken,
    requireAdmin,
};