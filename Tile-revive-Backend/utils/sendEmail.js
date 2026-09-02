require("dotenv").config();
const nodemailer = require("nodemailer");
const path = require("path");

// ======================================================
// EMAIL TRANSPORTER
// ======================================================

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});


// ======================================================
// SEND ORDER PLACED NOTIFICATION
// INTERNAL BUSINESS EMAIL
// ======================================================

async function sendNewOrderNotification({
    orderNumber,
    customerName,
    customerPhone,
    customerEmail,
    county,
    location,
    items,
    totalAmount,
    paymentMethod,
    paymentStatus,
    orderStatus
}) {

    const businessEmail =
        process.env.EMAIL_USER;

    if (!businessEmail) {

        console.log(
            "⚠️ EMAIL_USER not configured. Skipping order notification."
        );

        return;
    }

    // ==================================================
    // BUILD PRODUCT TABLE
    // ==================================================

    const productRows =
        Array.isArray(items)
            ? items.map(item => {

                const productName =
                    item.product?.name ||
                    item.productName ||
                    "Product";

                const quantity =
                    Number(item.quantity || 0);

                const unitPrice =
                    Number(item.unitPrice || 0);

                const itemTotal =
                    quantity * unitPrice;

                return `
                    <tr>

                        <td style="
                            padding:10px;
                            border-bottom:1px solid #ddd;
                        ">
                            ${productName}
                        </td>

                        <td style="
                            padding:10px;
                            text-align:center;
                            border-bottom:1px solid #ddd;
                        ">
                            ${quantity}
                        </td>

                        <td style="
                            padding:10px;
                            text-align:right;
                            border-bottom:1px solid #ddd;
                        ">
                            KES ${unitPrice.toLocaleString()}
                        </td>

                        <td style="
                            padding:10px;
                            text-align:right;
                            border-bottom:1px solid #ddd;
                        ">
                            KES ${itemTotal.toLocaleString()}
                        </td>

                    </tr>
                `;

            }).join("")
            : `
                <tr>
                    <td colspan="4">
                        No products found
                    </td>
                </tr>
            `;

    // ==================================================
    // EMAIL
    // ==================================================

    const mailOptions = {

        // Sender
        from:
            process.env.EMAIL_FROM ||
            `"Tile Revive Solutions" <${process.env.EMAIL_USER}>`,

        // IMPORTANT:
        // This is YOUR business email.
        to:
            businessEmail,

        subject:
            `🛒 Order Placed - ${orderNumber}`,

        html: `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
Order Placed - ${orderNumber}
</title>

</head>

<body style="
    margin:0;
    padding:30px;
    background:#f5f5f5;
    font-family:Arial,sans-serif;
">

<div style="
    max-width:700px;
    margin:auto;
    background:white;
    padding:30px;
    border-radius:10px;
">

    <h2 style="
        color:#273244;
        margin-top:0;
    ">
        🛒 NEW ORDER PLACED
    </h2>

    <p>
        A new order has been placed on
        <strong>Tile Revive Solutions</strong>.
    </p>

    <hr>

    <h3>
        ORDER INFORMATION
    </h3>

    <table style="
        width:100%;
        border-collapse:collapse;
    ">

        <tr>
            <td style="padding:8px 0;">
                <strong>Order Number</strong>
            </td>

            <td style="padding:8px 0;">
                ${orderNumber || "N/A"}
            </td>
        </tr>

        <tr>
            <td style="padding:8px 0;">
                <strong>Order Status</strong>
            </td>

            <td style="
                padding:8px 0;
                color:#d97706;
                font-weight:bold;
            ">
                ${orderStatus || "PENDING"}
            </td>
        </tr>

        <tr>
            <td style="padding:8px 0;">
                <strong>Payment Status</strong>
            </td>

            <td style="padding:8px 0;">
                ${paymentStatus || "PENDING"}
            </td>
        </tr>

        <tr>
            <td style="padding:8px 0;">
                <strong>Payment Method</strong>
            </td>

            <td style="padding:8px 0;">
                ${paymentMethod || "N/A"}
            </td>
        </tr>

    </table>

    <hr>

    <h3>
        CUSTOMER INFORMATION
    </h3>

    <table style="
        width:100%;
        border-collapse:collapse;
    ">

        <tr>
            <td style="padding:8px 0;">
                <strong>Name</strong>
            </td>

            <td style="padding:8px 0;">
                ${customerName || "N/A"}
            </td>
        </tr>

        <tr>
            <td style="padding:8px 0;">
                <strong>Phone</strong>
            </td>

            <td style="padding:8px 0;">
                ${customerPhone || "N/A"}
            </td>
        </tr>

        <tr>
            <td style="padding:8px 0;">
                <strong>Email</strong>
            </td>

            <td style="padding:8px 0;">
                ${customerEmail || "N/A"}
            </td>
        </tr>

        <tr>
            <td style="padding:8px 0;">
                <strong>County</strong>
            </td>

            <td style="padding:8px 0;">
                ${county || "N/A"}
            </td>
        </tr>

        <tr>
            <td style="padding:8px 0;">
                <strong>Final Delivery Location</strong>
            </td>

            <td style="padding:8px 0;">
                ${location || "N/A"}
            </td>
        </tr>

    </table>

    <hr>

    <h3>
        ORDER ITEMS
    </h3>

    <table style="
        width:100%;
        border-collapse:collapse;
    ">

        <thead>

            <tr style="
                background:#374151;
                color:white;
            ">

                <th style="
                    padding:10px;
                    text-align:left;
                ">
                    Product
                </th>

                <th style="
                    padding:10px;
                    text-align:center;
                ">
                    Qty
                </th>

                <th style="
                    padding:10px;
                    text-align:right;
                ">
                    Unit Price
                </th>

                <th style="
                    padding:10px;
                    text-align:right;
                ">
                    Total
                </th>

            </tr>

        </thead>

        <tbody>

            ${productRows}

        </tbody>

    </table>

    <hr>

    <div style="
        text-align:right;
        font-size:18px;
        font-weight:bold;
    ">

        TOTAL ORDER:

        <span style="color:#00a878;">
            KES ${Number(totalAmount || 0).toLocaleString()}
        </span>

    </div>

    <hr>

    <p style="
        color:#6b7280;
        font-size:13px;
    ">

        This is an internal order notification
        for Tile Revive Solutions.

    </p>

</div>

</body>

</html>
`
    };

    // ==================================================
    // SEND INTERNAL BUSINESS EMAIL
    // ==================================================

    const info =
        await transporter.sendMail(
            mailOptions
        );

    console.log(
        "======================================"
    );

    console.log(
        "📧 ORDER PLACED EMAIL SENT"
    );

    console.log(
        "To:",
        businessEmail
    );

    console.log(
        "Subject:",
        mailOptions.subject
    );

    console.log(
        "Message ID:",
        info.messageId
    );

    console.log(
        "======================================"
    );

    return info;
};

