const express = require('express');
const cors = require('cors');
require('dotenv').config();

const stkpushRoute = require('./stkpush');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api', stkpushRoute);

// Webhook listener for Safaricom callbacks
app.post('/api/mpesa-callback', (req, res) => {
  console.log('🔔 M-Pesa Webhook Callback Received:');
  console.log(JSON.stringify(req.body, null, 2));
  res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});