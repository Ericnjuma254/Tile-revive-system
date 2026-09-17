import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminOrders } from "../../services/api";
import "./AdminOrders.css";

function AdminOrders() {
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [paymentFilter, setPaymentFilter] = useState("ALL");

    // ======================================================
    // LOAD ORDERS
    // ======================================================

    const loadOrders = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const token =
                localStorage.getItem("accessToken");

            const refreshToken =
                localStorage.getItem("refreshToken");

            if (!token && !refreshToken) {
                navigate("/admin/login", {
                    replace: true,
                });
                return;
            }

            const data = await getAdminOrders();

            const receivedOrders =
                Array.isArray(data?.orders)
                    ? data.orders
                    : Array.isArray(data)
                    ? data
                    : [];

            setOrders(receivedOrders);
        } catch (error) {
            console.error(
                "ADMIN ORDERS ERROR:",
                error
            );

            const message =
                error?.message ||
                "Unable to load orders.";

            /*
             * IMPORTANT:
             *
             * api.js is responsible for authentication,
             * token refresh and redirecting when necessary.
             *
             * Do NOT delete accessToken/refreshToken here.
             */

            if (
                message
                    .toLowerCase()
                    .includes("session has expired")
            ) {
                navigate("/admin/login", {
                    replace: true,
                });

                return;
            }

            setError(message);
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    // ======================================================
    // INITIAL LOAD
    // ======================================================

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    // ======================================================
    // VIEW ORDER
    // ======================================================

    const handleViewOrder = (order) => {
    console.log("========== ADMIN VIEW ORDER ==========");
    console.log("ORDER OBJECT:", order);
    console.log("ORDER ID:", order?.id);
    console.log("ORDER ID TYPE:", typeof order?.id);

    if (
        order?.id === undefined ||
        order?.id === null ||
        String(order.id).trim() === "" ||
        String(order.id).trim() === "undefined" ||
        String(order.id).trim() === "null"
    ) {
        console.error(
            "❌ INVALID ORDER OBJECT:",
            order
        );

        setError(
            "This order returned from the server has no valid ID."
        );

        return;
    }

    const orderId = String(order.id).trim();

    const targetUrl =
        `/admin/orders/${encodeURIComponent(orderId)}`;

    console.log("✅ ORDER ID:", orderId);
    console.log("✅ TARGET URL:", targetUrl);

    navigate(targetUrl);
};

    // ======================================================
    // SEARCH + FILTER
    // ======================================================

    const filteredOrders = useMemo(() => {
        const searchValue =
            search.toLowerCase().trim();

        return orders.filter((order) => {
            const customerName =
                String(
                    order?.customer?.fullName ||
                        order?.customer?.name ||
                        ""
                );

            const customerEmail =
                String(
                    order?.customer?.email ||
                        ""
                );

            const orderNumber =
                String(
                    order?.orderNumber ||
                        ""
                );

            const matchesSearch =
                !searchValue ||
                orderNumber
                    .toLowerCase()
                    .includes(searchValue) ||
                customerName
                    .toLowerCase()
                    .includes(searchValue) ||
                customerEmail
                    .toLowerCase()
                    .includes(searchValue);

            const matchesStatus =
                statusFilter === "ALL" ||
                order?.orderStatus ===
                    statusFilter;

            const matchesPayment =
                paymentFilter === "ALL" ||
                order?.paymentStatus ===
                    paymentFilter;

            return (
                matchesSearch &&
                matchesStatus &&
                matchesPayment
            );
        });
    }, [
        orders,
        search,
        statusFilter,
        paymentFilter,
    ]);

    // ======================================================
    // CURRENCY
    // ======================================================

    const formatCurrency = (amount) => {
        const value = Number(amount);

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

    // ======================================================
    // DATE
    // ======================================================

    const formatDate = (date) => {
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

    // ======================================================
    // STATUS FORMAT
    // ======================================================

    const formatStatus = (status) => {
        return String(
            status || "PENDING"
        )
            .replaceAll("_", " ")
            .toLowerCase()
            .replace(
                /\b\w/g,
                (letter) =>
                    letter.toUpperCase()
            );
    };

    // ======================================================
    // LOGOUT
    // ======================================================

    // ======================================================
    // LOADING
    // ======================================================

    if (loading) {
        return (
            <div className="admin-orders-loading">

                <div className="orders-spinner"></div>

                <p>
                    Loading orders...
                </p>

            </div>
        );
    }

    // ======================================================
    // PAGE
    // ======================================================

    return (
        <div className="admin-orders-page">

            {/* ==================================================
                SIDEBAR
            ================================================== */}
{/* ==================================================
                MAIN
            ================================================== */}

            <main className="admin-orders-main">

                <header className="admin-orders-header">

                    <div>

                        <p className="orders-eyebrow">
                            ADMINISTRATION
                        </p>

                        <h1>
                            Orders
                        </h1>

                        <p>
                            View and manage customer orders.
                        </p>

                    </div>

                    <div className="orders-header-actions">

                        <button
                            type="button"
                            className="admin-create-order-btn"
                            onClick={() =>
                                navigate("/admin/orders/create")
                            }
                        >
                            + Create Order
                        </button>

                        <button
                            type="button"
                            className="orders-refresh-button"
                            onClick={loadOrders}
                            disabled={loading}
                        >
                            Refresh Orders
                        </button>

                    </div>

                </header>

                {/* ==================================================
                    ERROR
                ================================================== */}

                {error && (
                    <div className="orders-error">

                        <span>
                            {error}
                        </span>

                        <button
                            type="button"
                            onClick={loadOrders}
                        >
                            Try Again
                        </button>

                    </div>
                )}

                {/* ==================================================
                    FILTERS
                ================================================== */}

                <section className="orders-toolbar">

                    <div className="orders-search">

                        <label>
                            Search
                        </label>

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Order number, customer or email"
                        />

                    </div>

                    <div className="orders-filter">

                        <label>
                            Order Status
                        </label>

                        <select
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(
                                    event.target.value
                                )
                            }
                        >

                            <option value="ALL">
                                All statuses
                            </option>

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

                    <div className="orders-filter">

                        <label>
                            Payment
                        </label>

                        <select
                            value={paymentFilter}
                            onChange={(event) =>
                                setPaymentFilter(
                                    event.target.value
                                )
                            }
                        >

                            <option value="ALL">
                                All payments
                            </option>

                            <option value="SUCCESS">
                                Paid
                            </option>

                            <option value="PENDING">
                                Pending
                            </option>

                            <option value="FAILED">
                                Failed
                            </option>

                            <option value="CANCELLED">
                                Cancelled
                            </option>

                        </select>

                    </div>

                </section>

                {/* ==================================================
                    SUMMARY
                ================================================== */}

                <div className="orders-result-summary">

                    <strong>
                        {filteredOrders.length}
                    </strong>

                    <span>
                        {filteredOrders.length === 1
                            ? "order"
                            : "orders"}{" "}
                        found
                    </span>

                </div>

                {/* ==================================================
                    TABLE
                ================================================== */}

                <section className="orders-table-card">

                    {filteredOrders.length === 0 ? (

                        <div className="orders-empty">

                            <div className="orders-empty-icon">
                                ORD
                            </div>

                            <h2>
                                No orders found
                            </h2>

                            <p>
                                Try changing your search
                                or filters.
                            </p>

                        </div>

                    ) : (

                        <div className="admin-orders-table-wrapper">

                            <table className="admin-orders-table">

                                <thead>

                                    <tr>
                                        <th>
                                            Order
                                        </th>

                                        <th>
                                            Customer
                                        </th>

                                        <th>
                                            Date
                                        </th>

                                        <th>
                                            Amount
                                        </th>

                                        <th>
                                            Payment
                                        </th>

                                        <th>
                                            Status
                                        </th>

                                        <th>
                                            Action
                                        </th>
                                    </tr>

                                </thead>

                                <tbody>

                                    {filteredOrders.map(
                                        (order, index) => {

                                            const orderId =
                                                order?.id;

                                            const hasValidId =
                                                orderId !==
                                                    undefined &&
                                                orderId !==
                                                    null &&
                                                String(
                                                    orderId
                                                ).trim() !== "" &&
                                                String(
                                                    orderId
                                                ).trim() !==
                                                    "undefined";

                                            return (
                                                <tr
                                                    key={
                                                        orderId ||
                                                        `order-${index}`
                                                    }
                                                >

                                                    <td>

                                                        <strong className="order-number">
                                                            {order?.orderNumber ||
                                                                `Order #${orderId}`}
                                                        </strong>

                                                    </td>

                                                    <td>

                                                        <div className="customer-cell">

                                                            <strong>
                                                                {order
                                                                    ?.customer
                                                                    ?.fullName ||
                                                                    order
                                                                        ?.customer
                                                                        ?.name ||
                                                                    "Guest Customer"}
                                                            </strong>

                                                            <span>
                                                                {order
                                                                    ?.customer
                                                                    ?.email ||
                                                                    "No email"}
                                                            </span>

                                                        </div>

                                                    </td>

                                                    <td>
                                                        {formatDate(
                                                            order?.createdAt
                                                        )}
                                                    </td>

                                                    <td>

                                                        <strong>
                                                            {formatCurrency(
                                                                order?.totalAmount
                                                            )}
                                                        </strong>

                                                    </td>

                                                    <td>

                                                        <span
                                                            className={`order-status-badge payment-${String(
                                                                order
                                                                    ?.paymentStatus ||
                                                                    "PENDING"
                                                            ).toLowerCase()}`}
                                                        >
                                                            {formatStatus(
                                                                order
                                                                    ?.paymentStatus ||
                                                                    "PENDING"
                                                            )}
                                                        </span>

                                                    </td>

                                                    <td>

                                                        <span
                                                            className={`order-status-badge status-${String(
                                                                order
                                                                    ?.orderStatus ||
                                                                    "PENDING"
                                                            ).toLowerCase()}`}
                                                        >
                                                            {formatStatus(
                                                                order
                                                                    ?.orderStatus ||
                                                                    "PENDING"
                                                            )}
                                                        </span>

                                                    </td>

                                                    <td>

                                                        <button
                                                            type="button"
                                                            className="view-order-button"
                                                            disabled={
                                                                !hasValidId
                                                            }
                                                            title={
                                                                hasValidId
                                                                    ? "View order details"
                                                                    : "This order has no valid ID"
                                                            }
                                                            onClick={() =>
                                                                handleViewOrder(
                                                                    order
                                                                )
                                                            }
                                                        >
                                                            View Order
                                                        </button>

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

            </main>

        </div>
    );
}

export default AdminOrders;
