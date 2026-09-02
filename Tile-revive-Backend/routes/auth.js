const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken
} = require("../utils/tokens");

const prisma = require("../db");

const {
    sendVerificationEmail
} = require("../utils/sendEmail");

const router = express.Router();


// ======================================================
// HELPERS
// ======================================================

const generateVerificationCode = () => {
    return crypto
        .randomInt(100000, 1000000)
        .toString();
};


const hashVerificationCode = (code) => {
    return crypto
        .createHash("sha256")
        .update(code)
        .digest("hex");
};


const normalizeEmail = (email) => {
    return String(email || "")
        .trim()
        .toLowerCase();
};


const normalizePhone = (phone) => {
    let value = String(phone || "")
        .trim()
        .replace(/[^\d+]/g, "");

    if (value.startsWith("07")) {
        value = `+254${value.substring(1)}`;
    }

    if (value.startsWith("254")) {
        value = `+${value}`;
    }

    return value;
};


// ======================================================
// REGISTER
// POST /api/auth/register
// ======================================================

router.post("/register", async (req, res) => {
    try {
        const {
            fullName,
            email,
            phoneNumber,
            password,

            emailMarketingOptIn = false,
            offerUpdates = true,
            flashSaleAlerts = true,
            productUpdates = true,
            cleaningTips = false
        } = req.body;

        if (
            !fullName ||
            !email ||
            !phoneNumber ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Full name, email, phone number and password are required."
            });
        }

        const cleanName = String(fullName).trim();
        const normalizedEmail = normalizeEmail(email);
        const normalizedPhone = normalizePhone(phoneNumber);

        if (!cleanName) {
            return res.status(400).json({
                success: false,
                message: "Please enter your full name."
            });
        }

        if (!normalizedEmail.includes("@")) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 8 characters."
            });
        }

        if (
            !normalizedPhone ||
            normalizedPhone.length < 10
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Please enter a valid Kenyan phone number."
            });
        }


        // ==================================================
        // CHECK LOGIN EMAIL
        // ==================================================

        const existingUser =
            await prisma.user.findUnique({
                where: {
                    email: normalizedEmail
                }
            });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message:
                    "An account with this email already exists. Please sign in."
            });
        }


        // ==================================================
        // CHECK CUSTOMER PHONE
        //
        // IMPORTANT:
        // An existing customer record does NOT necessarily
        // mean the person already has a login account.
        // ==================================================

        const existingCustomer =
            await prisma.customer.findUnique({
                where: {
                    phoneNumber: normalizedPhone
                }
            });


        // ==================================================
        // CREATE PASSWORD
        // ==================================================

        const hashedPassword =
            await bcrypt.hash(password, 12);


        // ==================================================
        // CREATE LOGIN USER
        // ==================================================

        const user =
            await prisma.user.create({
                data: {
                    fullName: cleanName,
                    email: normalizedEmail,
                    password: hashedPassword,
                    role: "USER",
                    emailVerified: false,
                    adminApproved: true
                },

                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                    emailVerified: true,
                    adminApproved: true
                }
            });


        // ==================================================
        // CREATE OR UPDATE CUSTOMER PROFILE
        // ==================================================

        if (existingCustomer) {

            await prisma.customer.update({
                where: {
                    id: existingCustomer.id
                },

                data: {
                    fullName: cleanName,
                    email: normalizedEmail,

                    emailMarketingOptIn:
                        Boolean(emailMarketingOptIn),

                    offerUpdates:
                        Boolean(offerUpdates),

                    flashSaleAlerts:
                        Boolean(flashSaleAlerts),

                    productUpdates:
                        Boolean(productUpdates),

                    cleaningTips:
                        Boolean(cleaningTips)
                }
            });

        } else {

            await prisma.customer.create({
                data: {
                    fullName: cleanName,
                    phoneNumber: normalizedPhone,
                    email: normalizedEmail,

                    emailMarketingOptIn:
                        Boolean(emailMarketingOptIn),

                    offerUpdates:
                        Boolean(offerUpdates),

                    flashSaleAlerts:
                        Boolean(flashSaleAlerts),

                    productUpdates:
                        Boolean(productUpdates),

                    cleaningTips:
                        Boolean(cleaningTips)
                }
            });
        }


        // ==================================================
        // GENERATE EMAIL VERIFICATION CODE
        // ==================================================

        const verificationCode =
            generateVerificationCode();

        const verificationHash =
            hashVerificationCode(
                verificationCode
            );

        const expiresAt =
            new Date(
                Date.now() + 10 * 60 * 1000
            );


        // ==================================================
        // SAVE OTP
        // ==================================================

        await prisma.user.update({
            where: {
                id: user.id
            },

            data: {
                loginOtpHash: verificationHash,
                loginOtpExpiresAt: expiresAt,
                loginOtpAttempts: 0
            }
        });


        // ==================================================
        // SEND VERIFICATION EMAIL
        // ==================================================

        try {

            await sendVerificationEmail(
                normalizedEmail,
                cleanName,
                verificationCode
            );

        } catch (emailError) {

            console.error(
                "VERIFICATION EMAIL ERROR:",
                emailError
            );

            await prisma.user.delete({
                where: {
                    id: user.id
                }
            });

            return res.status(500).json({
                success: false,
                message:
                    "Account could not be created because the verification email could not be sent."
            });
        }


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.status(201).json({
            success: true,

            message:
                "Account created successfully. A verification code has been sent to your email.",

            requiresVerification: true,

            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                phoneNumber: normalizedPhone
            }
        });

    } catch (error) {

        console.error(
            "REGISTRATION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to create account.",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : undefined
        });
    }
});


