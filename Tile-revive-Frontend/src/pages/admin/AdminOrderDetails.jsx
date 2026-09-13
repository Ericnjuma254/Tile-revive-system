import {
    useCallback,
    useEffect,
    useState,
} from "react";
import {
    useNavigate,
    useParams,
} from "react-router-dom";
import "./AdminOrderDetails.css";

// ======================================================
// API CONFIG
// ======================================================

const API_BASE_URL =
    "http://192.168.0.100:5000";

// ======================================================
// COMPONENT
// ======================================================

function AdminOrderDetails() {
    const navigate = useNavigate();

    const params = useParams();

    // Support BOTH possible route definitions:
    //
    // /admin/orders/:orderId
    // /admin/orders/:id
    //
    const orderId =
        params.orderId ??
        params.id ??
        null;

    const [order, setOrder] =
        useState(null);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    // ==================================================
    // DEBUG
    // ==================================================

    console.log(
        "========================================"
    );

    console.log(
        "ADMIN ORDER DETAILS"
    );

    console.log(
        "CURRENT PATH:",
        window.location.pathname
    );

    console.log(
        "ROUTE PARAMS:",
        params
    );

    console.log(
        "RESOLVED ORDER ID:",
        orderId
    );

    console.log(
        "ORDER ID TYPE:",
        typeof orderId
    );

    console.log(
        "========================================"
    );

    // ==================================================
    // VALIDATE ID
    // ==================================================

    const getValidOrderId = useCallback(() => {
        if (
            orderId === undefined ||
            orderId === null
        ) {
            return null;
        }

        const value =
            String(orderId).trim();

        if (!value) {
            return null;
        }

        if (
            value === "undefined" ||
            value === "null" ||
            value === "NaN"
        ) {
            return null;
        }

        return value;
    }, [orderId]);

    // ==================================================
    // TOKEN
    // ==================================================

    const getToken = () => {
        return localStorage.getItem(
            "accessToken"
        );
    };

    // ==================================================
    // LOGOUT / LOGIN
    // ==================================================

    const redirectToLogin = useCallback(() => {
        localStorage.removeItem(
            "accessToken"
        );

        localStorage.removeItem(
            "refreshToken"
        );

        navigate(
            "/admin/login",
            {
                replace: true,
            }
        );
    }, [navigate]);

    // ==================================================
    // API RESPONSE
    // ==================================================

    const parseResponse = async (
        response
    ) => {
        let data = {};

        try {
            data =
                await response.json();
        } catch {
            data = {};
        }

        return data;
    };

    // ==================================================
    // LOAD ORDER
    // ==================================================

    const loadOrder =
        useCallback(async () => {

            const validOrderId =
                getValidOrderId();

            // ------------------------------------------
            // ID VALIDATION
            // ------------------------------------------

            if (!validOrderId) {

                console.error(
                    "❌ INVALID ADMIN ORDER ID"
                );

                console.error(
                    "Path:",
                    window.location.pathname
                );

                console.error(
                    "Params:",
                    params
                );

                console.error(
                    "orderId:",
                    orderId
                );

                setOrder(null);

                setError(
                    "Invalid order ID."
                );

                setLoading(false);

                return;
            }

            // ------------------------------------------
            // TOKEN
            // ------------------------------------------

            const token =
                getToken();

            if (!token) {

                console.error(
                    "❌ NO ADMIN ACCESS TOKEN"
                );

                redirectToLogin();

                return;
            }

            // ------------------------------------------
            // URL
            // ------------------------------------------

            const requestUrl =
                `${API_BASE_URL}/api/admin/orders/${encodeURIComponent(
                    validOrderId
                )}`;

            console.log(
                "========================================"
            );

            console.log(
                "ADMIN ORDER REQUEST"
            );

            console.log(
                "Order ID:",
                validOrderId
            );

            console.log(
                "Request URL:",
                requestUrl
            );

            console.log(
                "========================================"
            );

            try {

                setLoading(true);
                setError("");

                const response =
                    await fetch(
                        requestUrl,
                        {
                            method: "GET",

                            headers: {
                                Authorization:
                                    `Bearer ${token}`,

                                Accept:
                                    "application/json",
                            },
                        }
                    );

                console.log(
                    "ADMIN ORDER RESPONSE:",
                    response.status
                );

                const data =
                    await parseResponse(
                        response
                    );

                console.log(
                    "ADMIN ORDER DATA:",
                    data
                );

                // --------------------------------------
                // AUTH ERROR
                // --------------------------------------

                if (
                    response.status ===
                        401 ||
                    response.status ===
                        403
                ) {

                    console.error(
                        "❌ ADMIN AUTH FAILED"
                    );

                    redirectToLogin();

                    return;
                }

                // --------------------------------------
                // API ERROR
                // --------------------------------------

                if (!response.ok) {

                    throw new Error(
                        data?.message ||
                        data?.error ||
                        `Failed to load order (${response.status}).`
                    );
                }

                // --------------------------------------
                // NORMALIZE RESPONSE
                // --------------------------------------

                const loadedOrder =
                    data?.order ??
                    data?.data ??
                    data;

                if (
                    !loadedOrder ||
                    typeof loadedOrder !==
                        "object" ||
                    Array.isArray(
                        loadedOrder
                    )
                ) {

                    console.error(
                        "❌ INVALID ORDER RESPONSE:",
                        loadedOrder
                    );

                    throw new Error(
                        "The server returned an invalid order."
                    );
                }

                // --------------------------------------
                // IMPORTANT
                // --------------------------------------

                console.log(
                    "✅ ORDER LOADED:",
                    loadedOrder
                );

                console.log(
                    "✅ SERVER ORDER ID:",
                    loadedOrder.id
                );

                setOrder(
                    loadedOrder
                );

            } catch (err) {

                console.error(
                    "❌ ADMIN ORDER DETAILS ERROR:",
                    err
                );

                setOrder(null);

                setError(
                    err?.message ||
                    "Unable to load order details."
                );

            } finally {

                setLoading(false);

            }

        }, [
            getValidOrderId,
            params,
            orderId,
            redirectToLogin,
        ]);

    // ==================================================
    // LOAD WHEN ID CHANGES
    // ==================================================

    useEffect(() => {

        loadOrder();

    }, [loadOrder]);

    // ==================================================
    // UPDATE ORDER STATUS
    // ==================================================

    const updateStatus =
        async (newStatus) => {

            const validOrderId =
                getValidOrderId();

            if (!validOrderId) {

                setError(
                    "Invalid order ID."
                );

                return;
            }

            if (!newStatus) {

                setError(
                    "Please select a valid order status."
                );

                return;
            }

            const token =
                getToken();

            if (!token) {

                redirectToLogin();

                return;
            }

            const requestUrl =
                `${API_BASE_URL}/api/admin/orders/${encodeURIComponent(
                    validOrderId
                )}/status`;

            console.log(
                "UPDATING ORDER STATUS:",
                requestUrl,
                newStatus
            );

            try {

                setSaving(true);
                setError("");

                const response =
                    await fetch(
                        requestUrl,
                        {
                            method: "PATCH",

                            headers: {
                                Authorization:
                                    `Bearer ${token}`,

                                "Content-Type":
                                    "application/json",

                                Accept:
                                    "application/json",
                            },

                            body:
                                JSON.stringify({
                                    orderStatus:
                                        newStatus,
                                }),
                        }
                    );

                const data =
                    await parseResponse(
                        response
                    );

                if (
                    response.status ===
                        401 ||
                    response.status ===
                        403
                ) {

                    redirectToLogin();

                    return;
                }

                if (!response.ok) {

                    throw new Error(
                        data?.message ||
                        data?.error ||
                        "Failed to update order status."
                    );
                }

                const updatedOrder =
                    data?.order ??
                    data?.data;

                if (updatedOrder) {

                    setOrder(
                        updatedOrder
                    );

                } else {

                    await loadOrder();

                }

            } catch (err) {

                console.error(
                    "UPDATE ORDER STATUS ERROR:",
                    err
                );

                setError(
                    err?.message ||
                    "Unable to update order status."
                );

            } finally {

                setSaving(false);

            }
        };

    // ==================================================
    // UPDATE PAYMENT STATUS
    // ==================================================

    const updatePaymentStatus =
        async (
            newPaymentStatus
        ) => {

            const validOrderId =
                getValidOrderId();

            if (!validOrderId) {

                setError(
                    "Invalid order ID."
                );

                return;
            }

            if (!newPaymentStatus) {

                setError(
                    "Please select a valid payment status."
                );

                return;
            }

            const token =
                getToken();

            if (!token) {

                redirectToLogin();

                return;
            }

            const requestUrl =
                `${API_BASE_URL}/api/admin/orders/${encodeURIComponent(
                    validOrderId
                )}/payment-status`;

            console.log(
                "UPDATING PAYMENT STATUS:",
                requestUrl,
                newPaymentStatus
            );

            try {

                setSaving(true);
                setError("");

                const response =
                    await fetch(
                        requestUrl,
                        {
                            method: "PATCH",

                            headers: {
                                Authorization:
                                    `Bearer ${token}`,

                                "Content-Type":
                                    "application/json",

                                Accept:
                                    "application/json",
                            },

                            body:
                                JSON.stringify({
                                    paymentStatus:
                                        newPaymentStatus,
                                }),
                        }
                    );

                const data =
                    await parseResponse(
                        response
                    );

                if (
                    response.status ===
                        401 ||
                    response.status ===
                        403
                ) {

                    redirectToLogin();

                    return;
                }

                if (!response.ok) {

                    throw new Error(
                        data?.message ||
                        data?.error ||
                        "Failed to update payment status."
                    );
                }

                const updatedOrder =
                    data?.order ??
                    data?.data;

                if (updatedOrder) {

                    setOrder(
                        updatedOrder
                    );

                } else {

                    await loadOrder();

                }

            } catch (err) {

                console.error(
                    "UPDATE PAYMENT STATUS ERROR:",
                    err
                );

                setError(
                    err?.message ||
                    "Unable to update payment status."
                );

            } finally {

                setSaving(false);

            }
        };

    // ==================================================
    // FORMAT CURRENCY
    // ==================================================

    const formatCurrency =
        (amount) => {

            const value =
                Number(amount);

            return new Intl.NumberFormat(
                "en-KE",
                {
                    style: "currency",
                    currency: "KES",
                    maximumFractionDigits: 0,
                }
            ).format(
                Number.isFinite(value)
                    ? value
                    : 0
            );
        };

    // ==================================================
    // FORMAT DATE
    // ==================================================

    const formatDate =
        (date) => {

            if (!date) {
                return "—";
            }

            const parsedDate =
                new Date(date);

            if (
                Number.isNaN(
                    parsedDate.getTime()
                )
            ) {
                return "—";
            }

            return new Intl.DateTimeFormat(
                "en-KE",
                {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                }
            ).format(parsedDate);
        };

    // ==================================================
    // FORMAT STATUS
    // ==================================================

    const formatStatus =
        (status) => {

            if (!status) {
                return "—";
            }

            return String(status)
                .replaceAll(
                    "_",
                    " "
                )
                .toLowerCase()
                .replace(
                    /\b\w/g,
                    (letter) =>
                        letter.toUpperCase()
                );
        };

    // ==================================================
    // BACK
    // ==================================================

    const goBackToOrders =
        () => {

            navigate(
                "/admin/orders"
            );
        };

    // ==================================================
    // LOGOUT
    // ==================================================

    const handleLogout =
        () => {

            localStorage.removeItem(
                "accessToken"
            );

            localStorage.removeItem(
                "refreshToken"
            );

            navigate(
                "/admin/login",
                {
                    replace: true,
                }
            );
        };

    // ==================================================
    // LOADING
    // ==================================================

    if (loading) {

        return (
            <div className="admin-order-details-loading">

                <div className="order-details-spinner"></div>

                <p>
                    Loading order details...
                </p>

            </div>
        );
    }

    // ==================================================
    // ERROR
    // ==================================================

    if (
        error ||
        !order
    ) {

        return (
            <div className="admin-order-details-error">

                <div className="admin-order-error-icon">
                    !
                </div>

                <h1>
                    Unable to load order
                </h1>

                <p>
                    {error ||
                        "Order not found."}
                </p>

                <div className="admin-order-error-actions">

                    <button
                        type="button"
                        onClick={
                            goBackToOrders
                        }
                    >
                        ← Back to Orders
                    </button>

                    {getValidOrderId() && (
                        <button
                            type="button"
                            onClick={
                                loadOrder
                            }
                        >
                            Try Again
                        </button>
                    )}

                </div>

            </div>
        );
    }

    // ==================================================
    // NORMALIZE ITEMS
    // ==================================================

    const items =
        Array.isArray(
            order.orderitem
        )
            ? order.orderitem
            : Array.isArray(
                  order.orderItem
              )
            ? order.orderItem
            : Array.isArray(
                  order.items
              )
            ? order.items
            : [];

    // ==================================================
    // NORMALIZE PAYMENTS
    // ==================================================

    const payments =
        Array.isArray(
            order.payment
        )
            ? order.payment
            : Array.isArray(
                  order.payments
              )
            ? order.payments
            : order.payment
            ? [order.payment]
            : [];

    // ==================================================
    // SUBTOTAL
    // ==================================================

    const subtotal =
        items.reduce(
            (
                total,
                item
            ) => {

                const quantity =
                    Number(
                        item?.quantity ||
                        0
                    );

                const price =
                    Number(
                        item?.price ??
                        item?.unitPrice ??
                        item?.product
                            ?.price ??
                        0
                    );

                return (
                    total +
                    (
                        Number.isFinite(
                            quantity
                        )
                            ? quantity
                            : 0
                    ) *
                    (
                        Number.isFinite(
                            price
                        )
                            ? price
                            : 0
                    )
                );
            },
            0
        );

    // ==================================================
    // PAGE
    // ==================================================

    return (
        <div className="admin-order-details-page">

            {/* SIDEBAR */}

            <aside className="admin-order-details-sidebar">

                <div className="admin-order-details-brand">

                    <div className="admin-order-details-logo">
                        TR
                    </div>

                    <div>
                        <strong>
                            TILE REVIVE
                        </strong>

                        <span>
                            ADMIN PANEL
                        </span>
                    </div>

                </div>

                <nav className="admin-order-details-nav">

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/admin/dashboard"
                            )
                        }
                    >
                        Dashboard
                    </button>

                    <button
                        type="button"
                        className="active"
                        onClick={
                            goBackToOrders
                        }
                    >
                        Orders
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/admin/products"
                            )
                        }
                    >
                        Products
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/admin/inventory"
                            )
                        }
                    >
                        Inventory
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/admin/customers"
                            )
                        }
                    >
                        Customers
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/admin/promotions"
                            )
                        }
                    >
                        Promotions
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/admin/gallery"
                            )
                        }
                    >
                        Gallery
                    </button>

                </nav>

                <div className="admin-order-details-sidebar-bottom">

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/admin/settings"
                            )
                        }
                    >
                        Settings
                    </button>

                    <button
                        type="button"
                        className="logout-button"
                        onClick={
                            handleLogout
                        }
                    >
                        Logout
                    </button>

                </div>

            </aside>

            {/* MAIN */}

            <main className="admin-order-details-main">

                {/* HEADER */}

                <header className="admin-order-details-header">

                    <div>

                        <button
                            type="button"
                            className="back-orders-button"
                            onClick={
                                goBackToOrders
                            }
                        >
                            ← Back to Orders
                        </button>

                        <p className="order-details-eyebrow">
                            ORDER DETAILS
                        </p>

                        <h1>
                            {order.orderNumber ||
                                `Order #${order.id}`}
                        </h1>

                        <p>
                            Placed on{" "}
                            {formatDate(
                                order.createdAt
                            )}
                        </p>

                    </div>

                    <div className="order-details-header-status">

                        {/* ORDER STATUS */}

                        <div className="status-control">

                            <span className="status-title">
                                Order Status
                            </span>

                            <select
                                value={
                                    order.orderStatus ||
                                    "PENDING"
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateStatus(
                                        event.target.value
                                    )
                                }
                                disabled={
                                    saving ||
                                    order.orderStatus ===
                                        "DELIVERED"
                                }
                            >

                                <option value="PENDING">
                                    Pending
                                </option>

                                <option value="PROCESSING">
                                    Processing
                                </option>

                                <option value="READY">
                                    Ready
                                </option>

                                <option value="OUT_FOR_DELIVERY">
                                    Out for Delivery
                                </option>

                                <option value="DELIVERED">
                                    Delivered
                                </option>

                                <option value="CANCELLED">
                                    Cancelled
                                </option>

                            </select>

                        </div>

                        {/* PAYMENT STATUS */}

                        <div className="status-control">

                            <span className="status-title">
                                Payment Status
                            </span>

                            <select
                                value={
                                    order.paymentStatus ||
                                    "PENDING"
                                }
                                onChange={(
                                    event
                                ) =>
                                    updatePaymentStatus(
                                        event.target.value
                                    )
                                }
                                disabled={
                                    saving
                                }
                            >

                                <option value="PENDING">
                                    Pending
                                </option>

                                <option value="SUCCESS">
                                    Paid / Success
                                </option>

                                <option value="FAILED">
                                    Failed
                                </option>

                                <option value="CANCELLED">
                                    Cancelled
                                </option>

                            </select>

                        </div>

                        {saving && (
                            <small>
                                Updating...
                            </small>
                        )}

                    </div>

                </header>

                {/* ERROR */}

                {error && (
                    <div className="order-details-error-banner">

                        <strong>
                            Error
                        </strong>

                        <span>
                            {error}
                        </span>

                    </div>
                )}

                {/* SUMMARY */}

                <section className="order-details-summary-grid">

                    <div className="order-detail-summary-card">

                        <span>
                            Order Total
                        </span>

                        <strong>
                            {formatCurrency(
                                order.totalAmount
                            )}
                        </strong>

                    </div>

                    <div className="order-detail-summary-card">

                        <span>
                            Payment Status
                        </span>

                        <strong>
                            {formatStatus(
                                order.paymentStatus ||
                                "PENDING"
                            )}
                        </strong>

                    </div>

                    <div className="order-detail-summary-card">

                        <span>
                            Order Status
                        </span>

                        <strong>
                            {formatStatus(
                                order.orderStatus ||
                                "PENDING"
                            )}
                        </strong>

                    </div>

                    <div className="order-detail-summary-card">

                        <span>
                            Order ID
                        </span>

                        <strong>
                            #{order.id}
                        </strong>

                    </div>

                </section>

                {/* CUSTOMER + PAYMENT */}

                <section className="order-details-two-column">

                    {/* CUSTOMER */}

                    <div className="order-details-card">

                        <div className="order-details-card-header">

                            <div>

                                <h2>
                                    Customer Information
                                </h2>

                                <p>
                                    Customer details
                                </p>

                            </div>

                        </div>

                        <div className="customer-details">

                            <div className="detail-row">

                                <span>
                                    Name
                                </span>

                                <strong>
                                    {order.customer
                                        ?.fullName ||
                                        order.customer
                                            ?.name ||
                                        "Guest Customer"}
                                </strong>

                            </div>

                            <div className="detail-row">

                                <span>
                                    Email
                                </span>

                                <strong>
                                    {order.customer
                                        ?.email ||
                                        "No email provided"}
                                </strong>

                            </div>

                            <div className="detail-row">

                                <span>
                                    Phone
                                </span>

                                <strong>
                                    {order.customer
                                        ?.phone ||
                                        order.customer
                                            ?.phoneNumber ||
                                        order.phone ||
                                        "No phone provided"}
                                </strong>

                            </div>

                            <div className="detail-row">

                                <span>
                                    Customer ID
                                </span>

                                <strong>
                                    {order.customer
                                        ?.id
                                        ? `#${order.customer.id}`
                                        : "Guest"}
                                </strong>

                            </div>

                        </div>

                    </div>

                    {/* PAYMENT */}

                    <div className="order-details-card">

                        <div className="order-details-card-header">

                            <div>

                                <h2>
                                    Payment Information
                                </h2>

                                <p>
                                    Payment records
                                </p>

                            </div>

                        </div>

                        {payments.length ===
                        0 ? (

                            <div className="no-payment">
                                No payment record found.
                            </div>

                        ) : (

                            <div className="payment-list">

                                {payments.map(
                                    (
                                        payment,
                                        index
                                    ) => (

                                        <div
                                            className="payment-record"
                                            key={
                                                payment.id ||
                                                payment.transactionId ||
                                                index
                                            }
                                        >

                                            <div className="detail-row">

                                                <span>
                                                    Method
                                                </span>

                                                <strong>
                                                    {formatStatus(
                                                        payment.paymentMethod
                                                    )}
                                                </strong>

                                            </div>

                                            <div className="detail-row">

                                                <span>
                                                    Status
                                                </span>

                                                <strong>
                                                    {formatStatus(
                                                        payment.status ||
                                                        order.paymentStatus
                                                    )}
                                                </strong>

                                            </div>

                                            <div className="detail-row">

                                                <span>
                                                    Amount
                                                </span>

                                                <strong>
                                                    {formatCurrency(
                                                        payment.amount ??
                                                        order.totalAmount
                                                    )}
                                                </strong>

                                            </div>

                                            <div className="detail-row">

                                                <span>
                                                    Transaction
                                                </span>

                                                <strong>
                                                    {payment.transactionId ||
                                                        payment.mpesaReceiptNumber ||
                                                        payment.receiptNumber ||
                                                        payment.checkoutRequestId ||
                                                        "—"}
                                                </strong>

                                            </div>

                                            <div className="detail-row">

                                                <span>
                                                    Date
                                                </span>

                                                <strong>
                                                    {formatDate(
                                                        payment.createdAt
                                                    )}
                                                </strong>

                                            </div>

                                        </div>

                                    )
                                )}

                            </div>

                        )}

                    </div>

                </section>

                {/* PRODUCTS */}

                <section className="order-details-card order-items-card">

                    <div className="order-details-card-header">

                        <div>

                            <h2>
                                Order Items
                            </h2>

                            <p>
                                Products included in this order
                            </p>

                        </div>

                        <strong>
                            {items.length}{" "}
                            {items.length ===
                            1
                                ? "item"
                                : "items"}
                        </strong>

                    </div>

                    {items.length ===
                    0 ? (

                        <div className="no-order-items">
                            No products were found for this order.
                        </div>

                    ) : (

                        <div className="order-items-table-wrapper">

                            <table className="order-items-table">

                                <thead>

                                    <tr>

                                        <th>
                                            Product
                                        </th>

                                        <th>
                                            SKU
                                        </th>

                                        <th>
                                            Quantity
                                        </th>

                                        <th>
                                            Unit Price
                                        </th>

                                        <th>
                                            Total
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {items.map(
                                        (
                                            item,
                                            index
                                        ) => {

                                            const quantity =
                                                Number(
                                                    item?.quantity ||
                                                    0
                                                );

                                            const unitPrice =
                                                Number(
                                                    item?.price ??
                                                    item?.unitPrice ??
                                                    item?.product
                                                        ?.price ??
                                                    0
                                                );

                                            const safeQuantity =
                                                Number.isFinite(
                                                    quantity
                                                )
                                                    ? quantity
                                                    : 0;

                                            const safeUnitPrice =
                                                Number.isFinite(
                                                    unitPrice
                                                )
                                                    ? unitPrice
                                                    : 0;

                                            const lineTotal =
                                                safeQuantity *
                                                safeUnitPrice;

                                            const image =
                                                item?.product
                                                    ?.image ||
                                                item?.image ||
                                                "";

                                            const productName =
                                                item?.product
                                                    ?.name ||
                                                item?.productName ||
                                                "Product";

                                            const productId =
                                                item?.product
                                                    ?.id ||
                                                item?.productId ||
                                                "—";

                                            const sku =
                                                item?.product
                                                    ?.sku ||
                                                item?.sku ||
                                                "—";

                                            return (
                                                <tr
                                                    key={
                                                        item?.id ||
                                                        `${productId}-${index}`
                                                    }
                                                >

                                                    <td>

                                                        <div className="product-detail-cell">

                                                            {image ? (
                                                                <img
                                                                    src={
                                                                        image
                                                                    }
                                                                    alt={
                                                                        productName
                                                                    }
                                                                    onError={(
                                                                        event
                                                                    ) => {
                                                                        event.currentTarget.style.display =
                                                                            "none";
                                                                    }}
                                                                />
                                                            ) : (
                                                                <div className="product-detail-placeholder">
                                                                    TR
                                                                </div>
                                                            )}

                                                            <div>

                                                                <strong>
                                                                    {
                                                                        productName
                                                                    }
                                                                </strong>

                                                                <span>
                                                                    Product ID:{" "}
                                                                    {
                                                                        productId
                                                                    }
                                                                </span>

                                                            </div>

                                                        </div>

                                                    </td>

                                                    <td>
                                                        {sku}
                                                    </td>

                                                    <td>
                                                        {
                                                            safeQuantity
                                                        }
                                                    </td>

                                                    <td>
                                                        {formatCurrency(
                                                            safeUnitPrice
                                                        )}
                                                    </td>

                                                    <td>

                                                        <strong>
                                                            {formatCurrency(
                                                                lineTotal
                                                            )}
                                                        </strong>

                                                    </td>

                                                </tr>
                                            );
                                        }
                                    )}

                                </tbody>

                            </table>

                        </div>

                    )}

                </section>

                {/* TOTALS */}

                <section className="order-details-card order-total-card">

                    <div className="order-total-row">

                        <span>
                            Subtotal
                        </span>

                        <strong>
                            {formatCurrency(
                                subtotal
                            )}
                        </strong>

                    </div>

                    <div className="order-total-row">

                        <span>
                            Order Total
                        </span>

                        <strong>
                            {formatCurrency(
                                order.totalAmount
                            )}
                        </strong>

                    </div>

                </section>

                {/* TIMELINE */}

                <section className="order-details-card">

                    <div className="order-details-card-header">

                        <div>

                            <h2>
                                Order Timeline
                            </h2>

                            <p>
                                Track every order status change
                            </p>

                        </div>

                    </div>

                    <div className="order-timeline">

                        <div className="timeline-item">

                            <span className="timeline-dot active"></span>

                            <div>

                                <strong>
                                    Order Created
                                </strong>

                                <span>
                                    {formatDate(
                                        order.createdAt
                                    )}
                                </span>

                            </div>

                        </div>

                        {Array.isArray(
                            order.statusHistory
                        ) &&
                            order.statusHistory.map(
                                (
                                    history,
                                    index
                                ) => (

                                    <div
                                        className="timeline-item"
                                        key={
                                            history.id ||
                                            `${history.createdAt}-${index}`
                                        }
                                    >

                                        <span className="timeline-dot active"></span>

                                        <div>

                                            <strong>
                                                {formatStatus(
                                                    history.toStatus
                                                )}
                                            </strong>

                                            <span>
                                                {history.fromStatus
                                                    ? `${formatStatus(
                                                          history.fromStatus
                                                      )} → ${formatStatus(
                                                          history.toStatus
                                                      )}`
                                                    : `Status changed to ${formatStatus(
                                                          history.toStatus
                                                      )}`}
                                            </span>

                                            <small>
                                                {formatDate(
                                                    history.createdAt
                                                )}
                                            </small>

                                        </div>

                                    </div>

                                )
                            )}

                    </div>

                </section>

            </main>

        </div>
    );
}

export default AdminOrderDetails;
