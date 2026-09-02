require("dotenv").config();

const generatePdfReceipt = require("./generateReceipt");
const {
    sendPaymentConfirmation
} = require("./utils/sendEmail");

const receiptData = {

    customerName: "Test Customer",

    phoneNumber: "0758804676",

    email: "ericnjuma9@gmail.com",

    orderNumber: "ORD_001",

    orderItems: [

        {
            productName: "Tile Revive 5L",
            quantity: 2,
            unitPrice: 1500
        },

        {
            productName: "Drain Buster 5L",
            quantity: 1,
            unitPrice: 1200
        }

    ],

    amountPaid: 4200,

    paymentMethod: "MPESA",

    status: "SUCCESS",

    mpesaReceiptNumber: "TEST123456",

    checkoutRequestId: "ws_CO_TEST123",

    merchantRequestId: "TEST_MERCHANT_123",

    location: "Nairobi"
};

console.log("======================================");
console.log("🧾 STARTING RECEIPT + EMAIL TEST");
console.log("======================================");

async function runTest() {

    try {

        // ==================================================
        // GENERATE PDF
        // ==================================================

        console.log("");
        console.log("🧾 GENERATING PDF RECEIPT...");
        console.log("");

        const filePath =
            await generatePdfReceipt(receiptData);

        console.log("");
        console.log("======================================");
        console.log("✅ PDF RECEIPT CREATED");
        console.log("======================================");

        console.log(
            "File:",
            filePath
        );

        // ==================================================
        // SEND EMAIL
        // ==================================================

        console.log("");
        console.log("======================================");
        console.log("📧 SENDING TEST EMAIL");
        console.log("======================================");

        console.log(
            "To:",
            receiptData.email
        );

        const emailResult =
            await sendPaymentConfirmation({

                customerEmail:
                    receiptData.email,

                customerName:
                    receiptData.customerName,

                orderNumber:
                    receiptData.orderNumber,

                amount:
                    receiptData.amountPaid,

                mpesaReceiptNumber:
                    receiptData.mpesaReceiptNumber,

                phoneNumber:
                    receiptData.phoneNumber,

                productName:
                    "Tile Revive 5L, Drain Buster 5L",

                quantity:
                    3,

                receiptPath:
                    filePath
            });

        console.log("");
        console.log("======================================");
        console.log("✅ TEST EMAIL SENT");
        console.log("======================================");

        console.log(
            "Message ID:",
            emailResult.messageId
        );

        console.log(
            "📎 Attached PDF:",
            filePath
        );

        console.log("======================================");

    } catch (error) {

        console.error("");
        console.error("======================================");
        console.error("❌ RECEIPT + EMAIL TEST FAILED");
        console.error("======================================");

        console.error(
            error.message
        );

        console.error(
            error.stack
        );

        console.error("======================================");

    }
}

runTest();