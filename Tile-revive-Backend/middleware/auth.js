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

        console.log(
            "[AUTH DEBUG]",
            req.method,
            req.originalUrl,
            "Authorization present:",
            Boolean(authHeader),
            "Header format:",
            authHeader
                ? authHeader.split(" ")[0]
                : "NONE",
            "Token length:",
            authHeader
                ? authHeader.split(" ")[1]?.length || 0
                : 0
        );

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

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

        const decoded =
            verifyAccessToken(token);

        console.log(
            "[AUTH DEBUG] Token verified:",
            {
                userId: decoded.userId,
                role: decoded.role,
                expiresAt: decoded.exp
                    ? new Date(
                        decoded.exp * 1000
                    ).toISOString()
                    : null
            }
        );

        req.user = decoded;

        next();

    } catch (error) {

        console.error(
            "[AUTH DEBUG] TOKEN VERIFICATION FAILED:",
            error.name,
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
        console.warn(
            "[AUTH DEBUG] ADMIN CHECK FAILED:",
            req.user.role
        );

        return res.status(403).json({
            success: false,
            message: "Administrator access required."
        });
    }

    next();
}


// ======================================================
// DEBUG AUTH
// ======================================================

function debugAuth(req, res) {
    try {
        const authHeader =
            req.headers.authorization || "";

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "No Authorization header",
                authorizationPresent: false
            });
        }

        const parts =
            authHeader.split(" ");

        if (
            parts.length !== 2 ||
            parts[0] !== "Bearer" ||
            !parts[1]
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid Authorization format",
                authorizationPresent: true
            });
        }

        const decoded =
            verifyAccessToken(parts[1]);

        return res.json({
            success: true,
            message:
                "Access token verified successfully",
            user: {
                userId: decoded.userId,
                email: decoded.email,
                role: decoded.role
            },
            expiresAt: decoded.exp
                ? new Date(
                    decoded.exp * 1000
                ).toISOString()
                : null
        });

    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Token verification failed",
            error: error.message
        });
    }
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {
    authenticateToken,
    requireAdmin,
    debugAuth
};