// ======================================================
// SEND ORDER CONFIRMATION
// CUSTOMER EMAIL
// ======================================================

async function sendOrderConfirmation({
    customerEmail,
    customerName,
    orderNumber,
    customerPhone,
    county,
    location,
    items,
    totalAmount,
    paymentMethod,
    paymentStatus,
    orderStatus
}) {

    if (!customerEmail) {

        console.log(
            "⚠️ No customer email. Skipping customer order confirmation."
        );

        return;
    }

    // ==================================================
    // BUILD PRODUCT TABLE
    // ==================================================

    const productRows =
        Array.isArray(items)
            ? items.map(item => {

                const productName =
                    item.product?.name ||
                    item.productName ||
                    "Product";

                const quantity =
                    Number(item.quantity || 0);

                const unitPrice =
                    Number(item.unitPrice || 0);

                const itemTotal =
                    quantity * unitPrice;

                return `
                    <tr>

                        <td style="
                            padding:10px;
                            border-bottom:1px solid #ddd;
                        ">
                            ${productName}
                        </td>

                        <td style="
                            padding:10px;
                            text-align:center;
                            border-bottom:1px solid #ddd;
                        ">
                            ${quantity}
                        </td>

                        <td style="
                            padding:10px;
                            text-align:right;
                            border-bottom:1px solid #ddd;
                        ">
                            KES ${unitPrice.toLocaleString()}
                        </td>

                        <td style="
                            padding:10px;
                            text-align:right;
                            border-bottom:1px solid #ddd;
                        ">
                            KES ${itemTotal.toLocaleString()}
                        </td>

                    </tr>
                `;

            }).join("")
            : `
                <tr>
                    <td colspan="4">
                        No products found
                    </td>
                </tr>
            `;

    // ==================================================
    // EMAIL
    // ==================================================

    const mailOptions = {

        from:
            process.env.EMAIL_FROM ||
            `"Tile Revive Solutions" <${process.env.EMAIL_USER}>`,

        to:
            customerEmail,

        subject:
            `Order Received - ${orderNumber}`,

        html: `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
Order Received - ${orderNumber}
</title>

</head>

<body style="
    margin:0;
    padding:30px;
    background:#f5f5f5;
    font-family:Arial,sans-serif;
">

<div style="
    max-width:700px;
    margin:auto;
    background:white;
    padding:30px;
    border-radius:10px;
">

    <h2 style="
        color:#273244;
        margin-top:0;
    ">
        🛒 ORDER RECEIVED
    </h2>

    <p>
        Hello
        <strong>${customerName || "Customer"}</strong>,
    </p>

    <p>
        Thank you for shopping with
        <strong>Tile Revive Solutions</strong>.
    </p>

    <p>
        We have successfully received your order.
        Your order is now being processed.
    </p>

    <div style="
        background:#f0fdf4;
        border-left:5px solid #00a878;
        padding:15px;
        margin:20px 0;
    ">

        <strong>
            Order Number:
        </strong>

        ${orderNumber}

        <br>

        <strong>
            Order Status:
        </strong>

        ${orderStatus || "PENDING"}

        <br>

        <strong>
            Payment Status:
        </strong>

        ${paymentStatus || "PENDING"}

    </div>

    <hr>

    <h3>
        ORDER DETAILS
    </h3>

    <table style="
        width:100%;
        border-collapse:collapse;
    ">

        <thead>

            <tr style="
                background:#374151;
                color:white;
            ">

                <th style="
                    padding:10px;
                    text-align:left;
                ">
                    Product
                </th>

                <th style="
                    padding:10px;
                    text-align:center;
                ">
                    Qty
                </th>

                <th style="
                    padding:10px;
                    text-align:right;
                ">
                    Unit Price
                </th>

                <th style="
                    padding:10px;
                    text-align:right;
                ">
                    Total
                </th>

            </tr>

        </thead>

        <tbody>

            ${productRows}

        </tbody>

    </table>

    <hr>

    <div style="
        text-align:right;
        font-size:18px;
        font-weight:bold;
    ">

        TOTAL:

        <span style="color:#00a878;">
            KES ${Number(totalAmount || 0).toLocaleString()}
        </span>

    </div>

    <hr>

    <h3>
        DELIVERY INFORMATION
    </h3>

    <p>
        <strong>Phone:</strong>
        ${customerPhone || "N/A"}
    </p>

    <p>
        <strong>County:</strong>
        ${county || "N/A"}
    </p>

    <p>
        <strong>Delivery Location:</strong>
        ${location || "N/A"}
    </p>

    <hr>

    <p>
        <strong>Payment Method:</strong>
        ${paymentMethod || "N/A"}
    </p>

    <p style="
        color:#6b7280;
        font-size:13px;
    ">

        Your payment receipt will be sent to this
        email after successful payment.

    </p>

    <p>
        Thank you for choosing
        <strong>Tile Revive Solutions</strong>.
    </p>

    <p>
        Regards,<br>
        <strong>Tile Revive Solutions</strong>
    </p>

</div>

</body>

</html>
`
    };

    const info =
        await transporter.sendMail(
            mailOptions
        );

    console.log(
        "======================================"
    );

    console.log(
        "📧 CUSTOMER ORDER CONFIRMATION SENT"
    );

    console.log(
        "To:",
        customerEmail
    );

    console.log(
        "Order:",
        orderNumber
    );

    console.log(
        "Message ID:",
        info.messageId
    );

    console.log(
        "======================================"
    );

    return info;
}

