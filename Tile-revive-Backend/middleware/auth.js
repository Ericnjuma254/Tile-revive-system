const {
    verifyAccessToken
} = require("../utils/tokens");

// ======================================================
// AUTHENTICATE ACCESS TOKEN
// ======================================================

function authenticateToken(req, res, next) {

    try {

        const authHeader =
            req.headers.authorization;

        // No Authorization header
        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        // Expected format:
        // Authorization: Bearer <token>

        const parts =
            authHeader.split(" ");

        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer" ||
            !parts[1]
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authorization header."
            });
        }

        const token =
            parts[1];

        // Verify JWT
        const decoded =
            verifyAccessToken(token);

        // Attach authenticated user
        // to request
        req.user = decoded;

        next();

    } catch (error) {

        console.error(
            "AUTHENTICATION ERROR:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired access token."
        });
    }
}


// ======================================================
// REQUIRE ADMIN
// ======================================================

function requireAdmin(req, res, next) {

    if (!req.user) {

        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });
    }

    if (req.user.role !== "ADMIN") {

        return res.status(403).json({
            success: false,
            message: "Administrator access required."
        });
    }

    next();
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {
    authenticateToken,
    requireAdmin
};