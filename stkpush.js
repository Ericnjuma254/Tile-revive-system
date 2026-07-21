const express = require('express');
const axios = require('axios');
const router = express.Router();

// Helper to obtain Safaricom OAuth token
async function getMpesaToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  try {
    const response = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}` } }
    );
    return response.data.access_token;
  } catch (error) {
    console.error("Token Error:", error.response ? error.response.data : error.message);
    throw new Error("Failed to generate M-Pesa token");
  }
}

// POST Route: /api/stkpush
router.post('/stkpush', async (req, res) => {
  const { customerPhone, orderId, amount } = req.body;

  if (!customerPhone || !amount) {
    return res.status(400).json({ success: false, message: "Phone number and amount are required." });
  }

  // Format Phone Number to 2547XXXXXXXX
  let formattedPhone = customerPhone.toString().trim();
  if (formattedPhone.startsWith('0')) {
    formattedPhone = '254' + formattedPhone.substring(1);
  } else if (formattedPhone.startsWith('+')) {
    formattedPhone = formattedPhone.substring(1);
  }

  // Timestamp YYYYMMDDHHmmss
  const date = new Date();
  const timestamp =
    date.getFullYear() +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0') +
    String(date.getHours()).padStart(2, '0') +
    String(date.getMinutes()).padStart(2, '0') +
    String(date.getSeconds()).padStart(2, '0');

  const shortCode = '174379';
  const passkey = process.env.MPESA_PASSKEY;
  const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

  try {
    const token = await getMpesaToken();

    const stkPayload = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.ceil(amount),
      PartyA: formattedPhone,
      PartyB: shortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: `${process.env.SERVER_URL}/api/mpesa-callback`,
      AccountReference: process.env.BANK_ACCOUNT_NO || "7927213",
      TransactionDesc: `Order #${orderId || '1001'}`
    };

    const response = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      stkPayload,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return res.status(200).json({
      success: true,
      message: "STK Push initiated successfully!",
      CheckoutRequestID: response.data.CheckoutRequestID,
      CustomerPhone: formattedPhone
    });

  } catch (error) {
    console.error("STK Push Error:", error.response ? error.response.data : error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to initiate STK Push payment.",
      error: error.response ? error.response.data : error.message
    });
  }
});

module.exports = router;