// ======================================================
// SEND PAYMENT CONFIRMATION
// CUSTOMER EMAIL
// ======================================================

async function sendPaymentConfirmation({
    customerEmail,
    customerName,
    orderNumber,
    amount,
    mpesaReceiptNumber,
    phoneNumber,
    productName,
    quantity,
    receiptPath
}) {

    if (!customerEmail) {

        console.log(
            "⚠️ No customer email. Skipping email."
        );

        return;
    }

    const attachments = [];

if (receiptPath) {

    const receiptFilename =
        path.basename(receiptPath);

    attachments.push({
        filename: receiptFilename,
        path: receiptPath,
        contentType: "application/pdf"
    });

    console.log(
        "📎 PDF receipt attached:",
        receiptPath
    );

    console.log(
        "📎 Email attachment filename:",
        receiptFilename
    );

} else {

    console.log(
        "⚠️ No receipt PDF path provided."
    );
}

    const mailOptions = {

        from:
            process.env.EMAIL_FROM ||
            `"Tile Revive Solutions" <${process.env.EMAIL_USER}>`,

        // CUSTOMER EMAIL
        to:
            customerEmail,

        subject:
            `Payment Confirmed - ${orderNumber}`,

        html: `
<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
Payment Confirmation
</title>

</head>

<body style="
    font-family:Arial,sans-serif;
    background:#f5f5f5;
    padding:30px;
">

<div style="
    max-width:600px;
    margin:auto;
    background:white;
    padding:30px;
    border-radius:10px;
">

    <h2 style="color:#273244;">
        Payment Successful
    </h2>

    <p>
        Hello ${customerName || "Customer"},
    </p>

    <p>
        Thank you for your purchase from
        <strong>Tile Revive Solutions</strong>.
    </p>

    <p>
        Your M-PESA payment has been
        successfully received.
    </p>

    <hr>

    <h3>
        Order Details
    </h3>

    <table style="
        width:100%;
        border-collapse:collapse;
    ">

        <tr>
            <td style="padding:8px 0;">
                <strong>Order Number</strong>
            </td>

            <td style="padding:8px 0;">
                ${orderNumber || "N/A"}
            </td>
        </tr>

        <tr>
            <td style="padding:8px 0;">
                <strong>Product</strong>
            </td>

            <td style="padding:8px 0;">
                ${productName || "Order"}
            </td>
        </tr>

        <tr>
            <td style="padding:8px 0;">
                <strong>Quantity</strong>
            </td>

            <td style="padding:8px 0;">
                ${quantity || "N/A"}
            </td>
        </tr>

        <tr>
            <td style="padding:8px 0;">
                <strong>Amount Paid</strong>
            </td>

            <td style="padding:8px 0;">
                KES ${Number(amount || 0).toLocaleString()}
            </td>
        </tr>

        <tr>
            <td style="padding:8px 0;">
                <strong>M-PESA Receipt</strong>
            </td>

            <td style="padding:8px 0;">
                ${mpesaReceiptNumber || "N/A"}
            </td>
        </tr>

        <tr>
            <td style="padding:8px 0;">
                <strong>Phone</strong>
            </td>

            <td style="padding:8px 0;">
                ${phoneNumber || "N/A"}
            </td>
        </tr>

    </table>

    <hr>

    <p>
        Your order has been marked as
        <strong style="color:#00a878;">
            PAID
        </strong>.
    </p>

    <p>
        Your official payment receipt is attached
        to this email as a PDF.
    </p>

    <p>
        Thank you for choosing
        <strong>Tile Revive Solutions</strong>.
    </p>

    <p>
        Regards,<br>
        <strong>Tile Revive Solutions</strong>
    </p>

</div>

</body>

</html>
`,

        attachments
    };

    const info =
        await transporter.sendMail(
            mailOptions
        );

    console.log(
        "======================================"
    );

    console.log(
        "📧 PAYMENT EMAIL SENT"
    );

    console.log(
        "To:",
        customerEmail
    );

    console.log(
        "Subject:",
        mailOptions.subject
    );

    console.log(
        "📎 Receipt attached:",
        receiptPath || "NO PDF"
    );

    console.log(
        "Message ID:",
        info.messageId
    );

    console.log(
        "======================================"
    );

    return info;
}

