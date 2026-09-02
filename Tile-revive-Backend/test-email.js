require("dotenv").config();

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

async function testEmail() {

    try {

        console.log("📧 Testing SMTP...");

        await transporter.verify();

        console.log("✅ SMTP connection successful.");

        const info =
            await transporter.sendMail({

                from:
                    process.env.EMAIL_FROM,

                to:
                    "ericnjuma9@gmail.com",

                subject:
                    "Tile Revive Email Test",

                html: `
                    <h2>Tile Revive Solutions</h2>

                    <p>
                        This is a test email from
                        Tile Revive Solutions.
                    </p>

                    <p>
                        If you received this email,
                        the SMTP configuration is working.
                    </p>
                `
            });

        console.log(
            "✅ TEST EMAIL SENT"
        );

        console.log(
            "Message ID:",
            info.messageId
        );

    } catch (error) {

        console.error(
            "❌ EMAIL TEST FAILED"
        );

        console.error(
            error.message
        );
    }
}

testEmail();