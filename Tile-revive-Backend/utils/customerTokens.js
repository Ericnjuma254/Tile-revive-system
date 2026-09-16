require("dotenv").config();
const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;

const ACCESS_TOKEN_EXPIRES_IN =
    process.env.JWT_ACCESS_EXPIRES_IN || "5m";

if (!ACCESS_TOKEN_SECRET) {
    throw new Error("JWT_ACCESS_SECRET is missing from .env");
}

// ======================================================
// GENERATE CUSTOMER ACCESS TOKEN
// ======================================================

function generateCustomerAccessToken(customer) {
    return jwt.sign(
        {
            type: "customer",
            customerId: customer.id,
            email: customer.email || null,
            role: "CUSTOMER"
        },
        ACCESS_TOKEN_SECRET,
        {
            expiresIn: ACCESS_TOKEN_EXPIRES_IN
        }
    );
}

// ======================================================
// VERIFY CUSTOMER ACCESS TOKEN
// ======================================================

function verifyCustomerAccessToken(token) {
    const decoded = jwt.verify(
        token,
        ACCESS_TOKEN_SECRET
    );

    if (
        decoded.type !== "customer" ||
        decoded.role !== "CUSTOMER" ||
        !decoded.customerId
    ) {
        throw new Error("Invalid customer token");
    }

    return decoded;
}

// ======================================================
// CUSTOMER REFRESH TOKEN
// ======================================================

function generateCustomerRefreshToken(customer) {
    return jwt.sign(
        {
            type: "customer-refresh",
            customerId: customer.id,
            email: customer.email || null,
            role: "CUSTOMER"
        },
        process.env.CUSTOMER_REFRESH_SECRET,
        {
            expiresIn:
                process.env.JWT_REFRESH_EXPIRES_IN || "1d"
        }
    );
}

function verifyCustomerRefreshToken(token) {
    const decoded = jwt.verify(
        token,
        process.env.CUSTOMER_REFRESH_SECRET
    );

    if (
        decoded.type !== "customer-refresh" ||
        decoded.role !== "CUSTOMER" ||
        !decoded.customerId
    ) {
        throw new Error("Invalid customer refresh token");
    }

    return decoded;
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {
    generateCustomerAccessToken,
    verifyCustomerAccessToken,
    generateCustomerRefreshToken,
    verifyCustomerRefreshToken
};

