const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const path = require('path');

let sock;

/**
 * Initializes and maintains the WhatsApp Web connection for 0758804676
 */
async function connectToWhatsApp() {
  if (sock) return sock; // Reuse existing connection

  // Persists login session in local directory
  const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth_info_baileys'));

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Render terminal QR Code on first run
    if (qr) {
      console.log('\n📱 Scan this QR code using WhatsApp on 0758804676:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      console.log('⚠️ WhatsApp connection closed. Reconnecting:', shouldReconnect);
      sock = null;
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp successfully connected on 0758804676!');
    }
  });

  return sock;
}

/**
 * Sends a free WhatsApp payment receipt
 */
async function sendWhatsAppReceipt({ recipientPhone, tenantName, amountPaid, mpesaReceiptNumber, pdfUrl }) {
  try {
    const client = await connectToWhatsApp();

    // Format phone to 254XXXXXXXXX@s.whatsapp.net
    let formattedPhone = recipientPhone.toString().trim().replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }
    const jid = `${formattedPhone}@s.whatsapp.net`;

    const messageBody = 
      `*RENT PAYMENT CONFIRMATION*\n` +
      `-----------------------------------\n` +
      `Hello *${tenantName}*,\n\n` +
      `We have received your rent payment of *KES ${Number(amountPaid).toLocaleString()}*.\n\n` +
      `📌 *Receipt No:* ${mpesaReceiptNumber}\n` +
      `📄 *Download PDF Receipt:* ${pdfUrl}\n\n` +
      `Thank you for keeping your account up to date!`;

    // Send WhatsApp message
    await client.sendMessage(jid, { text: messageBody });
    console.log(`📲 Free WhatsApp receipt sent to ${formattedPhone}`);

  } catch (error) {
    console.error("❌ Free WhatsApp dispatch error:", error.message);
  }
}

// Start connection on file load
connectToWhatsApp();

module.exports = sendWhatsAppReceipt;