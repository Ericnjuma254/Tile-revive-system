const express = require("express");

const {
    otpLimiter
} = require("../middleware/authRateLimit");
const crypto = require("crypto");
const prisma = require("../db");

const {
    sendCustomerOtpEmail
} = require("../utils/sendEmail");

const {
    generateCustomerAccessToken,
    verifyCustomerAccessToken,
    generateCustomerRefreshToken,
    verifyCustomerRefreshToken
} = require("../utils/customerTokens");

const router = express.Router();

// ======================================================
// CUSTOMER AUTHENTICATION MIDDLEWARE
// ======================================================

function requireCustomerAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const [scheme, token] =
            authHeader.split(" ");

        if (
            scheme !== "Bearer" ||
            !token
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token"
            });
        }

        const decoded =
            verifyCustomerAccessToken(token);

        req.customer = decoded;

        next();

    } catch (error) {
        console.error(
            "CUSTOMER AUTH ERROR:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired customer session"
        });
    }
}

// ======================================================
// HELPERS
// ======================================================

function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

function normalizePhone(phone) {
    let value = String(phone || "")
        .trim()
        .replace(/[^0-9]/g, "");

    if (value.startsWith("0")) {
        value = "254" + value.substring(1);
    }

    if (value.startsWith("+254")) {
        value = value.substring(1);
    }

    return value;
}

function generateOtp() {
    return crypto
        .randomInt(100000, 1000000)
        .toString();
}

function hashOtp(code) {
    return crypto
        .createHash("sha256")
        .update(code)
        .digest("hex");
}

// ======================================================
// REQUEST EMAIL OTP
// ======================================================

router.post("/request-email-otp", otpLimiter, async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const fullName = String(req.body.fullName || "").trim();

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email address is required"
            });
        }

        if (!email.includes("@")) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address"
            });
        }

        let customer = await prisma.customer.findFirst({
            where: { email }
        });

        if (!customer) {
            if (!fullName) {
                return res.status(400).json({
                    success: false,
                    message: "Full name is required for a new account"
                });
            }

            customer = await prisma.customer.create({
                data: {
                    fullName,
                    email,
                    emailMarketingOptIn: false
                }
            });
        }

        // Invalidate previous unused OTPs
        await prisma.customerotp.updateMany({
            where: {
                customerId: customer.id,
                used: false
            },
            data: {
                used: true
            }
        });

        const otp = generateOtp();

        await prisma.customerotp.create({
            data: {
                customerId: customer.id,
                codeHash: hashOtp(otp),
                expiresAt: new Date(Date.now() + 10 * 60 * 1000)
            }
        });

        await sendCustomerOtpEmail({
            email,
            customerName: customer.fullName,
            otp
        });

        return res.json({
            success: true,
            message: "Verification code sent to your email"
        });

    } catch (error) {
        console.error(
            "======================================"
        );

        console.error(
            "CUSTOMER OTP ERROR"
        );

        console.error(
            "Name:",
            error?.name
        );

        console.error(
            "Code:",
            error?.code
        );

        console.error(
            "Command:",
            error?.command
        );

        console.error(
            "Response Code:",
            error?.responseCode
        );

        console.error(
            "Response:",
            error?.response
        );

        console.error(
            "Message:",
            error?.message
        );

        console.error(
            "======================================"
        );

        return res.status(500).json({
            success: false,
            message: "Unable to send verification code"
        });
    }
});

// ======================================================
// VERIFY EMAIL OTP
// ======================================================

router.post("/verify-email-otp", otpLimiter, async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const code = String(req.body.code || "").trim();

        if (!email || !code) {
            return res.status(400).json({
                success: false,
                message: "Email and verification code are required"
            });
        }

        const customer = await prisma.customer.findFirst({
            where: { email }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer account not found"
            });
        }

        const otpRecord = await prisma.customerotp.findFirst({
            where: {
                customerId: customer.id,
                used: false
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        if (!otpRecord) {
            return res.status(401).json({
                success: false,
                message: "No active verification code"
            });
        }

        if (new Date() > otpRecord.expiresAt) {
            return res.status(401).json({
                success: false,
                message: "Verification code has expired"
            });
        }

        if (otpRecord.attempts >= 5) {
            return res.status(429).json({
                success: false,
                message: "Too many attempts. Request a new code."
            });
        }

        const valid = crypto.timingSafeEqual(
            Buffer.from(hashOtp(code)),
            Buffer.from(otpRecord.codeHash)
        );

        if (!valid) {
            await prisma.customerotp.update({
                where: {
                    id: otpRecord.id
                },
                data: {
                    attempts: {
                        increment: 1
                    }
                }
            });

            return res.status(401).json({
                success: false,
                message: "Incorrect verification code"
            });
        }

        await prisma.customerotp.update({
            where: {
                id: otpRecord.id
            },
            data: {
                used: true
            }
        });

        const accessToken =
              generateCustomerAccessToken(customer);

        const refreshToken =
              generateCustomerRefreshToken(customer);

          return res.json({
              success: true,
              message: "Account verified successfully",

              accessToken,
              refreshToken,

              customer: {
                  id: customer.id,
                  fullName: customer.fullName,
                  email: customer.email,
                  phoneNumber: customer.phoneNumber
              }
          });

    } catch (error) {
        console.error(
            "CUSTOMER OTP ERROR:",
            error.message,
            error.stack
        );

        return res.status(500).json({
            success: false,
            message: "Unable to verify account"
        });
    }
});