async function sendCustomerOtpEmail({
    email,
    customerName,
    otp
}) {
    if (!process.env.EMAIL_USER) {
        throw new Error("EMAIL_USER is not configured");
    }

    await transporter.sendMail({
        from: `"Tile Revive Solutions" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your Tile Revive verification code",
        html: `
            <div style="
                font-family: Arial, sans-serif;
                max-width: 600px;
                margin: auto;
                padding: 30px;
                color: #222;
            ">

                <h2 style="margin-bottom: 10px;">
                    Welcome to Tile Revive
                </h2>

                <p>
                    Hello ${customerName || "Customer"},
                </p>

                <p>
                    Use the verification code below to sign in
                    to your Tile Revive account.
                </p>

                <div style="
                    background:#f1f8ff;
                    border-radius:12px;
                    padding:20px;
                    text-align:center;
                    margin:25px 0;
                ">
                    <div style="
                        font-size:32px;
                        font-weight:bold;
                        letter-spacing:8px;
                    ">
                        ${otp}
                    </div>
                </div>

                <p>
                    This code expires in <strong>10 minutes</strong>
                    and can only be used once.
                </p>

                <p style="color:#777;font-size:13px;">
                    If you did not request this code, you can safely
                    ignore this email.
                </p>

                <hr>

                <p style="font-size:13px;color:#777;">
                    Tile Revive Solutions
                </p>

            </div>
        `
    });
}

// ======================================================
// SEND ORDER STATUS UPDATE
// CUSTOMER EMAIL
// ======================================================

async function sendOrderStatusUpdate({
    customerEmail,
    customerName,
    orderNumber,
    orderStatus,
    previousStatus,
    totalAmount
}) {

    if (!customerEmail) {

        console.log(
            "⚠️ No customer email. Skipping order status email."
        );

        return null;
    }

    const formattedStatus =
        String(orderStatus || "PENDING")
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, letter =>
                letter.toUpperCase()
            );

    const formattedPreviousStatus =
        previousStatus
            ? String(previousStatus)
                .replaceAll("_", " ")
                .toLowerCase()
                .replace(/\b\w/g, letter =>
                    letter.toUpperCase()
                )
            : null;

    let title = "Order Status Updated";
    let message =
        "Your order status has been updated.";

    switch (orderStatus) {

        case "PENDING":

            title = "Order Pending";
            message =
                "Your order has been received and is currently pending.";

            break;

        case "PROCESSING":

            title = "Order Being Processed";
            message =
                "Great news! We have started processing your order.";

            break;

        case "READY":

            title = "Your Order Is Ready";
            message =
                "Your order is ready and waiting for the next step.";

            break;

        case "OUT_FOR_DELIVERY":

            title = "Your Order Is Out for Delivery";
            message =
                "Your order is now out for delivery. Please keep your phone available.";

            break;

        case "DELIVERED":

            title = "Order Delivered";
            message =
                "Your order has been successfully marked as delivered.";

            break;

        case "CANCELLED":

            title = "Order Cancelled";
            message =
                "Your order has been cancelled. Please contact Tile Revive Solutions if you need assistance.";

            break;

        default:

            title = "Order Status Updated";
            message =
                "Your order status has been updated.";

            break;
    }

    const mailOptions = {

        from:
            process.env.EMAIL_FROM ||
            `"Tile Revive Solutions" <${process.env.EMAIL_USER}>`,

        to: customerEmail,

        subject:
            `${title} - ${orderNumber}`,

        html: `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
${title}
</title>

</head>

<body style="
    margin:0;
    padding:30px;
    background:#f5f5f5;
    font-family:Arial,sans-serif;
">

<div style="
    max-width:650px;
    margin:auto;
    background:white;
    padding:35px;
    border-radius:14px;
">

    <h2 style="
        color:#273244;
        margin-top:0;
    ">
        ${title}
    </h2>

    <p>
        Hello
        <strong>${customerName || "Customer"}</strong>,
    </p>

    <p>
        ${message}
    </p>

    <div style="
        background:#f1f8ff;
        border-radius:12px;
        padding:20px;
        margin:25px 0;
    ">

        <p style="margin:0 0 10px;">
            <strong>Order Number:</strong>
            ${orderNumber || "N/A"}
        </p>

        ${
            formattedPreviousStatus
                ? `
        <p style="margin:0 0 10px;">
            <strong>Previous Status:</strong>
            ${formattedPreviousStatus}
        </p>
        `
                : ""
        }

        <p style="margin:0 0 10px;">
            <strong>Current Status:</strong>
            ${formattedStatus}
        </p>

        <p style="margin:0;">
            <strong>Order Total:</strong>
            KES ${Number(totalAmount || 0).toLocaleString()}
        </p>

    </div>

    <p>
        Thank you for choosing
        <strong>Tile Revive Solutions</strong>.
    </p>

    <p>
        We will continue to keep you updated about your order.
    </p>

    <hr>

    <p style="
        color:#777;
        font-size:13px;
    ">
        Tile Revive Solutions
    </p>

</div>

</body>

</html>

`
    };

    try {

        const info =
            await transporter.sendMail(
                mailOptions
            );

        console.log(
            "======================================"
        );

        console.log(
            "📧 ORDER STATUS EMAIL SENT"
        );

        console.log(
            "Customer:",
            customerEmail
        );

        console.log(
            "Order:",
            orderNumber
        );

        console.log(
            "Status:",
            orderStatus
        );

        console.log(
            "Message ID:",
            info.messageId
        );

        console.log(
            "======================================"
        );

        return info;

    } catch (error) {

        console.error(
            "❌ ORDER STATUS EMAIL ERROR:",
            error
        );

        // IMPORTANT:
        // Do not make the admin status update fail
        // just because email failed.

        return null;
    }
}


// ======================================================
// SEND PAYMENT STATUS UPDATE
// CUSTOMER EMAIL
// ======================================================

async function sendPaymentStatusUpdate({
    customerEmail,
    customerName,
    orderNumber,
    paymentStatus,
    previousPaymentStatus,
    amount,
    paymentMethod
}) {

    if (!customerEmail) {

        console.log(
            "⚠️ No customer email. Skipping payment status email."
        );

        return null;
    }

    const formattedStatus =
        String(paymentStatus || "PENDING")
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(/\b\w/g, letter =>
                letter.toUpperCase()
            );

    const formattedPreviousStatus =
        previousPaymentStatus
            ? String(previousPaymentStatus)
                .replaceAll("_", " ")
                .toLowerCase()
                .replace(/\b\w/g, letter =>
                    letter.toUpperCase()
                )
            : null;

    let title =
        "Payment Status Updated";

    let message =
        "Your payment status has been updated.";

    switch (paymentStatus) {

        case "SUCCESS":

            title =
                "Payment Confirmed";

            message =
                "Your payment has been successfully confirmed.";

            break;

        case "PENDING":

            title =
                "Payment Pending";

            message =
                "Your payment is currently pending.";

            break;

        case "FAILED":

            title =
                "Payment Failed";

            message =
                "Unfortunately, your payment was not successful.";

            break;

        case "CANCELLED":

            title =
                "Payment Cancelled";

            message =
                "The payment associated with your order has been cancelled.";

            break;

        default:

            break;
    }

    const mailOptions = {

        from:
            process.env.EMAIL_FROM ||
            `"Tile Revive Solutions" <${process.env.EMAIL_USER}>`,

        to: customerEmail,

        subject:
            `${title} - ${orderNumber}`,

        html: `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<title>
${title}
</title>

</head>

<body style="
    margin:0;
    padding:30px;
    background:#f5f5f5;
    font-family:Arial,sans-serif;
">

<div style="
    max-width:650px;
    margin:auto;
    background:white;
    padding:35px;
    border-radius:14px;
">

    <h2 style="
        color:#273244;
        margin-top:0;
    ">
        ${title}
    </h2>

    <p>
        Hello
        <strong>${customerName || "Customer"}</strong>,
    </p>

    <p>
        ${message}
    </p>

    <div style="
        background:#f1f8ff;
        border-radius:12px;
        padding:20px;
        margin:25px 0;
    ">

        <p>
            <strong>Order Number:</strong>
            ${orderNumber || "N/A"}
        </p>

        ${
            formattedPreviousStatus
                ? `
        <p>
            <strong>Previous Payment Status:</strong>
            ${formattedPreviousStatus}
        </p>
        `
                : ""
        }

        <p>
            <strong>Current Payment Status:</strong>
            ${formattedStatus}
        </p>

        <p>
            <strong>Amount:</strong>
            KES ${Number(amount || 0).toLocaleString()}
        </p>

        <p>
            <strong>Payment Method:</strong>
            ${paymentMethod || "N/A"}
        </p>

    </div>

    <p>
        Thank you for choosing
        <strong>Tile Revive Solutions</strong>.
    </p>

    <hr>

    <p style="
        color:#777;
        font-size:13px;
    ">
        Tile Revive Solutions
    </p>

</div>

</body>

</html>

`
    };

    try {

        const info =
            await transporter.sendMail(
                mailOptions
            );

        console.log(
            "======================================"
        );

        console.log(
            "📧 PAYMENT STATUS EMAIL SENT"
        );

        console.log(
            "Customer:",
            customerEmail
        );

        console.log(
            "Order:",
            orderNumber
        );

        console.log(
            "Payment Status:",
            paymentStatus
        );

        console.log(
            "Message ID:",
            info.messageId
        );

        console.log(
            "======================================"
        );

        return info;

    } catch (error) {

        console.error(
            "❌ PAYMENT STATUS EMAIL ERROR:",
            error
        );

        return null;
    }
}

// ======================================================
// EXPORTS
// ======================================================

module.exports = {

    sendPaymentConfirmation,

    sendNewOrderNotification,

    sendOrderConfirmation,

    sendCustomerOtpEmail

};