const jwt = require("jsonwebtoken");

// ======================================================
// JWT CONFIGURATION
// ======================================================

const ACCESS_TOKEN_SECRET =
    process.env.JWT_ACCESS_SECRET;

const REFRESH_TOKEN_SECRET =
    process.env.JWT_REFRESH_SECRET;

const ACCESS_TOKEN_EXPIRES_IN =
    process.env.JWT_ACCESS_EXPIRES_IN || "15m";

const REFRESH_TOKEN_EXPIRES_IN =
    process.env.JWT_REFRESH_EXPIRES_IN || "7d";

const JWT_ALGORITHM = "HS256";

// ======================================================
// VALIDATE JWT CONFIGURATION
// ======================================================

if (
    !ACCESS_TOKEN_SECRET ||
    ACCESS_TOKEN_SECRET.length < 32
) {
    throw new Error(
        "JWT_ACCESS_SECRET must be at least 32 characters long."
    );
}

if (
    !REFRESH_TOKEN_SECRET ||
    REFRESH_TOKEN_SECRET.length < 32
) {
    throw new Error(
        "JWT_REFRESH_SECRET must be at least 32 characters long."
    );
}

if (
    ACCESS_TOKEN_SECRET === REFRESH_TOKEN_SECRET
) {
    throw new Error(
        "JWT access and refresh secrets must be different."
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
            algorithm: JWT_ALGORITHM,
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
            algorithm: JWT_ALGORITHM,
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
        ACCESS_TOKEN_SECRET,
        {
            algorithms: [JWT_ALGORITHM]
        }
    );
}

// ======================================================
// VERIFY REFRESH TOKEN
// ======================================================

function verifyRefreshToken(token) {

    return jwt.verify(
        token,
        REFRESH_TOKEN_SECRET,
        {
            algorithms: [JWT_ALGORITHM]
        }
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
