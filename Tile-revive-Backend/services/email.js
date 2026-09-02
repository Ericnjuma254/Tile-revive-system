const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === "true",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

async function sendLoginCode(email, code) {

    await transporter.sendMail({
        from: `"Tile Revive Solutions" <${process.env.EMAIL_USER}>`,
        to: email,

        subject: "Your Tile Revive verification code",

        text: `Your Tile Revive verification code is ${code}. This code expires in 10 minutes.`,

        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">

                <h2>Tile Revive Solutions</h2>

                <p>Your verification code is:</p>

                <h1 style="letter-spacing: 6px;">
                    ${code}
                </h1>

                <p>
                    This code expires in 10 minutes.
                </p>

                <p>
                    If you did not request this code,
                    you can safely ignore this email.
                </p>

            </div>
        `
    });
}

module.exports = {
    sendLoginCode
};