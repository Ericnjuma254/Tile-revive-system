const express = require("express");
const axios = require("axios");

const router = express.Router();

// -----------------------------------------------------
// Generate Daraja Access Token
// -----------------------------------------------------
async function getAccessToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  const auth = Buffer.from(
    `${consumerKey}:${consumerSecret}`
  ).toString("base64");

  try {
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error("TOKEN ERROR:", error.response?.data || error.message);
    throw error;
  }
}
// -----------------------------------------------------
// TEMPORARY: Test Daraja OAuth
// GET /api/c2b/test-token
// -----------------------------------------------------
router.get("/test-token", async (req, res) => {
  try {
    const token = await getAccessToken();

    return res.json({
      success: true,
      message: "Daraja OAuth is working",
      tokenReceived: !!token,
      tokenLength: token ? token.length : 0
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Daraja OAuth failed",
      error: error.response?.data || error.message
    });
  }
});

// -----------------------------------------------------
// Register Validation & Confirmation URLs
// POST /api/c2b/registerurl
// -----------------------------------------------------
router.post("/registerurl", async (req, res) => {
  try {
    const token = await getAccessToken();

    const validationURL =
      `${process.env.SERVER_URL}/api/c2b/validation`;

    const confirmationURL =
      `${process.env.SERVER_URL}/api/c2b/confirmation`;

    console.log("======================================");
    console.log("📡 C2B URL REGISTRATION");
    console.log("ShortCode:", process.env.MPESA_SHORTCODE);
    console.log("ValidationURL:", validationURL);
    console.log("ConfirmationURL:", confirmationURL);
    console.log("======================================");

    const payload = {
      ShortCode: process.env.MPESA_SHORTCODE,
      ResponseType: "Completed",
      ConfirmationURL: confirmationURL,
      ValidationURL: validationURL
    };

    console.log("Safaricom payload:");
    console.log(JSON.stringify(payload, null, 2));

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/c2b/v2/registerurl",
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("C2B REGISTRATION RESPONSE:");
    console.log(response.data);

    return res.json(response.data);

  } catch (error) {

    console.error("======================================");
    console.error("❌ C2B REGISTRATION FAILED");
    console.error("======================================");

    console.error(
      "Safaricom response:",
      error.response?.data || error.message
    );

    return res.status(
      error.response?.status || 500
    ).json(
      error.response?.data || {
        success: false,
        error: error.message
      }
    );
  }
});

// -----------------------------------------------------
// Validation URL
// POST /api/c2b/validation
// -----------------------------------------------------
router.post("/validation", async (req, res) => {
  console.log("========== VALIDATION ==========");
  console.log(req.body);
  console.log("================================");

  res.json({
    ResultCode: 0,
    ResultDesc: "Accepted",
  });
});

// -----------------------------------------------------
// Confirmation URL
// POST /api/c2b/confirmation
// -----------------------------------------------------
router.post("/confirmation", async (req, res) => {
  console.log("========== CONFIRMATION ==========");
  console.log(req.body);
  console.log("==================================");

  /*
      Save payment to database here.

      Example:

      const payment = req.body;

      await prisma.payment.create({
          data:{
              receiptNumber: payment.TransID,
              amount: payment.TransAmount,
              phoneNumber: payment.MSISDN
          }
      });

  */

  res.json({
    ResultCode: 0,
    ResultDesc: "Success",
  });
});

// -----------------------------------------------------
// Sandbox C2B Simulation
// POST /api/c2b/simulate
// -----------------------------------------------------
router.post("/simulate", async (req, res) => {
  try {
    const { phone, amount, account } = req.body;

    const token = await getAccessToken();

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/simulate",
      {
        ShortCode: process.env.MPESA_SHORTCODE,
        CommandID: "CustomerPayBillOnline",
        Amount: Number(amount),
        Msisdn: phone,
        BillRefNumber: account || process.env.BANK_ACCOUNT_NO,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error(error.response?.data || error.message);

    res.status(500).json(
      error.response?.data || {
        error: error.message,
      }
    );
  }
});

// =====================================================
// TEST DIRECT C2B REGISTRATION
// GET /api/c2b/test-register
// =====================================================

router.get("/test-register", async (req, res) => {
    try {

        const token = await getAccessToken();

        const payload = {
            ShortCode: process.env.MPESA_SHORTCODE,
            ResponseType: "Completed",
            ConfirmationURL:
                `${process.env.SERVER_URL}/api/c2b/confirmation`,
            ValidationURL:
                `${process.env.SERVER_URL}/api/c2b/validation`
        };

        console.log("\n======================================");
        console.log("C2B REGISTRATION DEBUG");
        console.log("======================================");

        console.log("ShortCode:");
        console.log(process.env.MPESA_SHORTCODE);

        console.log("SERVER_URL:");
        console.log(process.env.SERVER_URL);

        console.log("ValidationURL:");
        console.log(payload.ValidationURL);

        console.log("ConfirmationURL:");
        console.log(payload.ConfirmationURL);

        console.log("Token received:");
        console.log(Boolean(token));

        console.log("Token length:");
        console.log(token?.length);

        console.log("Payload:");
        console.log(JSON.stringify(payload, null, 2));

        console.log("======================================\n");


        const response = await axios.post(

            "https://sandbox.safaricom.co.ke/mpesa/c2b/v2/registerurl",

            payload,

            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },

                timeout: 30000
            }
        );


        console.log("======================================");
        console.log("C2B REGISTRATION SUCCESS");
        console.log(response.data);
        console.log("======================================");


        return res.json({
            success: true,
            response: response.data
        });


    } catch (error) {

        console.log("\n======================================");
        console.log("C2B REGISTRATION FAILED");
        console.log("======================================");

        console.log(
            "HTTP STATUS:",
            error.response?.status
        );

        console.log(
            "SAFEARICOM:",
            error.response?.data
        );

        console.log(
            "MESSAGE:",
            error.message
        );

        console.log("======================================\n");


        return res.status(
            error.response?.status || 500
        ).json({

            success: false,

            status:
                error.response?.status || 500,

            safaricom:
                error.response?.data || null,

            message:
                error.message
        });
    }
});

module.exports = router;