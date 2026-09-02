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
// EXPORTS
// ======================================================

module.exports = {
    generateCustomerAccessToken,
    verifyCustomerAccessToken
};