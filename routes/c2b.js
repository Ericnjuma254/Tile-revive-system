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
// Register Validation & Confirmation URLs
// POST /api/c2b/registerurl
// -----------------------------------------------------
router.post("/registerurl", async (req, res) => {
  try {
    const token = await getAccessToken();

    const response = await axios.post(
      "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl",
      {
        ShortCode: process.env.MPESA_SHORTCODE,
        ResponseType: "Completed",
        ConfirmationURL: `${process.env.SERVER_URL}/api/c2b/confirmation`,
        ValidationURL: `${process.env.SERVER_URL}/api/c2b/validation`,
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

module.exports = router;