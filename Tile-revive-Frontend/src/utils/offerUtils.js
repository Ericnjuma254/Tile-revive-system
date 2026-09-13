export function calculateOrderTotals(items = [], deliveryFee = 0) {
    const subtotal = items.reduce((sum, item) => {
        if (item.isFreeItem) return sum;

        return (
            sum +
            Number(item.unitPrice || item.price || 0) *
                Number(item.quantity || 1)
        );
    }, 0);

    const freeItemValue = items.reduce((sum, item) => {
        if (!item.isFreeItem) return sum;

        return (
            sum +
            Number(item.unitPrice || item.price || 0) *
                Number(item.quantity || 1)
        );
    }, 0);

    const total = subtotal + Number(deliveryFee || 0);

    return {
        subtotal,
        freeItemValue,
        deliveryFee: Number(deliveryFee || 0),
        total,
    };
}

export function buildOfferFreeItem(offer) {
    if (!offer?.freeProduct) return null;

    return {
        productId: offer.freeProduct.id,
        quantity: 1,
        unitPrice: 0,
        isFreeItem: true,
        offerName: offer.name,
    };
}
