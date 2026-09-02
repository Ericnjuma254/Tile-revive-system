const makeWASocket = require("@whiskeysockets/baileys").default;
const {
    useMultiFileAuthState,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const qrcode = require("qrcode-terminal");
const path = require("path");

let sock = null;
let connecting = false;
let reconnectTimer = null;

// ======================================================
// WHATSAPP AUTH DIRECTORY
// ======================================================

const AUTH_DIR = path.join(
    __dirname,
    "auth_info_baileys"
);

// ======================================================
// CONNECT TO WHATSAPP
// ======================================================

async function connectToWhatsApp() {

    // Already connected
    if (sock) {
        return sock;
    }

    // Prevent multiple simultaneous connections
    if (connecting) {
        return null;
    }

    connecting = true;

    try {

        const {
            state,
            saveCreds
        } = await useMultiFileAuthState(AUTH_DIR);

        const client = makeWASocket({
            auth: state,

            printQRInTerminal: false,

            browser: [
                "Tile Revive",
                "Chrome",
                "1.0.0"
            ],

            markOnlineOnConnect: false,

            syncFullHistory: false,

            connectTimeoutMs: 60000,

            defaultQueryTimeoutMs: 60000
        });

        sock = client;

        // ==================================================
        // SAVE AUTH CREDENTIALS
        // ==================================================

        client.ev.on(
            "creds.update",
            saveCreds
        );

        // ==================================================
        // CONNECTION EVENTS
        // ==================================================

        client.ev.on(
            "connection.update",
            async (update) => {

                const {
                    connection,
                    lastDisconnect,
                    qr
                } = update;

                // ------------------------------------------
                // QR CODE
                // ------------------------------------------

                if (qr) {

                    console.log(
                        "\n📱 WhatsApp QR Code"
                    );

                    console.log(
                        "Scan this QR code using the Tile Revive WhatsApp phone.\n"
                    );

                    qrcode.generate(
                        qr,
                        {
                            small: true
                        }
                    );
                }

                // ------------------------------------------
                // CONNECTED
                // ------------------------------------------

                if (connection === "open") {

                    connecting = false;

                    console.log(
                        "✅ WhatsApp successfully connected!"
                    );
                }

                // ------------------------------------------
                // CONNECTION CLOSED
                // ------------------------------------------

                if (connection === "close") {

                    connecting = false;
                    sock = null;

                    const statusCode =
                        lastDisconnect?.error?.output?.statusCode;

                    console.log(
                        "⚠️ WhatsApp connection closed."
                    );

                    console.log(
                        "Status code:",
                        statusCode
                    );

                    // ======================================
                    // LOGGED OUT
                    // ======================================

                    if (
                        statusCode ===
                        DisconnectReason.loggedOut
                    ) {

                        console.error(
                            "❌ WhatsApp session was logged out."
                        );

                        console.error(
                            "Delete auth_info_baileys and scan the QR code again."
                        );

                        return;
                    }

                    // ======================================
                    // AUTHENTICATION ERROR
                    // ======================================

                    if (
                        statusCode ===
                        DisconnectReason.badSession
                    ) {

                        console.error(
                            "❌ WhatsApp authentication session is invalid."
                        );

                        console.error(
                            "The saved WhatsApp credentials need to be recreated."
                        );

                        return;
                    }

                    // ======================================
                    // RECONNECT
                    // ======================================

                    console.log(
                        "🔄 Reconnecting to WhatsApp in 5 seconds..."
                    );

                    clearTimeout(
                        reconnectTimer
                    );

                    reconnectTimer = setTimeout(
                        () => {
                            connectToWhatsApp()
                                .catch((error) => {
                                    console.error(
                                        "WhatsApp reconnect error:",
                                        error.message
                                    );
                                });
                        },
                        5000
                    );
                }
            }
        );

        connecting = false;

        return client;

    } catch (error) {

        connecting = false;
        sock = null;

        console.error(
            "❌ WhatsApp connection error:",
            error.message
        );

        return null;
    }
}

// ======================================================
// SEND WHATSAPP PAYMENT RECEIPT
// ======================================================

async function sendWhatsAppReceipt({
    recipientPhone,
    tenantName,
    amountPaid,
    mpesaReceiptNumber,
    pdfUrl
}) {

    try {

        const client =
            await connectToWhatsApp();

        if (!client) {

            console.error(
                "❌ WhatsApp is not connected. Receipt was not sent."
            );

            return;
        }

        // ==============================================
        // FORMAT PHONE NUMBER
        // ==============================================

        let formattedPhone =
            recipientPhone
                .toString()
                .trim()
                .replace(/[^0-9]/g, "");

        if (formattedPhone.startsWith("0")) {

            formattedPhone =
                "254" +
                formattedPhone.substring(1);
        }

        if (
            !formattedPhone.startsWith("254") ||
            formattedPhone.length !== 12
        ) {

            throw new Error(
                `Invalid Kenyan phone number: ${formattedPhone}`
            );
        }

        const jid =
            `${formattedPhone}@s.whatsapp.net`;

        // ==============================================
        // MESSAGE
        // ==============================================

        const messageBody =
            `*TILE REVIVE PAYMENT CONFIRMATION*\n` +
            `-----------------------------------\n` +
            `Hello *${tenantName}*,\n\n` +
            `We have received your payment of *KES ${Number(
                amountPaid
            ).toLocaleString()}*.\n\n` +
            `📌 *Receipt No:* ${mpesaReceiptNumber}\n` +
            `📄 *Download PDF Receipt:* ${pdfUrl}\n\n` +
            `Thank you for choosing Tile Revive Solutions.`;

        // ==============================================
        // SEND
        // ==============================================

        await client.sendMessage(
            jid,
            {
                text: messageBody
            }
        );

        console.log(
            `📲 WhatsApp receipt sent to ${formattedPhone}`
        );

    } catch (error) {

        console.error(
            "❌ WhatsApp dispatch error:",
            error.message
        );
    }
}

// ======================================================
// START WHATSAPP
// ======================================================

connectToWhatsApp().catch(
    (error) => {
        console.error(
            "❌ Initial WhatsApp connection error:",
            error.message
        );
    }
);

// ======================================================
// EXPORT
// ======================================================

module.exports =
    sendWhatsAppReceipt;