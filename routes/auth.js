const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const prisma = require("../db");

const router = express.Router();

// ======================================================
// EMAIL CONFIGURATION
// ======================================================

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

transporter.verify((error) => {
    if (error) {
        console.error("======================================");
        console.error("❌ EMAIL CONFIGURATION ERROR");
        console.error("======================================");
        console.error(error.message);
        console.error("======================================");
    } else {
        console.log("======================================");
        console.log("✅ EMAIL SERVER READY");
        console.log("======================================");
    }
});

// ======================================================
// HELPERS
// ======================================================

function generateOtp() {
    return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp) {
    return crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");
}

async function sendOtpEmail(email, otp, purpose) {
    const subject =
        purpose === "REGISTER"
            ? "Verify your account"
            : "Your login verification code";

    const message =
        purpose === "REGISTER"
            ? `Your account verification code is ${otp}. This code expires in 10 minutes.`
            : `Your login verification code is ${otp}. This code expires in 10 minutes.`;

    await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject,
        text: message,
        html: `
            <div style="font-family: Arial, sans-serif;">
                <h2>${subject}</h2>
                <p>Your verification code is:</p>

                <h1 style="letter-spacing: 8px;">
                    ${otp}
                </h1>

                <p>This code expires in <strong>10 minutes</strong>.</p>

                <p>If you did not request this code, ignore this email.</p>
            </div>
        `,
    });
}

// ======================================================
// REGISTER
// POST /api/auth/register
// ======================================================

router.post("/register", async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        if (!fullName || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Full name, email and password are required",
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const otp = generateOtp();
        const otpHash = hashOtp(otp);

        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const user = await prisma.user.create({
            data: {
                fullName,
                email: normalizedEmail,
                password: hashedPassword,

                role: "USER",

                emailVerified: false,
                adminApproved: false,

                loginOtpHash: otpHash,
                loginOtpExpiresAt: expiresAt,
                loginOtpAttempts: 0,
            },
        });

        await sendOtpEmail(
            normalizedEmail,
            otp,
            "REGISTER"
        );

        return res.status(201).json({
            success: true,
            message:
                "Registration successful. A verification code has been sent to your email.",
            userId: user.id,
        });

    } catch (error) {
    console.error("======================================");
    console.error("❌ LOGIN ERROR");
    console.error("======================================");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("======================================");

    return res.status(500).json({
        success: false,
        message: "Login failed",
        error: error.message,
    });
}
});

// ======================================================
// VERIFY REGISTRATION EMAIL
// POST /api/auth/verify-email
// ======================================================

router.post("/verify-email", async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        if (user.emailVerified) {
            return res.status(400).json({
                success: false,
                message: "Email is already verified",
            });
        }

        if (
            !user.loginOtpHash ||
            !user.loginOtpExpiresAt
        ) {
            return res.status(400).json({
                success: false,
                message: "Verification code is invalid",
            });
        }

        if (new Date() > user.loginOtpExpiresAt) {
            return res.status(400).json({
                success: false,
                message: "Verification code has expired",
            });
        }

        const submittedHash = hashOtp(otp);

        if (submittedHash !== user.loginOtpHash) {
            return res.status(400).json({
                success: false,
                message: "Invalid verification code",
            });
        }

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                emailVerified: true,
                emailVerifiedAt: new Date(),

                loginOtpHash: null,
                loginOtpExpiresAt: null,
                loginOtpAttempts: 0,
            },
        });

        return res.json({
            success: true,
            message:
                "Email verified successfully. Your account is now waiting for administrator approval.",
        });

    } catch (error) {
        console.error("VERIFY EMAIL ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Email verification failed",
        });
    }
});

// ======================================================
// LOGIN
// POST /api/auth/login
// ======================================================

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        const passwordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password",
            });
        }

        if (!user.emailVerified) {
            return res.status(403).json({
                success: false,
                message: "Please verify your email first",
            });
        }

        if (!user.adminApproved) {
            return res.status(403).json({
                success: false,
                message:
                    "Your account is waiting for administrator approval",
            });
        }

        const otp = generateOtp();
        const otpHash = hashOtp(otp);

        const expiresAt = new Date(
            Date.now() + 10 * 60 * 1000
        );

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                loginOtpHash: otpHash,
                loginOtpExpiresAt: expiresAt,
                loginOtpAttempts: 0,
            },
        });

        await sendOtpEmail(
            normalizedEmail,
            otp,
            "LOGIN"
        );

        return res.json({
            success: true,
            message:
                "Password verified. A login verification code has been sent to your email.",
            requiresOtp: true,
        });

    } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
        success: false,
        message: "Login failed",
    });
    }
});

// ======================================================
// VERIFY LOGIN OTP
// POST /api/auth/verify-login
// ======================================================

router.post("/verify-login", async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
            where: {
                email: normalizedEmail,
            },
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid verification request",
            });
        }

        if (!user.emailVerified || !user.adminApproved) {
            return res.status(403).json({
                success: false,
                message: "Account is not approved",
            });
        }

        if (
            !user.loginOtpHash ||
            !user.loginOtpExpiresAt
        ) {
            return res.status(400).json({
                success: false,
                message: "No active verification code",
            });
        }

        if (new Date() > user.loginOtpExpiresAt) {
            return res.status(400).json({
                success: false,
                message: "Verification code has expired",
            });
        }

        const submittedHash = hashOtp(otp);

        if (submittedHash !== user.loginOtpHash) {
            return res.status(400).json({
                success: false,
                message: "Invalid verification code",
            });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h",
            }
        );

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                loginOtpHash: null,
                loginOtpExpiresAt: null,
                loginOtpAttempts: 0,
            },
        });

        return res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
            },
        });

    } catch (error) {
        console.error("VERIFY LOGIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Login verification failed",
        });
    }
});

module.exports = router;