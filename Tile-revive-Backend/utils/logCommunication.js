const prisma = require("../db");

/**
 * Persistent Customer 360 communication logger.
 *
 * IMPORTANT:
 * Communication logging must never break the business operation.
 */
async function logCommunication({
    customerId,
    orderId = null,
    userId = null,
    type,
    recipient,
    subject = null,
    status = "SENT",
    messageId = null,
    errorMessage = null,
}) {
    try {
        if (!customerId) {
            console.warn(
                "COMMUNICATION LOG SKIPPED: missing customerId"
            );
            return null;
        }

        if (!type) {
            console.warn(
                "COMMUNICATION LOG SKIPPED: missing communication type"
            );
            return null;
        }

        if (!recipient) {
            console.warn(
                "COMMUNICATION LOG SKIPPED: missing recipient"
            );
            return null;
        }

        const record =
            await prisma.communicationlog.create({
                data: {
                    customerId: Number(customerId),
                    orderId:
                        orderId !== null
                            ? Number(orderId)
                            : null,
                    userId:
                        userId !== null
                            ? Number(userId)
                            : null,
                    type,
                    channel: "EMAIL",
                    recipient,
                    subject,
                    status,
                    messageId,
                    errorMessage:
                        errorMessage
                            ? String(errorMessage)
                            : null,
                },
            });

        console.log(
            "📋 COMMUNICATION LOG CREATED:",
            type,
            status,
            recipient
        );

        return record;
    } catch (error) {
        console.error(
            "⚠️ COMMUNICATION LOG ERROR:",
            error
        );

        // Communication history must NEVER break
        // the underlying order/payment operation.
        return null;
    }
}

module.exports = {
    logCommunication,
};