// ======================================================
// VERIFY EMAIL
// POST /api/auth/verify-email
// ======================================================

router.post("/verify-email", async (req, res) => {
    try {

        const {
            email,
            code,
            otp
        } = req.body;

        const verificationCode =
            String(code || otp || "").trim();

        if (!email || !verificationCode) {
            return res.status(400).json({
                success: false,
                message:
                    "Email and verification code are required."
            });
        }

        const normalizedEmail =
            normalizeEmail(email);

        const user =
            await prisma.user.findUnique({
                where: {
                    email: normalizedEmail
                }
            });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Account not found."
            });
        }

        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                message:
                    "Email is already verified."
            });
        }

        if (!user.loginOtpHash) {
            return res.status(400).json({
                success: false,
                message:
                    "No verification code is active."
            });
        }

        if (
            !user.loginOtpExpiresAt ||
            user.loginOtpExpiresAt < new Date()
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Verification code has expired."
            });
        }

        if (user.loginOtpAttempts >= 5) {
            return res.status(429).json({
                success: false,
                message:
                    "Too many verification attempts. Request a new code."
            });
        }

        const suppliedHash =
            hashVerificationCode(
                verificationCode
            );

        if (
            suppliedHash !==
            user.loginOtpHash
        ) {

            await prisma.user.update({
                where: {
                    id: user.id
                },

                data: {
                    loginOtpAttempts: {
                        increment: 1
                    }
                }
            });

            return res.status(400).json({
                success: false,
                message:
                    "Invalid verification code."
            });
        }

        const verifiedUser =
            await prisma.user.update({
                where: {
                    id: user.id
                },

                data: {
                    emailVerified: true,
                    emailVerifiedAt: new Date(),
                    loginOtpHash: null,
                    loginOtpExpiresAt: null,
                    loginOtpAttempts: 0
                },

                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    role: true,
                    emailVerified: true,
                    emailVerifiedAt: true,
                    adminApproved: true
                }
            });


        return res.json({
            success: true,
            message:
                "Email verified successfully.",
            user: verifiedUser
        });

    } catch (error) {

        console.error(
            "VERIFY EMAIL ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Failed to verify email."
        });
    }
});


// ======================================================
// LOGIN
// POST /api/auth/login
// ======================================================

router.post("/login", async (req, res) => {
    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message:
                    "Email and password are required."
            });
        }

        const normalizedEmail =
            normalizeEmail(email);

        const user =
            await prisma.user.findUnique({
                where: {
                    email: normalizedEmail
                }
            });

        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid email or password."
            });
        }

        const passwordValid =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordValid) {
            return res.status(401).json({
                success: false,
                message:
                    "Invalid email or password."
            });
        }

        if (!user.emailVerified) {
            return res.status(403).json({
                success: false,
                message:
                    "Please verify your email first."
            });
        }

        if (
            user.role === "ADMIN" &&
            !user.adminApproved
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Admin account is awaiting approval."
            });
        }


        // ==================================================
        // GET CUSTOMER PROFILE
        // ==================================================

        const customer =
            await prisma.customer.findFirst({
                where: {
                    email: user.email
                },

                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phoneNumber: true,
                    emailMarketingOptIn: true,
                    offerUpdates: true,
                    flashSaleAlerts: true,
                    productUpdates: true,
                    cleaningTips: true
                }
            });


        // ==================================================
        // TOKENS
        // ==================================================

        const accessToken =
            generateAccessToken(user);

        const refreshToken =
            generateRefreshToken(user);


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.json({
            success: true,
            message: "Login successful.",

            accessToken,
            refreshToken,

            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                emailVerified: user.emailVerified,

                phoneNumber:
                    customer?.phoneNumber || "",

                customerId:
                    customer?.id || null,

                newsletter: {
                    emailMarketingOptIn:
                        customer?.emailMarketingOptIn || false,

                    offerUpdates:
                        customer?.offerUpdates || false,

                    flashSaleAlerts:
                        customer?.flashSaleAlerts || false,

                    productUpdates:
                        customer?.productUpdates || false,

                    cleaningTips:
                        customer?.cleaningTips || false
                }
            }
        });

    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Login failed."
        });
    }
});


// ======================================================
// REFRESH TOKEN
// ======================================================

router.post("/refresh", async (req, res) => {
    try {

        const {
            refreshToken
        } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message:
                    "Refresh token is required."
            });
        }

        let decoded;

        try {
            decoded =
                verifyRefreshToken(
                    refreshToken
                );
        } catch {
            return res.status(401).json({
                success: false,
                message:
                    "Refresh token expired or invalid."
            });
        }

        const user =
            await prisma.user.findUnique({
                where: {
                    id: decoded.userId
                }
            });

        if (!user) {
            return res.status(401).json({
                success: false,
                message:
                    "User no longer exists."
            });
        }

        const accessToken =
            generateAccessToken(user);

        return res.status(200).json({
            success: true,
            accessToken
        });

    } catch (error) {

        console.error(
            "REFRESH TOKEN ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to refresh access token."
        });
    }
});


module.exports = router;