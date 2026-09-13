import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    getAdminCustomers,
    getProducts,
    getAdminOffers,
    createAdminOrder,
    createCustomer,
} from "../../services/api";

import "./AdminCreateOrder.css";

export default function AdminCreateOrder() {
    const navigate = useNavigate();

    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [savedOffers, setSavedOffers] = useState([]);

    const [customerId, setCustomerId] = useState("");
    const [items, setItems] = useState([]);

    const [selectedProductId, setSelectedProductId] = useState("");
    const [quantity, setQuantity] = useState(1);

    const [paymentMethod, setPaymentMethod] = useState("COD");

    const [offer, setOffer] = useState(null);

    const [discountType, setDiscountType] = useState("PERCENTAGE");
    const [discountValue, setDiscountValue] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const [showCustomerModal, setShowCustomerModal] =
        useState(false);

    const [showOfferModal, setShowOfferModal] =
        useState(false);

    const [offerSaving, setOfferSaving] =
        useState(false);

    const [offerForm, setOfferForm] = useState({
        name: "",
        description: "",
        type: "FREE_PRODUCT",
        productId: "",
        quantity: 1,
        discountValue: "",
        status: "ACTIVE",
    });

    const [newCustomer, setNewCustomer] = useState({
        fullName: "",
        phoneNumber: "",
        email: "",
    });

    const [creatingCustomer, setCreatingCustomer] =
        useState(false);

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true);
                setError("");

                const [
                    customerResponse,
                    productResponse,
                    offerResponse,
                ] = await Promise.all([
                    getAdminCustomers(),
                    getProducts(),
                    getAdminOffers(),
                ]);

                setCustomers(
                    customerResponse?.customers ||
                    customerResponse?.data?.customers ||
                    []
                );

                setProducts(
                    productResponse?.products ||
                    productResponse?.data?.products ||
                    productResponse ||
                    []
                );

                setSavedOffers(
                    offerResponse?.offers ||
                    offerResponse?.data?.offers ||
                    offerResponse?.data ||
                    offerResponse ||
                    []
                );
            } catch (err) {
                console.error(err);
                setError(
                    err?.message ||
                    "Failed to load customers and products."
                );
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    const activeProducts = useMemo(
        () =>
            products.filter(
                (product) =>
                    String(product.status || "ACTIVE").toUpperCase() ===
                    "ACTIVE"
            ),
        [products]
    );

    const selectedProduct = products.find(
        (product) =>
            Number(product.id) === Number(selectedProductId)
    );

    const normalItems = items.filter(
        (item) => !item.isFreeItem
    );

    const freeItems = items.filter(
        (item) => item.isFreeItem
    );

    const subtotal = normalItems.reduce(
        (sum, item) =>
            sum +
            Number(item.unitPrice || 0) *
                Number(item.quantity || 0),
        0
    );

    const manualDiscountValue =
        Math.max(0, Number(discountValue || 0));

    const manualDiscount =
        discountType === "PERCENTAGE"
            ? Math.min(
                  subtotal,
                  (subtotal * manualDiscountValue) / 100
              )
            : Math.min(
                  subtotal,
                  manualDiscountValue
              );

    const offerType =
        String(offer?.type || "").toUpperCase();

    const offerDiscount =
        offerType === "FIXED_DISCOUNT"
            ? Math.min(
                  subtotal,
                  Math.max(
                      0,
                      Number(offer?.discountValue || 0)
                  )
              )
            : offerType === "PERCENTAGE_DISCOUNT"
            ? Math.min(
                  subtotal,
                  (subtotal *
                      Math.min(
                          100,
                          Math.max(
                              0,
                              Number(
                                  offer?.discountValue || 0
                              )
                          )
                      )) /
                      100
              )
            : 0;
    const totalDiscount =
        Math.min(
            subtotal,
            offerDiscount + manualDiscount
        );

    const orderTotal =
        Math.max(
            0,
            subtotal - totalDiscount
        );


    function addProduct() {
        setError("");

        if (!selectedProduct) {
            setError("Select a product first.");
            return;
        }

        const qty = Math.max(1, Number(quantity || 1));

        if (qty > Number(selectedProduct.stock || 0)) {
            setError(
                `Only ${selectedProduct.stock} units of ${selectedProduct.name} are available.`
            );
            return;
        }

        setItems((current) => {
            const existing = current.find(
                (item) =>
                    Number(item.productId) ===
                        Number(selectedProduct.id) &&
                    !item.isFreeItem
            );

            if (existing) {
                return current.map((item) =>
                    item === existing
                        ? {
                              ...item,
                              quantity:
                                  Number(item.quantity) + qty,
                          }
                        : item
                );
            }

            return [
                ...current,
                {
                    productId: selectedProduct.id,
                    name: selectedProduct.name,
                    quantity: qty,
                    unitPrice: Number(
                        selectedProduct.price || 0
                    ),
                    isFreeItem: false,
                    offerName: null,
                },
            ];
        });

        setSelectedProductId("");
        setQuantity(1);
    }

    function removeItem(index) {
        setItems((current) =>
            current.filter((_, itemIndex) => itemIndex !== index)
        );
    }

    function updateQuantity(index, nextQuantity) {
        const qty = Math.max(1, Number(nextQuantity || 1));

        setItems((current) =>
            current.map((item, itemIndex) =>
                itemIndex === index
                    ? {
                          ...item,
                          quantity: qty,
                      }
                    : item
            )
        );
    }

    function applyOffer(offerId) {
        setError("");

        const selectedOffer = savedOffers.find(
            (savedOffer) =>
                Number(savedOffer.id) === Number(offerId)
        );

        if (!selectedOffer) {
            setError("Invalid saved offer.");
            return;
        }

        const offerType =
            String(selectedOffer.type || "").toUpperCase();

        if (
            offerType === "FIXED_DISCOUNT" ||
            offerType === "PERCENTAGE_DISCOUNT"
        ) {
            setOffer(selectedOffer);

            setItems((current) =>
                current.filter(
                    (item) => !item.isFreeItem
                )
            );

            return;
        }

        if (
            offerType !== "FREE_PRODUCT" &&
            offerType !== "FREE_ITEM"
        ) {
            setError("Unsupported offer type.");
            return;
        }

        if (!selectedOffer.productId) {
            setError(
                "This offer does not have a free product assigned."
            );
            return;
        }

        const freeProduct = products.find(
            (product) =>
                Number(product.id) ===
                Number(selectedOffer.productId)
        );

        if (!freeProduct) {
            setError(
                "The free product could not be found."
            );
            return;
        }

        const freeQuantity = Math.max(
            1,
            Number(selectedOffer.quantity || 1)
        );

        if (
            freeQuantity >
            Number(freeProduct.stock || 0)
        ) {
            setError(
                `Only ${freeProduct.stock} units of ${freeProduct.name} are available.`
            );
            return;
        }

        setItems((current) => [
            ...current.filter(
                (item) => !item.isFreeItem
            ),
            {
                productId: freeProduct.id,
                name: freeProduct.name,
                quantity: freeQuantity,
                unitPrice: 0,
                isFreeItem: true,
                offerName: selectedOffer.name,
            },
        ]);

        setOffer(selectedOffer);
    }
    function removeOffer() {
        setOffer(null);

        setItems((current) =>
            current.filter(
                (item) => !item.isFreeItem
            )
        );
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setError("");

        if (!customerId) {
            setError("Select a customer.");
            return;
        }

        if (!normalItems.length) {
            setError("Add at least one product.");
            return;
        }

        try {
            setSaving(true);

            const response = await createAdminOrder({
                customerId: Number(customerId),
                paymentMethod,
                offer: offer
                    ? {
                          id: Number(offer.id),
                          name: offer.name || null,
                          description:
                              offer.description || null,
                      }
                    : null,
                items: items.map((item) => ({
                    productId: Number(item.productId),
                    quantity: Number(item.quantity),
                    unitPrice: Number(item.unitPrice || 0),
                    isFreeItem: Boolean(item.isFreeItem),
                    offerName: item.offerName || null,
                })),
            });

            if (!response?.success) {
                throw new Error(
                    response?.message ||
                    "Failed to create order."
                );
            }

            navigate(
                `/admin/orders/${response.order.id}`
            );
        } catch (err) {
            console.error(err);

            setError(
                err?.message ||
                "Failed to create order."
            );
        } finally {
            setSaving(false);
        }
    }


    async function handleCreateCustomer() {
        try {
            setCreatingCustomer(true);
            setError("");

            const response =
                await createCustomer(newCustomer);

            const customer =
                response?.customer;

            if (!customer?.id) {
                throw new Error(
                    "Customer was created but no customer ID was returned."
                );
            }

            setCustomers((current) => [
                ...current,
                customer,
            ]);

            setCustomerId(
                String(customer.id)
            );

            setNewCustomer({
                fullName: "",
                phoneNumber: "",
                email: "",
            });

            setShowCustomerModal(false);

        } catch (err) {
            console.error(
                "CREATE CUSTOMER ERROR:",
                err
            );

            setError(
                err?.message ||
                "Failed to create customer."
            );

        } finally {
            setCreatingCustomer(false);
        }
    }
    if (loading) {
        return (
            <div className="admin-create-order-page">
                <div className="create-order-loading">
                    Loading order workspace...
                </div>
            </div>
        );
    }

    return (
        <div className="admin-create-order-page">
            <header className="create-order-header">
                <div>
                    <p className="create-order-eyebrow">
                        ADMINISTRATION
                    </p>

                    <h1>Create Order</h1>

                    <p>
                        Create a customer order manually,
                        apply offers and process it from
                        the admin workspace.
                    </p>
                </div>

                <button
                    type="button"
                    className="create-order-back"
                    onClick={() =>
                        navigate("/admin/orders")
                    }
                >
                    ← Back to Orders
                </button>
            </header>

            {error && (
                <div className="create-order-error">
                    {error}
                </div>
            )}

            <form
                className="create-order-layout"
                onSubmit={handleSubmit}
            >
                <section className="create-order-main">
                    <div className="create-order-card">
                        <div className="card-heading">
                            <div>
                                <span>01</span>
                                <h2>Customer</h2>
                            </div>
                        </div>

                        <div className="customer-selector-row">
                            <select
                                value={customerId}
                                onChange={(event) =>
                                    setCustomerId(
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Select customer
                                </option>

                                {customers.map((customer) => (
                                    <option
                                        key={customer.id}
                                        value={customer.id}
                                    >
                                        {customer.fullName}
                                        {customer.phoneNumber
                                            ? ` — ${customer.phoneNumber}`
                                            : ""}
                                    </option>
                                ))}
                            </select>

                            <button
                                type="button"
                                className="add-customer-button"
                                onClick={() => {
                                    setError("");
                                    setShowCustomerModal(true);
                                }}
                            >
                                + Add Customer
                            </button>
                        </div>
                    </div>

                    <div className="create-order-card">
                        <div className="card-heading">
                            <div>
                                <span>02</span>
                                <h2>Products</h2>
                            </div>
                        </div>

                        <div className="product-picker">
                            <select
                                value={selectedProductId}
                                onChange={(event) =>
                                    setSelectedProductId(
                                        event.target.value
                                    )
                                }
                            >
                                <option value="">
                                    Select product
                                </option>

                                {activeProducts.map(
                                    (product) => (
                                        <option
                                            key={product.id}
                                            value={product.id}
                                        >
                                            {product.name}
                                            {" — KSh "}
                                            {Number(
                                                product.price || 0
                                            ).toLocaleString()}
                                            {" — Stock "}
                                            {product.stock}
                                        </option>
                                    )
                                )}
                            </select>

                            <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(event) =>
                                    setQuantity(
                                        event.target.value
                                    )
                                }
                            />

                            <button
                                type="button"
                                onClick={addProduct}
                            >
                                + Add
                            </button>
                        </div>

                        <div className="order-items">
                            {items.length === 0 ? (
                                <div className="empty-order-items">
                                    No products added yet.
                                </div>
                            ) : (
                                items.map((item, index) => (
                                    <div
                                        className={`order-item ${
                                            item.isFreeItem
                                                ? "free-item"
                                                : ""
                                        }`}
                                        key={`${item.productId}-${item.isFreeItem}-${index}`}
                                    >
                                        <div>
                                            <strong>
                                                {item.name}
                                            </strong>

                                            {item.isFreeItem && (
                                                <small>
                                                    FREE —{" "}
                                                    {item.offerName}
                                                </small>
                                            )}
                                        </div>

                                        {!item.isFreeItem ? (
                                            <input
                                                type="number"
                                                min="1"
                                                value={
                                                    item.quantity
                                                }
                                                onChange={(event) =>
                                                    updateQuantity(
                                                        index,
                                                        event.target
                                                            .value
                                                    )
                                                }
                                            />
                                        ) : (
                                            <span>
                                                × 1
                                            </span>
                                        )}

                                        <strong>
                                            KSh{" "}
                                            {(
                                                Number(
                                                    item.unitPrice ||
                                                        0
                                                ) *
                                                Number(
                                                    item.quantity ||
                                                        0
                                                )
                                            ).toLocaleString()}
                                        </strong>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                removeItem(index)
                                            }
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="create-order-card">
                        <div className="card-heading">
                            <div>
                                <span>03</span>
                                <h2>Offers</h2>
                            </div>

                            <button
                                type="button"
                                className="offer-create-button"
                                onClick={() => {
                                    setError("");
                                    setOfferForm({
                                        name: "",
                                        description: "",
                                        type: "FREE_PRODUCT",
                                        productId: "",
                                        quantity: 1,
                                        discountValue: "",
                                        status: "ACTIVE",
                                    });
                                    setShowOfferModal(true);
                                }}
                            >
                                + Create Offer
                            </button>
                        </div>

                        <div className="offer-library">
                            <div className="offer-library-intro">
                                <div>
                                    <strong>Offer Library</strong>
                                    <span>
                                        Save reusable promotions and apply them
                                        directly to this order.
                                    </span>
                                </div>

                                <span className="offer-library-count">
                                    {savedOffers.filter(
                                        (savedOffer) =>
                                            String(
                                                savedOffer.status || ""
                                            ).toUpperCase() === "ACTIVE"
                                    ).length}{" "}
                                    active
                                </span>
                            </div>

                            <div className="offer-grid">
                                {savedOffers.filter(
                                    (savedOffer) =>
                                        String(
                                            savedOffer.status || ""
                                        ).toUpperCase() === "ACTIVE"
                                ).length === 0 ? (
                                    <div className="offer-empty">
                                        <strong>No offers yet</strong>
                                        <span>
                                            Create your first reusable offer
                                            using the button above.
                                        </span>
                                    </div>
                                ) : (
                                    savedOffers
                                        .filter(
                                            (savedOffer) =>
                                                String(
                                                    savedOffer.status || ""
                                                ).toUpperCase() === "ACTIVE"
                                        )
                                        .map((savedOffer) => {
                                            const offerType =
                                                String(
                                                    savedOffer.type || ""
                                                ).toUpperCase();

                                            const isFreeProduct =
                                                offerType ===
                                                    "FREE_PRODUCT" ||
                                                offerType === "FREE_ITEM";

                                            const isSelected =
                                                Number(offer?.id) ===
                                                Number(savedOffer.id);

                                            return (
                                                <button
                                                    key={savedOffer.id}
                                                    type="button"
                                                    className={
                                                        isSelected
                                                            ? "offer-card active"
                                                            : "offer-card"
                                                    }
                                                    onClick={() =>
                                                        applyOffer(
                                                            savedOffer.id
                                                        )
                                                    }
                                                >
                                                    <div className="offer-card-top">
                                                        <strong>
                                                            {savedOffer.name}
                                                        </strong>

                                                        <span
                                                            className={
                                                                isSelected
                                                                    ? "offer-selected-badge"
                                                                    : "offer-type-badge"
                                                            }
                                                        >
                                                            {isSelected
                                                                ? "Selected"
                                                                : isFreeProduct
                                                                ? "FREE PRODUCT"
                                                                : offerType ===
                                                                  "PERCENTAGE_DISCOUNT"
                                                                ? "% DISCOUNT"
                                                                : "FIXED DISCOUNT"}
                                                        </span>
                                                    </div>

                                                    <span className="offer-card-value">
                                                        {isFreeProduct
                                                            ? `Free ${
                                                                  savedOffer
                                                                      .product
                                                                      ?.name ||
                                                                  "Product"
                                                              } × ${
                                                                  savedOffer.quantity ||
                                                                  1
                                                              }`
                                                            : offerType ===
                                                              "PERCENTAGE_DISCOUNT"
                                                            ? `${savedOffer.discountValue}% OFF`
                                                            : `KSh ${Number(
                                                                  savedOffer.discountValue ||
                                                                      0
                                                              ).toLocaleString()} OFF`}
                                                    </span>

                                                    {savedOffer.description && (
                                                        <span className="offer-card-description">
                                                            {
                                                                savedOffer.description
                                                            }
                                                        </span>
                                                    )}

                                                    <span className="offer-card-action">
                                                        {isSelected
                                                            ? "Offer applied"
                                                            : "Apply offer →"}
                                                    </span>
                                                </button>
                                            );
                                        })
                                )}
                            </div>
                        </div>

                        {offer && (
                            <div className="active-offer">
                                <div>
                                    <strong>{offer.name}</strong>

                                    <span>
                                        {offer.description ||
                                            "Offer applied to this order."}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={removeOffer}
                                >
                                    Remove Offer
                                </button>
                            </div>
                        )}
                    </div>
                    {showOfferModal && (
                        <div className="admin-offer-modal-backdrop">
                            <div className="admin-offer-modal">
                                <div className="admin-offer-modal-header">
                                    <div>
                                        <h2>Create Offer</h2>
                                        <p>
                                            Save a reusable offer to your Offer
                                            Library.
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        className="admin-offer-modal-close"
                                        onClick={() =>
                                            setShowOfferModal(false)
                                        }
                                    >
                                        ×
                                    </button>
                                </div>

                                <div
                                    onSubmit={async (event) => {
                                        event.preventDefault();

                                        try {
                                            setOfferSaving(true);
                                            setError("");

                                            await createAdminOffer(
                                                offerForm
                                            );

                                            const response =
                                                await getAdminOffers();

                                            setSavedOffers(
                                                response?.offers ||
                                                    response?.data?.offers ||
                                                    response?.data ||
                                                    response ||
                                                    []
                                            );

                                            setShowOfferModal(false);

                                            setOfferForm({
                                                name: "",
                                                description: "",
                                                type: "FREE_PRODUCT",
                                                productId: "",
                                                quantity: 1,
                                                discountValue: "",
                                                status: "ACTIVE",
                                            });
                                        } catch (err) {
                                            console.error(
                                                "CREATE ADMIN OFFER ERROR:",
                                                err
                                            );

                                            setError(
                                                err.message ||
                                                    "Failed to create offer."
                                            );
                                        } finally {
                                            setOfferSaving(false);
                                        }
                                    }}
                                >
                                    <div className="admin-offer-form-group">
                                        <label>Offer Name</label>

                                        <input
                                            type="text"
                                            value={offerForm.name}
                                            placeholder="e.g. Free Cleaning Gloves"
                                            onChange={(event) =>
                                                setOfferForm({
                                                    ...offerForm,
                                                    name: event.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </div>

                                    <div className="admin-offer-form-group">
                                        <label>Offer Type</label>

                                        <select
                                            value={offerForm.type}
                                            onChange={(event) =>
                                                setOfferForm({
                                                    ...offerForm,
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

                                    {offerForm.type === "FREE_PRODUCT" && (
                                        <>
                                            <div className="admin-offer-form-group">
                                                <label>Free Product</label>

                                                <select
                                                    value={
                                                        offerForm.productId
                                                    }
                                                    onChange={(event) =>
                                                        setOfferForm({
                                                            ...offerForm,
                                                            productId:
                                                                event.target
                                                                    .value,
                                                        })
                                                    }
                                                    required
                                                >
                                                    <option value="">
                                                        Select a product
                                                    </option>

                                                    {products.map(
                                                        (product) => (
                                                            <option
                                                                key={
                                                                    product.id
                                                                }
                                                                value={
                                                                    product.id
                                                                }
                                                            >
                                                                {product.name}
                                                            </option>
                                                        )
                                                    )}
                                                </select>
                                            </div>

                                            <div className="admin-offer-form-group">
                                                <label>Quantity</label>

                                                <input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={
                                                        offerForm.quantity
                                                    }
                                                    onChange={(event) =>
                                                        setOfferForm({
                                                            ...offerForm,
                                                            quantity:
                                                                event.target
                                                                    .value,
                                                        })
                                                    }
                                                    required
                                                />
                                            </div>
                                        </>
                                    )}

                                    {offerForm.type !== "FREE_PRODUCT" && (
                                        <div className="admin-offer-form-group">
                                            <label>
                                                {offerForm.type ===
                                                "PERCENTAGE_DISCOUNT"
                                                    ? "Discount Percentage"
                                                    : "Discount Amount (KSh)"}
                                            </label>

                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={
                                                    offerForm.discountValue
                                                }
                                                placeholder={
                                                    offerForm.type ===
                                                    "PERCENTAGE_DISCOUNT"
                                                        ? "e.g. 10"
                                                        : "e.g. 500"
                                                }
                                                onChange={(event) =>
                                                    setOfferForm({
                                                        ...offerForm,
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
                                            value={offerForm.description}
                                            placeholder="Optional description"
                                            onChange={(event) =>
                                                setOfferForm({
                                                    ...offerForm,
                                                    description:
                                                        event.target.value,
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="admin-offer-form-actions">
                                        <button
                                            type="button"
                                            className="admin-offer-cancel-btn"
                                            onClick={() =>
                                                setShowOfferModal(false)
                                            }
                                            disabled={offerSaving}
                                        >
                                            Cancel
                                        </button>

                                        <button
                                            type="submit"
                                            className="admin-offer-save-btn"
                                            disabled={offerSaving}
                                        >
                                            {offerSaving
                                                ? "Saving..."
                                                : "Create Offer"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="create-order-card">
                        <div className="card-heading">
                            <div>
                                <span>04</span>
                                <h2>Discount</h2>
                            </div>
                        </div>

                        <div className="discount-form">
                            <div className="discount-field">
                                <label>
                                    Discount Type
                                </label>

                                <select
                                    value={discountType}
                                    onChange={(event) =>
                                        setDiscountType(
                                            event.target.value
                                        )
                                    }
                                >
                                    <option value="PERCENTAGE">
                                        Percentage
                                    </option>

                                    <option value="FIXED">
                                        Fixed Amount
                                    </option>
                                </select>
                            </div>

                            <div className="discount-field">
                                <label>
                                    Discount Value
                                </label>

                                <div className="discount-input-wrap">
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={discountValue}
                                        onChange={(event) =>
                                            setDiscountValue(
                                                event.target.value
                                            )
                                        }
                                        placeholder={
                                            discountType ===
                                            "PERCENTAGE"
                                                ? "e.g. 10"
                                                : "e.g. 500"
                                        }
                                    />

                                    <span>
                                        {discountType ===
                                        "PERCENTAGE"
                                            ? "%"
                                            : "KSh"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="discount-preview">
                            <span>
                                Calculated Discount
                            </span>

                            <strong>
                                {manualDiscount > 0
                                    ? `- KSh ${manualDiscount.toLocaleString()}`
                                    : "KSh 0"}
                            </strong>
                        </div>
                    </div>

                    <div className="create-order-card">
                        <div className="card-heading">
                            <div>
                                <span>05</span>
                                <h2>Payment</h2>
                            </div>
                        </div>

                        <div className="payment-options">
                            <button
                                type="button"
                                className={
                                    paymentMethod === "COD"
                                        ? "payment-option active"
                                        : "payment-option"
                                }
                                onClick={() =>
                                    setPaymentMethod("COD")
                                }
                            >
                                <strong>
                                    Cash on Delivery
                                </strong>
                                <span>
                                    Customer pays on delivery
                                </span>
                            </button>

                            <button
                                type="button"
                                className={
                                    paymentMethod === "MPESA"
                                        ? "payment-option active"
                                        : "payment-option"
                                }
                                onClick={() =>
                                    setPaymentMethod("MPESA")
                                }
                            >
                                <strong>
                                    M-Pesa
                                </strong>
                                <span>
                                    Record as M-Pesa order
                                </span>
                            </button>
                        </div>
                    </div>
                </section>

                <aside className="create-order-summary">
                    <div className="summary-card">
                        <p>ORDER SUMMARY</p>

                        <h2>
                            KSh{" "}
                            {orderTotal.toLocaleString()}
                        </h2>

                        <div className="summary-row">
                            <span>Products</span>
                            <strong>
                                {normalItems.length}
                            </strong>
                        </div>

                        <div className="summary-row">
                            <span>Free items</span>
                            <strong>
                                {freeItems.length}
                            </strong>
                        </div>

                        <div className="summary-row">
                            <span>Subtotal</span>
                            <strong>
                                KSh{" "}
                                {subtotal.toLocaleString()}
                            </strong>
                        </div>

                        <div className="summary-row offer-discount-row">
                            <span>Offer Discount</span>
                            <strong>
                                {offerDiscount > 0
                                    ? `- KSh ${offerDiscount.toLocaleString()}`
                                    : "KSh 0"}
                            </strong>
                        </div>

                        <div className="summary-row">
                            <span>Offer</span>
                            <strong>
                                {offer
                                    ? offer.code
                                    : "None"}
                            </strong>
                        </div>

                        <div className="summary-total-row">
                            <span>Order Total</span>
                            <strong>
                                KSh{" "}
                                {orderTotal.toLocaleString()}
                            </strong>
                        </div>

                        <button
                            type="submit"
                            className="create-order-submit"
                            disabled={saving}
                        >
                            {saving
                                ? "Creating Order..."
                                : "Create Order"}
                        </button>
                    </div>
                </aside>
            </form>

            {showCustomerModal && (
                <div
                    className="customer-modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setShowCustomerModal(false);
                        }
                    }}
                >
                    <div className="customer-modal">
                        <div className="customer-modal-header">
                            <div>
                                <span>
                                    NEW CUSTOMER
                                </span>

                                <h2>
                                    Add Customer
                                </h2>

                                <p>
                                    Create a customer and
                                    automatically use them
                                    for this order.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="customer-modal-close"
                                onClick={() =>
                                    setShowCustomerModal(false)
                                }
                                disabled={creatingCustomer}
                            >
                                ×
                            </button>
                        </div>

                        <div className="customer-form">
                            <label>
                                Full Name
                                <input
                                    type="text"
                                    value={
                                        newCustomer.fullName
                                    }
                                    onChange={(event) =>
                                        setNewCustomer(
                                            (current) => ({
                                                ...current,
                                                fullName:
                                                    event.target
                                                        .value,
                                            })
                                        )
                                    }
                                    placeholder="e.g. John Kamau"
                                    autoFocus
                                />
                            </label>

                            <label>
                                Phone Number
                                <input
                                    type="tel"
                                    value={
                                        newCustomer.phoneNumber
                                    }
                                    onChange={(event) =>
                                        setNewCustomer(
                                            (current) => ({
                                                ...current,
                                                phoneNumber:
                                                    event.target
                                                        .value,
                                            })
                                        )
                                    }
                                    placeholder="e.g. 0712345678"
                                />
                            </label>

                            <label>
                                Email
                                <span className="optional-label">
                                    Optional
                                </span>
                                <input
                                    type="email"
                                    value={
                                        newCustomer.email
                                    }
                                    onChange={(event) =>
                                        setNewCustomer(
                                            (current) => ({
                                                ...current,
                                                email:
                                                    event.target
                                                        .value,
                                            })
                                        )
                                    }
                                    placeholder="customer@email.com"
                                />
                            </label>
                        </div>

                        <div className="customer-modal-actions">
                            <button
                                type="button"
                                className="customer-cancel-button"
                                onClick={() =>
                                    setShowCustomerModal(false)
                                }
                                disabled={creatingCustomer}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="customer-create-button"
                                onClick={
                                    handleCreateCustomer
                                }
                                disabled={creatingCustomer}
                            >
                                {creatingCustomer
                                    ? "Creating..."
                                    : "Create Customer"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


























