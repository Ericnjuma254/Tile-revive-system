const jwt = require("jsonwebtoken");

// ======================================================
// JWT CONFIGURATION
// ======================================================

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET;

const ACCESS_TOKEN_EXPIRES_IN =
    process.env.JWT_ACCESS_EXPIRES_IN || "15m";

const REFRESH_TOKEN_EXPIRES_IN =
    process.env.JWT_REFRESH_EXPIRES_IN || "7d";

// ======================================================
// VALIDATE JWT CONFIGURATION
// ======================================================

if (!ACCESS_TOKEN_SECRET) {
    throw new Error(
        "JWT_ACCESS_SECRET is missing from .env"
    );
}

if (!REFRESH_TOKEN_SECRET) {
    throw new Error(
        "JWT_REFRESH_SECRET is missing from .env"
    );
}

// ======================================================
// CREATE ACCESS TOKEN
// ======================================================

function generateAccessToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role
        },
        ACCESS_TOKEN_SECRET,
        {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN
        }
    );
}

// ======================================================
// CREATE REFRESH TOKEN
// ======================================================

function generateRefreshToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            role: user.role
        },
        REFRESH_TOKEN_SECRET,
        {
            expiresIn: REFRESH_TOKEN_EXPIRES_IN
        }
    );
}

// ======================================================
// VERIFY ACCESS TOKEN
// ======================================================

function verifyAccessToken(token) {
    return jwt.verify(
        token,
        ACCESS_TOKEN_SECRET
    );
}

// ======================================================
// VERIFY REFRESH TOKEN
// ======================================================

function verifyRefreshToken(token) {
    return jwt.verify(
        token,
        REFRESH_TOKEN_SECRET
    );
}

// ======================================================
// EXPORT
// ======================================================

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken
};