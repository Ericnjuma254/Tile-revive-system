import { useMemo, useState } from "react";

export default function OfferSelector({
    products = [],
    items = [],
    onApply,
    onRemove,
}) {
    const [selectedCode, setSelectedCode] = useState("");

    const offers = useMemo(() => {
        const premium = products.find(
            (p) =>
                String(p.name || "")
                    .toLowerCase()
                    .includes("premium") &&
                String(p.name || "").includes("5")
        );

        const lavenda = products.find(
            (p) =>
                String(p.name || "")
                    .toLowerCase()
                    .includes("lavenda") &&
                String(p.name || "").includes("5")
        );

        const drain = products.find((p) =>
            String(p.name || "")
                .toLowerCase()
                .includes("drain buster")
        );

        return [
            premium && drain
                ? {
                      code: "PREMIUM-DRAIN",
                      name: "Premium + Drain Buster",
                      description:
                          "Buy Premium 5L and get Drain Buster free",
                      triggerProduct: premium,
                      freeProduct: drain,
                  }
                : null,

            lavenda && drain
                ? {
                      code: "LAVENDA-DRAIN",
                      name: "Lavenda + Drain Buster",
                      description:
                          "Buy Lavenda 5L and get Drain Buster free",
                      triggerProduct: lavenda,
                      freeProduct: drain,
                  }
                : null,
        ].filter(Boolean);
    }, [products]);

    const apply = () => {
        const offer = offers.find((o) => o.code === selectedCode);

        if (!offer) return;

        const triggerExists = items.some(
            (item) =>
                Number(item.productId) ===
                Number(offer.triggerProduct.id)
        );

        if (!triggerExists) {
            alert(
                `Add ${offer.triggerProduct.name} to the order first.`
            );
            return;
        }

        onApply({
            code: offer.code,
            name: offer.name,
            description: offer.description,
            freeProduct: offer.freeProduct,
        });
    };

    if (!offers.length) return null;

    return (
        <div className="offer-selector">
            <h3>Offers</h3>

            <select
                value={selectedCode}
                onChange={(e) => setSelectedCode(e.target.value)}
            >
                <option value="">Select an offer</option>

                {offers.map((offer) => (
                    <option key={offer.code} value={offer.code}>
                        {offer.name}
                    </option>
                ))}
            </select>

            {selectedCode && (
                <button type="button" onClick={apply}>
                    Apply Offer
                </button>
            )}

            {selectedCode && (
                <button type="button" onClick={onRemove}>
                    Remove Offer
                </button>
            )}
        </div>
    );
}
