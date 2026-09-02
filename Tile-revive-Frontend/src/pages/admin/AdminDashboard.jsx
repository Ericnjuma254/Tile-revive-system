import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    getAdminDashboard,
    getAdminOrders,
    getPendingUsers,
} from "../../services/api";

import "./AdminDashboard.css";

function AdminDashboard() {
    const navigate = useNavigate();

    const [dashboard, setDashboard] = useState(null);
    const [orders, setOrders] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    // ======================================================
    // LOGOUT
    // ======================================================

    const logout = useCallback(() => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");

        navigate("/admin/login", {
            replace: true,
        });
    }, [navigate]);

    // ======================================================
    // LOAD DASHBOARD
    // ======================================================

    const loadDashboard = useCallback(async () => {
        try {
            setError("");
            setRefreshing(true);

            const [
                dashboardData,
                ordersData,
                usersData,
            ] = await Promise.all([
                getAdminDashboard(),
                getAdminOrders(),
                getPendingUsers(),
            ]);

            setDashboard(
                dashboardData || {}
            );

            setOrders(
                Array.isArray(
                    ordersData?.orders
                )
                    ? ordersData.orders
                    : []
            );

            setPendingUsers(
                Array.isArray(
                    usersData?.users
                )
                    ? usersData.users
                    : []
            );
        } catch (error) {
            console.error(
                "ADMIN DASHBOARD ERROR:",
                error
            );

            const message =
                error?.message ||
                "Unable to load dashboard.";

            if (
                message
                    .toLowerCase()
                    .includes(
                        "session has expired"
                    )
            ) {
                logout();
                return;
            }

            setError(message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [logout]);

    // ======================================================
    // INITIAL LOAD
    // ======================================================

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    // ======================================================
    // FORMAT CURRENCY
    // ======================================================

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat(
            "en-KE",
            {
                style: "currency",
                currency: "KES",
                maximumFractionDigits: 0,
            }
        ).format(
            Number(amount || 0)
        );
    };

    // ======================================================
    // NAVIGATION
    // ======================================================

    const goToOrders = () => {
        navigate("/admin/orders");
    };

    // ======================================================
    // LOADING
    // ======================================================

    if (loading) {
        return (
            <div className="admin-dashboard-loading">
                <div className="dashboard-spinner"></div>

                <p>
                    Loading admin dashboard...
                </p>
            </div>
        );
    }

    // ======================================================
    // SAFE DASHBOARD VALUES
    // ======================================================

    const totalOrders =
        Number(
            dashboard?.totalOrders || 0
        );

    const pendingOrders =
        Number(
            dashboard?.pendingOrders || 0
        );

    const processingOrders =
        Number(
            dashboard?.processingOrders || 0
        );

    const readyOrders =
        Number(
            dashboard?.readyOrders || 0
        );

    const outForDeliveryOrders =
        Number(
            dashboard?.outForDeliveryOrders || 0
        );

    const deliveredOrders =
        Number(
            dashboard?.deliveredOrders || 0
        );

    const cancelledOrders =
        Number(
            dashboard?.cancelledOrders || 0
        );

    const totalProducts =
        Number(
            dashboard?.totalProducts || 0
        );

    const lowStockCount =
        Number(
            dashboard?.lowStockCount || 0
        );

    const outOfStockCount =
        Number(
            dashboard?.outOfStockCount || 0
        );

    const totalReceived =
        Number(
            dashboard?.totalReceived || 0
        );

    const todayReceived =
        Number(
            dashboard?.todayReceived || 0
        );

    const totalTransactions =
        Number(
            dashboard?.totalTransactions || 0
        );

    const lowStock =
        Array.isArray(
            dashboard?.lowStock
        )
            ? dashboard.lowStock
            : [];

    const outOfStock =
        Array.isArray(
            dashboard?.outOfStock
        )
            ? dashboard.outOfStock
            : [];

    // ======================================================
    // DASHBOARD
    // ======================================================

    return (
        <div className="admin-dashboard">

            {/* ==================================================
                SIDEBAR
            ================================================== */}

            <aside className="admin-sidebar">

                <div className="admin-sidebar-brand">

                    <div className="admin-sidebar-logo">
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

                <nav className="admin-sidebar-nav">

                    <button
                        className="active"
                        type="button"
                    >
                        <span>◉</span>
                        Dashboard
                    </button>

                    <button
                        type="button"
                        onClick={goToOrders}
                    >
                        <span>▤</span>
                        Orders

                        {pendingOrders > 0 && (
                            <small>
                                {pendingOrders}
                            </small>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/admin/products"
                            )
                        }
                    >
                        <span>□</span>
                        Products
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/admin/reports"
                            )
                        }
                    >
                        <span>◔</span>
                        Reports
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/admin/inventory"
                            )
                        }
                    >
                        <span>◫</span>
                        Inventory

                        {outOfStockCount > 0 && (
                            <small>
                                {outOfStockCount}
                            </small>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/admin/customers"
                            )
                        }
                    >
                        <span>◎</span>
                        Customers

                        {pendingUsers.length > 0 && (
                            <small>
                                {pendingUsers.length}
                            </small>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/admin/promotions"
                            )
                        }
                    >
                        <span>%</span>
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
                        <span>▧</span>
                        Gallery
                    </button>

                </nav>

                <div className="admin-sidebar-bottom">

                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                "/admin/settings"
                            )
                        }
                    >
                        <span>⚙</span>
                        Settings
                    </button>

                    <button
                        type="button"
                        onClick={logout}
                        className="logout-button"
                    >
                        <span>↪</span>
                        Logout
                    </button>

                </div>

            </aside>

            {/* ==================================================
                MAIN
            ================================================== */}

            <main className="admin-main">

                <header className="admin-dashboard-header">

                    <div>

                        <p className="dashboard-eyebrow">
                            TILE REVIVE • ADMINISTRATION
                        </p>

                        <h1>
                            Dashboard
                        </h1>

                        <p>
                            Welcome back. Here's what's
                            happening with your store.
                        </p>

                    </div>

                    <div className="dashboard-header-actions">

                        <button
                            type="button"
                            className="refresh-dashboard"
                            onClick={loadDashboard}
                            disabled={refreshing}
                        >
                            {refreshing
                                ? "Refreshing..."
                                : "↻ Refresh"}
                        </button>

                    </div>

                </header>

                {/* ==================================================
                    ERROR
                ================================================== */}

                {error && (
                    <div className="dashboard-error">

                        <strong>
                            Dashboard error
                        </strong>

                        <span>
                            {error}
                        </span>

                        <button
                            type="button"
                            onClick={loadDashboard}
                        >
                            Try Again
                        </button>

                    </div>
                )}

                {/* ==================================================
                    STATISTICS
                ================================================== */}

                <section className="dashboard-stats">

                    <div className="stat-card">

                        <div className="stat-card-icon">
                            ORD
                        </div>

                        <div className="stat-card-content">

                            <span>
                                Total Orders
                            </span>

                            <strong>
                                {totalOrders}
                            </strong>

                            <small>
                                All orders
                            </small>

                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-card-icon">
                            KES
                        </div>

                        <div className="stat-card-content">

                            <span>
                                Total Received
                            </span>

                            <strong>
                                {formatCurrency(
                                    totalReceived
                                )}
                            </strong>

                            <small>
                                {totalTransactions} successful transaction
                                {totalTransactions === 1
                                    ? ""
                                    : "s"}
                            </small>

                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-card-icon">
                            DAY
                        </div>

                        <div className="stat-card-content">

                            <span>
                                Today's Revenue
                            </span>

                            <strong>
                                {formatCurrency(
                                    todayReceived
                                )}
                            </strong>

                            <small>
                                Payments received today
                            </small>

                        </div>

                    </div>

                    <div className="stat-card">

                        <div className="stat-card-icon">
                            SKU
                        </div>

                        <div className="stat-card-content">

                            <span>
                                Active Products
                            </span>

                            <strong>
                                {totalProducts}
                            </strong>

                            <small>
                                Products in store
                            </small>

                        </div>

                    </div>

                </section>

                {/* ==================================================
                    ORDER OVERVIEW
                ================================================== */}

                <section className="dashboard-section">

                    <div className="section-heading">

                        <div>
                            <h2>
                                Order Overview
                            </h2>

                            <p>
                                Current order activity
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={goToOrders}
                            className="section-action"
                        >
                            View All Orders →
                        </button>

                    </div>

                    <div className="order-overview">

                        <div className="overview-item pending">
                            <strong>
                                {pendingOrders}
                            </strong>

                            <span>
                                Pending
                            </span>
                        </div>

                        <div className="overview-item processing">
                            <strong>
                                {processingOrders}
                            </strong>

                            <span>
                                Processing
                            </span>
                        </div>

                        <div className="overview-item ready">
                            <strong>
                                {readyOrders}
                            </strong>

                            <span>
                                Ready
                            </span>
                        </div>

                        <div className="overview-item delivery">
                            <strong>
                                {outForDeliveryOrders}
                            </strong>

                            <span>
                                Out for Delivery
                            </span>
                        </div>

                        <div className="overview-item delivered">
                            <strong>
                                {deliveredOrders}
                            </strong>

                            <span>
                                Delivered
                            </span>
                        </div>

                        <div className="overview-item cancelled">
                            <strong>
                                {cancelledOrders}
                            </strong>

                            <span>
                                Cancelled
                            </span>
                        </div>

                    </div>

                </section>

                {/* ==================================================
                    INVENTORY
                ================================================== */}

                <section className="dashboard-section">

                    <div className="section-heading">

                        <div>

                            <h2>
                                Inventory
                            </h2>

                            <p>
                                Stock health overview
                            </p>

                        </div>

                    </div>

                    <div className="inventory-overview">

                        <div className="inventory-card">

                            <div>
                                <span>
                                    Active Products
                                </span>

                                <strong>
                                    {totalProducts}
                                </strong>
                            </div>

                            <span className="inventory-label normal">
                                IN STOCK
                            </span>

                        </div>

                        <div className="inventory-card">

                            <div>
                                <span>
                                    Low Stock
                                </span>

                                <strong>
                                    {lowStockCount}
                                </strong>
                            </div>

                            <span className="inventory-label warning">
                                ATTENTION
                            </span>

                        </div>

                        <div className="inventory-card">

                            <div>
                                <span>
                                    Out of Stock
                                </span>

                                <strong>
                                    {outOfStockCount}
                                </strong>
                            </div>

                            <span className="inventory-label danger">
                                URGENT
                            </span>

                        </div>

                    </div>

                    {(lowStock.length > 0 ||
                        outOfStock.length > 0) && (

                        <div className="inventory-alert-list">

                            {[
                                ...outOfStock,
                                ...lowStock,
                            ]
                                .slice(0, 5)
                                .map((product) => (

                                    <div
                                        className="inventory-alert"
                                        key={product.id}
                                    >

                                        <div>

                                            <strong>
                                                {product.name}
                                            </strong>

                                            <span>
                                                SKU:{" "}
                                                {product.sku ||
                                                    "N/A"}
                                            </span>

                                        </div>

                                        <strong>
                                            {product.stock} left
                                        </strong>

                                    </div>

                                ))}

                        </div>

                    )}

                </section>

                {/* ==================================================
                    RECENT ORDERS
                ================================================== */}

                <section className="dashboard-section">

                    <div className="section-heading">

                        <div>

                            <h2>
                                Recent Orders
                            </h2>

                            <p>
                                Latest customer orders
                            </p>

                        </div>

                        <button
                            type="button"
                            onClick={goToOrders}
                            className="section-action"
                        >
                            View All →
                        </button>

                    </div>

                    {orders.length === 0 ? (

                        <div className="empty-dashboard">
                            No orders have been placed yet.
                        </div>

                    ) : (

                        <div className="orders-table-wrapper">

                            <table className="orders-table">

                                <thead>

                                    <tr>
                                        <th>
                                            Order
                                        </th>

                                        <th>
                                            Customer
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
                                    </tr>

                                </thead>

                                <tbody>

                                    {orders
                                        .slice(0, 8)
                                        .map((order) => (

                                            <tr
                                                key={order.id}
                                            >

                                                <td>
                                                    <strong>
                                                        {order.orderNumber ||
                                                            `#${order.id}`}
                                                    </strong>
                                                </td>

                                                <td>
                                                    {
                                                        order.customer?.fullName ||
                                                        order.customer?.email ||
                                                        "Guest"
                                                    }
                                                </td>

                                                <td>
                                                    {formatCurrency(
                                                        order.totalAmount
                                                    )}
                                                </td>

                                                <td>

                                                    <span
                                                        className={`status-badge payment-${String(
                                                            order.paymentStatus ||
                                                            ""
                                                        ).toLowerCase()}`}
                                                    >
                                                        {
                                                            order.paymentStatus ||
                                                            "PENDING"
                                                        }
                                                    </span>

                                                </td>

                                                <td>

                                                    <span
                                                        className={`status-badge order-${String(
                                                            order.orderStatus ||
                                                            ""
                                                        ).toLowerCase()}`}
                                                    >
                                                        {
                                                            order.orderStatus ||
                                                            "PENDING"
                                                        }
                                                    </span>

                                                </td>

                                            </tr>

                                        ))}

                                </tbody>

                            </table>

                        </div>

                    )}

                </section>

                {/* ==================================================
                    USER APPROVALS
                ================================================== */}

                <section className="dashboard-section">

                    <div className="section-heading">

                        <div>

                            <h2>
                                User Approvals
                            </h2>

                            <p>
                                Customers waiting for approval
                            </p>

                        </div>

                    </div>

                    {pendingUsers.length === 0 ? (

                        <div className="empty-dashboard">
                            No users are waiting for approval.
                        </div>

                    ) : (

                        <div className="pending-users-list">

                            {pendingUsers
                                .slice(0, 5)
                                .map((user) => (

                                    <div
                                        className="pending-user"
                                        key={user.id}
                                    >

                                        <div>

                                            <strong>
                                                {user.fullName}
                                            </strong>

                                            <span>
                                                {user.email}
                                            </span>

                                        </div>

                                        <span className="pending-user-badge">
                                            PENDING
                                        </span>

                                    </div>

                                ))}

                        </div>

                    )}

                </section>

                {/* ==================================================
                    GALLERY
                ================================================== */}

                <section className="dashboard-section gallery-management-section">

                    <div className="section-heading">

                        <div>

                            <h2>
                                Gallery
                            </h2>

                            <p>
                                Manage before-and-after images,
                                product transformations and
                                customer projects.
                            </p>

                        </div>

                        <button
                            type="button"
                            className="gallery-add-button"
                            onClick={() =>
                                navigate(
                                    "/admin/gallery"
                                )
                            }
                        >
                            Manage Gallery →
                        </button>

                    </div>

                    <div className="gallery-management-content">

                        <div className="gallery-management-icon">
                            🖼️
                        </div>

                        <div className="gallery-management-text">

                            <h3>
                                Showcase Your Results
                            </h3>

                            <p>
                                Keep your website gallery
                                fresh with high-quality
                                cleaning transformations
                                and product imagery.
                            </p>

                        </div>

                    </div>

                </section>

                {/* ==================================================
                    QUICK MANAGEMENT
                ================================================== */}

                <section className="dashboard-section">

                    <div className="section-heading">

                        <div>

                            <h2>
                                Quick Management
                            </h2>

                            <p>
                                Manage your store
                            </p>

                        </div>

                    </div>

                    <div className="quick-management">

                        <button
                            type="button"
                            onClick={goToOrders}
                        >
                            Manage Orders
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/admin/products"
                                )
                            }
                        >
                            Manage Products
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/admin/inventory"
                                )
                            }
                        >
                            Manage Inventory
                        </button>

                        <button
                            type="button"
                            onClick={() =>
                                navigate(
                                    "/admin/gallery"
                                )
                            }
                        >
                            Manage Gallery
                        </button>

                    </div>

                </section>

            </main>

        </div>
    );
}

export default AdminDashboard;