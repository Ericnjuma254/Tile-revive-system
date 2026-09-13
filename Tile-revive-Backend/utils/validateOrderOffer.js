async function validateOrderOffer(offer, items, db) {

    if (!offer) {
        return {
            valid: true,
            offerDiscount: 0,
            items,
            offer: null,
        };
    }

    if (!db) {
        throw new Error(
            "Database connection is required for offer validation."
        );
    }

    const offerId = Number(
        offer.id ||
        offer.offerId
    );

    if (!Number.isInteger(offerId) || offerId <= 0) {
        throw new Error(
            "A valid saved offer ID is required."
        );
    }

    // ======================================================
    // LOAD SAVED OFFER
    // ======================================================

    const savedOffer =
        await db.offer.findUnique({
            where: {
                id: offerId,
            },

            include: {
                product: true,
            },
        });

    if (!savedOffer) {
        throw new Error(
            "Offer not found."
        );
    }

    if (
        String(savedOffer.status || "")
            .toUpperCase() !== "ACTIVE"
    ) {
        throw new Error(
            "This offer is not active."
        );
    }

    const offerType =
        String(savedOffer.type || "")
            .toUpperCase();

    // ======================================================
    // FREE PRODUCT
    // ======================================================

    if (
        offerType === "FREE_PRODUCT" ||
        offerType === "FREE_ITEM"
    ) {

        if (!savedOffer.productId) {
            throw new Error(
                "This offer does not have a free product assigned."
            );
        }

        if (!savedOffer.product) {
            throw new Error(
                "The free product could not be found."
            );
        }

        const quantity =
            Math.max(
                1,
                Number(savedOffer.quantity || 1)
            );

        if (
            Number(savedOffer.product.stock || 0) <
            quantity
        ) {
            throw new Error(
                `Insufficient stock for free product: ${savedOffer.product.name}.`
            );
        }

        const freeItem =
            items.find(
                (item) =>
                    Number(item.productId) ===
                        Number(savedOffer.productId) &&
                    Boolean(item.isFreeItem)
            );

        if (!freeItem) {
            throw new Error(
                `Offer requires ${savedOffer.product.name} as a free item.`
            );
        }

        freeItem.quantity = quantity;
        freeItem.unitPrice = 0;
        freeItem.isFreeItem = true;
        freeItem.offerName = savedOffer.name;

        return {
            valid: true,

            // Free items already have unitPrice = 0,
            // therefore they must NOT create an additional
            // financial discount.
            offerDiscount: 0,

            items,

            offer: savedOffer,
        };
    }

    // ======================================================
    // FIXED DISCOUNT
    // ======================================================

    if (
        offerType === "FIXED_DISCOUNT"
    ) {

        const requestedDiscount =
            Math.max(
                0,
                Number(
                    savedOffer.discountValue || 0
                )
            );

        const subtotal =
            items.reduce(
                (sum, item) => {

                    if (
                        Boolean(item.isFreeItem)
                    ) {
                        return sum;
                    }

                    return (
                        sum +
                        Number(item.unitPrice || 0) *
                        Number(item.quantity || 0)
                    );
                },
                0
            );

        const discount =
            Math.min(
                requestedDiscount,
                subtotal
            );

        return {
            valid: true,
            offerDiscount: discount,
            items,
            offer: savedOffer,
        };
    }

    // ======================================================
    // PERCENTAGE DISCOUNT
    // ======================================================

    if (
        offerType ===
        "PERCENTAGE_DISCOUNT"
    ) {

        const percentage =
            Math.min(
                100,
                Math.max(
                    0,
                    Number(
                        savedOffer.discountValue || 0
                    )
                )
            );

        const subtotal =
            items.reduce(
                (sum, item) => {

                    if (
                        Boolean(item.isFreeItem)
                    ) {
                        return sum;
                    }

                    return (
                        sum +
                        Number(item.unitPrice || 0) *
                        Number(item.quantity || 0)
                    );
                },
                0
            );

        const discount =
            subtotal *
            (percentage / 100);

        return {
            valid: true,
            offerDiscount: discount,
            items,
            offer: savedOffer,
        };
    }

    throw new Error(
        `Unsupported offer type: ${savedOffer.type}`
    );
}

module.exports = {
    validateOrderOffer,
};
