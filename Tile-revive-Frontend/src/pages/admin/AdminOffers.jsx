import { useEffect, useState } from "react";
import {
    getAdminOffers,
    createAdminOffer,
    updateAdminOffer,
    deleteAdminOffer,
    getProducts,
} from "../../services/api";

import "./AdminOffers.css";

export default function AdminOffers() {
    const [offers, setOffers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        name: "",
        description: "",
        type: "FREE_PRODUCT",
        productId: "",
        quantity: 1,
        discountValue: "",
        status: "ACTIVE",
    });

    async function loadOffers() {
        try {
            setLoading(true);
            setError("");

            const [offerResponse, productResponse] = await Promise.all([
                getAdminOffers(),
                getProducts(),
            ]);

            setOffers(
                offerResponse?.offers ||
                offerResponse?.data?.offers ||
                offerResponse?.data ||
                offerResponse ||
                []
            );

            setProducts(
                productResponse?.products ||
                productResponse?.data?.products ||
                productResponse?.data ||
                productResponse ||
                []
            );
        } catch (err) {
            console.error("ADMIN OFFERS LOAD ERROR:", err);
            setError(err.message || "Failed to load offers.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadOffers();
    }, []);

    return (
        <div className="admin-offers-page">
            <div className="admin-offers-header">
                <div>
                    <h1>Offers</h1>
                    <p>
                        Create and manage reusable offers for admin orders.
                    </p>
                </div>

                <button
                    type="button"
                    className="admin-offers-create-btn"
                    onClick={() => {
                        setError("");
                        setShowCreateForm(true);
                    }}
                >
                    + Create Offer
                </button>
            </div>

            {error && (
                <div className="admin-offers-error">
                    {error}
                </div>
            )}

            {showCreateForm && (
                <div className="admin-offer-modal-backdrop">
                    <div className="admin-offer-modal">
                        <div className="admin-offer-modal-header">
                            <div>
                                <h2>Create Offer</h2>
                                <p>
                                    Save a reusable offer for admin orders.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="admin-offer-modal-close"
                                onClick={() => setShowCreateForm(false)}
                            >
                                ×
                            </button>
                        </div>

                        <form
                            onSubmit={async (event) => {
                                event.preventDefault();

                                try {
                                    setSaving(true);
                                    setError("");

                                    await createAdminOffer(form);

                                    setForm({
                                        name: "",
                                        description: "",
                                        type: "FREE_PRODUCT",
                                        productId: "",
                                        quantity: 1,
                                        discountValue: "",
                                        status: "ACTIVE",
                                    });

                                    setShowCreateForm(false);
                                    await loadOffers();
                                } catch (err) {
                                    console.error(
                                        "CREATE OFFER ERROR:",
                                        err
                                    );

                                    setError(
                                        err.message ||
                                        "Failed to create offer."
                                    );
                                } finally {
                                    setSaving(false);
                                }
                            }}
                        >
                            <div className="admin-offer-form-group">
                                <label>Offer Name</label>
                                <input
                                    type="text"
                                    value={form.name}
                                    placeholder="e.g. Free Cleaning Gloves"
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            name: event.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            <div className="admin-offer-form-group">
                                <label>Offer Type</label>
                                <select
                                    value={form.type}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            type: event.target.value,
                                            productId: "",
                                            discountValue: "",
                                        })
                                    }
                                >
                                    <option value="FREE_PRODUCT">
                                        Free Product
                                    </option>
                                    <option value="PERCENTAGE_DISCOUNT">
                                        Percentage Discount
                                    </option>
                                    <option value="FIXED_DISCOUNT">
                                        Fixed Discount
                                    </option>
                                </select>
                            </div>

                            {form.type === "FREE_PRODUCT" && (
                                <>
                                    <div className="admin-offer-form-group">
                                        <label>Free Product</label>

                                        <select
                                            value={form.productId}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    productId:
                                                        event.target.value,
                                                })
                                            }
                                            required
                                        >
                                            <option value="">
                                                Select a product
                                            </option>

                                            {products.map((product) => (
                                                <option
                                                    key={product.id}
                                                    value={product.id}
                                                >
                                                    {product.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="admin-offer-form-group">
                                        <label>Quantity</label>

                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={form.quantity}
                                            onChange={(event) =>
                                                setForm({
                                                    ...form,
                                                    quantity:
                                                        event.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </div>
                                </>
                            )}

                            {form.type !== "FREE_PRODUCT" && (
                                <div className="admin-offer-form-group">
                                    <label>
                                        {form.type ===
                                        "PERCENTAGE_DISCOUNT"
                                            ? "Discount Percentage"
                                            : "Discount Amount (KSh)"}
                                    </label>

                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.discountValue}
                                        placeholder={
                                            form.type ===
                                            "PERCENTAGE_DISCOUNT"
                                                ? "e.g. 10"
                                                : "e.g. 500"
                                        }
                                        onChange={(event) =>
                                            setForm({
                                                ...form,
                                                discountValue:
                                                    event.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                            )}

                            <div className="admin-offer-form-group">
                                <label>Description</label>

                                <textarea
                                    rows="3"
                                    value={form.description}
                                    placeholder="Optional description"
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            description:
                                                event.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="admin-offer-form-group">
                                <label>Status</label>

                                <select
                                    value={form.status}
                                    onChange={(event) =>
                                        setForm({
                                            ...form,
                                            status: event.target.value,
                                        })
                                    }
                                >
                                    <option value="ACTIVE">
                                        Active
                                    </option>
                                    <option value="INACTIVE">
                                        Inactive
                                    </option>
                                </select>
                            </div>

                            <div className="admin-offer-form-actions">
                                <button
                                    type="button"
                                    className="admin-offer-cancel-btn"
                                    onClick={() =>
                                        setShowCreateForm(false)
                                    }
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="admin-offer-save-btn"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : "Create Offer"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="admin-offers-empty">
                    Loading offers...
                </div>
            ) : offers.length === 0 ? (
                <div className="admin-offers-empty">
                    <h2>No offers yet</h2>
                    <p>
                        Create your first offer to use when making admin orders.
                    </p>
                </div>
            ) : (
                <div className="admin-offers-grid">
                    {offers.map((offer) => (
                        <div
                            className="admin-offer-card"
                            key={offer.id}
                        >
                            <div className="admin-offer-card-top">
                                <div>
                                    <h2>{offer.name}</h2>
                                    <span
                                        className={`admin-offer-status ${
                                            String(
                                                offer.status || ""
                                            ).toUpperCase() === "ACTIVE"
                                                ? "active"
                                                : "inactive"
                                        }`}
                                    >
                                        {offer.status || "ACTIVE"}
                                    </span>
                                </div>
                            </div>

                            <p className="admin-offer-type">
                                {String(
                                    offer.type || ""
                                ).replaceAll("_", " ")}
                            </p>

                            {offer.product && (
                                <p>
                                    Free product:{" "}
                                    <strong>
                                        {offer.product.name}
                                    </strong>
                                </p>
                            )}

                            {Number(offer.quantity || 0) > 0 && (
                                <p>
                                    Quantity:{" "}
                                    <strong>{offer.quantity}</strong>
                                </p>
                            )}

                            {Number(offer.discountValue || 0) > 0 && (
                                <p>
                                    Discount:{" "}
                                    <strong>
                                        {String(offer.type).toUpperCase() ===
                                        "PERCENTAGE_DISCOUNT"
                                            ? `${offer.discountValue}%`
                                            : `KSh ${Number(
                                                  offer.discountValue
                                              ).toLocaleString()}`}
                                    </strong>
                                </p>
                            )}

                            <div className="admin-offer-actions">
                                <button
                                    type="button"
                                    onClick={() => {
                                        alert(
                                            "Offer editing will be added next."
                                        );
                                    }}
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (
                                            !window.confirm(
                                                `Delete "${offer.name}"?`
                                            )
                                        ) {
                                            return;
                                        }

                                        try {
                                            await deleteAdminOffer(offer.id);
                                            await loadOffers();
                                        } catch (err) {
                                            setError(
                                                err.message ||
                                                    "Failed to delete offer."
                                            );
                                        }
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