// ======================================================
// ======================================================
// REFRESH CUSTOMER SESSION
// ======================================================

router.post("/refresh", async (req, res) => {
    try {
        const refreshToken =
            String(req.body.refreshToken || "").trim();

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token is required"
            });
        }

        let decoded;

        try {
            decoded =
                verifyCustomerRefreshToken(refreshToken);
        } catch {
            return res.status(401).json({
                success: false,
                message: "Refresh token expired or invalid"
            });
        }

        const customer =
            await prisma.customer.findUnique({
                where: {
                    id: decoded.customerId
                },
                select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phoneNumber: true
                }
            });

        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Customer account no longer exists"
            });
        }

        const accessToken =
            generateCustomerAccessToken(customer);

        return res.json({
            success: true,
            accessToken,
            customer
        });

    } catch (error) {
        console.error(
            "CUSTOMER REFRESH ERROR:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Unable to refresh customer session"
        });
    }
});
// GET MARKETING PREFERENCES
// ======================================================

router.get(
  "/:customerId/preferences",
  requireCustomerAuth,
  async (req, res) => {
    try {
         const customerId = Number(req.params.customerId);

            if (req.customer.id !== customerId) {
                return res.status(403).json({
                    success: false,
                    message: "You can only access your own preferences"
                });
            }

            const customer = await prisma.customer.findUnique({
                where: {
                    id: customerId
                },
                select: {
                    id: true,
                    emailMarketingOptIn: true,
                    offerUpdates: true,
                    flashSaleAlerts: true,
                    productUpdates: true,
                    cleaningTips: true
                }
            });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        return res.json({
            success: true,
            preferences: customer
        });

    } catch (error) {
        console.error(
            "GET CUSTOMER PREFERENCES ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to load preferences"
        });
    }
});

// ======================================================
// UPDATE MARKETING PREFERENCES
// ======================================================

router.put(
  "/:customerId/preferences",
  requireCustomerAuth,
  async (req, res) => {
    try {
        const customerId = Number(req.params.customerId);

          if (req.customer.id !== customerId) {
              return res.status(403).json({
                  success: false,
                  message: "You can only update your own preferences"
              });
          }

        const {
            emailMarketingOptIn,
            offerUpdates,
            flashSaleAlerts,
            productUpdates,
            cleaningTips
        } = req.body;

        const customer = await prisma.customer.update({
            where: {
                id: customerId
            },
            data: {
                emailMarketingOptIn: Boolean(emailMarketingOptIn),
                offerUpdates: Boolean(offerUpdates),
                flashSaleAlerts: Boolean(flashSaleAlerts),
                productUpdates: Boolean(productUpdates),
                cleaningTips: Boolean(cleaningTips)
            },
            select: {
                id: true,
                emailMarketingOptIn: true,
                offerUpdates: true,
                flashSaleAlerts: true,
                productUpdates: true,
                cleaningTips: true
            }
        });

        return res.json({
            success: true,
            message: "Email preferences saved",
            preferences: customer
        });

    } catch (error) {
        console.error(
            "UPDATE CUSTOMER PREFERENCES ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Unable to save preferences"
        });
    }
});

router.put("/profile/phone", requireCustomerAuth, async (req, res) => {
    try {
        const customerId = Number(req.customer?.customerId);

        if (!Number.isInteger(customerId)) {
            return res.status(401).json({
                success: false,
                message: "Invalid customer session"
            });
        }

        const phoneNumber = normalizePhone(req.body.phoneNumber);

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: "Phone number is required"
            });
        }

        if (!/^2547\d{8}$/.test(phoneNumber)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid Kenyan mobile number"
            });
        }

        const existingCustomer = await prisma.customer.findFirst({
            where: {
                phoneNumber,
                NOT: {
                    id: customerId
                }
            },
            select: {
                id: true
            }
        });

        if (existingCustomer) {
            return res.status(409).json({
                success: false,
                message: "Another customer already uses this phone number"
            });
        }

        const customer = await prisma.customer.update({
            where: {
                id: customerId
            },
            data: {
                phoneNumber
            },
            select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true
            }
        });

        return res.json({
            success: true,
            message: "Phone number updated successfully",
            customer
        });

    } catch (error) {
        console.error("UPDATE CUSTOMER PHONE ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update phone number"
        });
    }
});
module.exports = router;
module.exports.requireCustomerAuth = requireCustomerAuth;









