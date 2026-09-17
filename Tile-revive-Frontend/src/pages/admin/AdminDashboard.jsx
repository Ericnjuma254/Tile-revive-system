import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

import {
    getAdminDashboard,
    getAdminOrders,
    getPendingUsers,
    getFinancialSummary,
} from "../../services/api";

import "./AdminDashboard.css";
import AdminSidebar from "./components/AdminSidebar";

function AdminDashboard() {
    const navigate = useNavigate();

    const [dashboard, setDashboard] = useState(null);
    const [financial, setFinancial] = useState(null);
    const [financialPeriod, setFinancialPeriod] = useState("this_month");
const getFinancialPeriodDates = (period) => {
    const now = new Date();

    const startOfDay = (date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const endOfDay = (date) => {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    };

    switch (period) {
        case "today": {
            return {
                startDate: startOfDay(now).toISOString(),
                endDate: endOfDay(now).toISOString(),
            };
        }

        case "yesterday": {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);

            return {
                startDate: startOfDay(yesterday).toISOString(),
                endDate: endOfDay(yesterday).toISOString(),
            };
        }
        case "last_7_days": {
            const start = new Date(now);
            start.setDate(start.getDate() - 6);

            return {
                startDate: startOfDay(start).toISOString(),
                endDate: endOfDay(now).toISOString(),
            };
        }

        case "this_month": {
            const start = new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            );

            return {
                startDate: startOfDay(start).toISOString(),
                endDate: endOfDay(now).toISOString(),
            };
        }

        case "last_month": {
            const start = new Date(
                now.getFullYear(),
                now.getMonth() - 1,
                1
            );

            const end = new Date(
                now.getFullYear(),
                now.getMonth(),
                0
            );

            return {
                startDate: startOfDay(start).toISOString(),
                endDate: endOfDay(end).toISOString(),
            };
        }

        case "this_year": {
            const start = new Date(
                now.getFullYear(),
                0,
                1
            );

            return {
                startDate: startOfDay(start).toISOString(),
                endDate: endOfDay(now).toISOString(),
            };
        }

        default:
            return {
                startDate: undefined,
                endDate: undefined,
            };
    }
};

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
                financialData,
            ] = await Promise.all([
                getAdminDashboard(),
                getAdminOrders(),
                getPendingUsers(),
                (console.log("DASHBOARD: calling getFinancialSummary", financialPeriod), getFinancialSummary(getFinancialPeriodDates(financialPeriod))),
            ]);

            setDashboard(
                dashboardData || {}
            );

            setFinancial(
                financialData || {}
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
    }, [logout, financialPeriod]);

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

    // ======================================================
    // CENTRAL FINANCIAL ENGINE
    // ======================================================

    const financialRevenue =
        Number(financial?.revenue || 0);

    const financialCOGS =
        Number(financial?.cogs || 0);

    const financialGrossProfit =
        Number(financial?.grossProfit || 0);

    const financialExpenses =
        Number(financial?.totalExpenses || 0);

    const financialNetProfit =
        Number(financial?.netProfit || 0);

    const financialCashFlow =
        Number(financial?.cashFlow || 0);

    const salesTrend = Array.isArray(financial?.salesTrend)
    ? financial.salesTrend
    : [];

const orderStatusBreakdown = Array.isArray(
    financial?.orderStatusBreakdown
)
    ? financial.orderStatusBreakdown
    : [];

const paymentStatusBreakdown = Array.isArray(
    financial?.paymentStatusBreakdown
)
    ? financial.paymentStatusBreakdown
    : [];

const productPerformance = Array.isArray(
    financial?.productPerformance
)
    ? financial.productPerformance
    : [];

const customerJourney = financial?.customerJourney || {};

const financialChartData = [
    {
        name: "Revenue",
        value: financialRevenue,
    },
    {
        name: "COGS",
        value: financialCOGS,
    },
    {
        name: "Expenses",
        value: financialExpenses,
    },
    {
        name: "Net Profit",
        value: financialNetProfit,
    },
];

const topProducts = [...productPerformance]
    .sort(
        (a, b) =>
            Number(b.revenue || 0) -
            Number(a.revenue || 0)
    )
    .slice(0, 8);

const customerJourneyData = [
    {
        name: "Page Views",
        value: Number(customerJourney.pageViews || 0),
    },
    {
        name: "Product Views",
        value: Number(customerJourney.productViews || 0),
    },
    {
        name: "Add to Cart",
        value: Number(customerJourney.addToCart || 0),
    },
    {
        name: "Checkout",
        value: Number(customerJourney.checkoutStarted || 0),
    },
    {
        name: "Orders",
        value: Number(customerJourney.ordersPlaced || 0),
    },
    {
        name: "Payments",
        value: Number(customerJourney.paymentsCompleted || 0),
    },
];

const financialProfitMargin =
        Number(financial?.profitMargin || 0);

    const financialMissingCosts =
        Number(financial?.missingCostItems || 0);

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

            <AdminSidebar pendingUsersCount={pendingUsers.length} onLogout={logout} />

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
                    FINANCIAL SNAPSHOT
                ================================================== */}

                <section className="dashboard-section financial-snapshot">

                    <div className="section-heading">

                        <div>
                            <h2>
                                Financial Snapshot
                            </h2>

                            <p>
                                Current financial performance from the central financial engine
                            </p>
                        </div>

                        <div className="financial-filter-wrapper">
                            <label htmlFor="financial-period">
                                Period
                            </label>

                            <select
                                id="financial-period"
                                className="financial-period-select"
                                value={financialPeriod}
                                onChange={(event) =>
                                    setFinancialPeriod(event.target.value)
                                }
                            >
                                <option value="today">
                                    Today
                                </option>

                                <option value="yesterday">
                                    Yesterday
                                </option>

                                <option value="last_7_days">
                                    Last 7 Days
                                </option>

                                <option value="this_month">
                                    This Month
                                </option>

                                <option value="last_month">
                                    Last Month
                                </option>

                                <option value="last_3_months">
                                    Last 3 Months
                                </option>

                                <option value="this_year">
                                    This Year
                                </option>

                                <option value="all_time">
                                    All Time
                                </option>
                            </select>
                        </div>

                        <button
                            type="button"
                            className="financial-report-button"
                            onClick={() =>
                                navigate("/admin/reports")
                            }
                        >
                            View Financial Reports
                            <span>→</span>
                        </button>

                    </div>

                    <div className="financial-dashboard-grid">

                        <div className="financial-dashboard-card revenue">

                            <span>Revenue</span>

                            <strong>
                                {formatCurrency(
                                    financialRevenue
                                )}
                            </strong>

                            <small>
                                Successful payments
                            </small>

                        </div>

                        <div className="financial-dashboard-card cogs">

                            <span>COGS</span>

                            <strong>
                                {formatCurrency(
                                    financialCOGS
                                )}
                            </strong>

                            <small>
                                Cost of goods sold
                            </small>

                        </div>

                        <div className="financial-dashboard-card gross">

                            <span>Gross Profit</span>

                            <strong>
                                {formatCurrency(
                                    financialGrossProfit
                                )}
                            </strong>

                            <small>
                                Revenue minus COGS
                            </small>

                        </div>

                        <div className="financial-dashboard-card expenses">

                            <span>Expenses</span>

                            <strong>
                                {formatCurrency(
                                    financialExpenses
                                )}
                            </strong>

                            <small>
                                Paid business expenses
                            </small>

                        </div>

                        <div
                            className={`financial-dashboard-card ${
                                financialNetProfit >= 0
                                    ? "positive"
                                    : "negative"
                            }`}
                        >

                            <span>Net Profit</span>

                            <strong>
                                {formatCurrency(
                                    financialNetProfit
                                )}
                            </strong>

                            <small>
                                After COGS & expenses
                            </small>

                        </div>

                        <div
                            className={`financial-dashboard-card ${
                                financialCashFlow >= 0
                                    ? "positive"
                                    : "negative"
                            }`}
                        >

                            <span>Cash Flow</span>

                            <strong>
                                {formatCurrency(
                                    financialCashFlow
                                )}
                            </strong>

                            <small>
                                Cash in minus cash out
                            </small>

                        </div>

                    </div>

                    <div className="financial-dashboard-footer">

                        <div>
                            <span>Profit Margin</span>

                            <strong>
                                {financialProfitMargin.toFixed(1)}%
                            </strong>
                        </div>

                        <div>
                            <span>Financial Status</span>

                            <strong
                                className={
                                    financialMissingCosts > 0
                                        ? "warning"
                                        : "healthy"
                                }
                            >
                                {financialMissingCosts > 0
                                    ? `${financialMissingCosts} product cost${
                                          financialMissingCosts === 1
                                              ? ""
                                              : "s"
                                      } missing`
                                    : "Cost data complete"}
                            </strong>
                        </div>

                    </div>

                </section>

                {/* ==================================================
                    ANALYTICS & GRAPHS
                ================================================== */}

                <section className="admin-analytics-section">

                    <div className="admin-section-heading">
                        <div>
                            <span className="admin-section-kicker">
                                PERFORMANCE
                            </span>

                            <h2>
                                Business Analytics
                            </h2>

                            <p>
                                Real sales, order, product and customer activity
                                from your store data.
                            </p>
                        </div>
                    </div>

                    <div className="admin-chart-grid admin-chart-grid-primary">

                        {/* SALES & ORDERS TREND */}

                        <div className="admin-chart-card admin-chart-card-wide">

                            <div className="admin-chart-header">
                                <div>
                                    <h3>
                                        Sales &amp; Orders Trend
                                    </h3>

                                    <p>
                                        Revenue and order activity for the selected
                                        reporting period.
                                    </p>
                                </div>
                            </div>

                            {salesTrend.length > 0 ? (

                                <div className="admin-chart-container">

                                    <ResponsiveContainer
                                        width="100%"
                                        height={330}
                                    >

                                        <AreaChart data={salesTrend}>

                                            <defs>

                                                <linearGradient
                                                    id="adminRevenueGradient"
                                                    x1="0"
                                                    y1="0"
                                                    x2="0"
                                                    y2="1"
                                                >

                                                    <stop
                                                        offset="5%"
                                                        stopColor="#d4a017"
                                                        stopOpacity={0.35}
                                                    />

                                                    <stop
                                                        offset="95%"
                                                        stopColor="#d4a017"
                                                        stopOpacity={0}
                                                    />

                                                </linearGradient>

                                            </defs>

                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="rgba(255,255,255,0.08)"
                                            />

                                            <XAxis
                                                dataKey="name"
                                                stroke="#929292"
                                                tick={{
                                                    fill: "#929292",
                                                    fontSize: 12
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                            />

                                            <YAxis
                                                yAxisId="revenue"
                                                stroke="#929292"
                                                tick={{
                                                    fill: "#929292",
                                                    fontSize: 12
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={value =>
                                                    `KSh ${Number(value || 0).toLocaleString()}`
                                                }
                                            />

                                            <YAxis
                                                yAxisId="orders"
                                                orientation="right"
                                                stroke="#929292"
                                                tick={{
                                                    fill: "#929292",
                                                    fontSize: 12
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                                allowDecimals={false}
                                            />

                                            <Tooltip
                                                contentStyle={{
                                                    background: "#111111",
                                                    border: "1px solid rgba(212,160,23,0.35)",
                                                    borderRadius: "10px",
                                                    color: "#f5f5f5"
                                                }}
                                                formatter={(value, name) => {

                                                    if (name === "Revenue") {
                                                        return [
                                                            `KSh ${Number(value || 0).toLocaleString()}`,
                                                            name
                                                        ];
                                                    }

                                                    return [
                                                        value,
                                                        name
                                                    ];
                                                }}
                                            />

                                            <Legend />

                                            <Area
                                                yAxisId="revenue"
                                                type="monotone"
                                                dataKey="revenue"
                                                name="Revenue"
                                                stroke="#d4a017"
                                                strokeWidth={2.5}
                                                fill="url(#adminRevenueGradient)"
                                                activeDot={{
                                                    r: 5
                                                }}
                                            />

                                            <Line
                                                yAxisId="orders"
                                                type="monotone"
                                                dataKey="orders"
                                                name="Orders"
                                                stroke="#f1c75b"
                                                strokeWidth={2}
                                                dot={{
                                                    r: 3
                                                }}
                                                activeDot={{
                                                    r: 5
                                                }}
                                            />

                                        </AreaChart>

                                    </ResponsiveContainer>

                                </div>

                            ) : (

                                <div className="admin-chart-empty">

                                    <strong>
                                        No sales trend data
                                    </strong>

                                    <span>
                                        There are no orders in the selected
                                        reporting period yet.
                                    </span>

                                </div>

                            )}

                        </div>


                        {/* ORDER STATUS */}

                        <div className="admin-chart-card">

                            <div className="admin-chart-header">

                                <div>

                                    <h3>
                                        Order Status
                                    </h3>

                                    <p>
                                        Current order distribution.
                                    </p>

                                </div>

                            </div>

                            {orderStatusBreakdown.length > 0 ? (

                                <div className="admin-chart-container admin-chart-container-donut">

                                    <ResponsiveContainer
                                        width="100%"
                                        height={330}
                                    >

                                        <PieChart>

                                            <Pie
                                                data={orderStatusBreakdown}
                                                dataKey="count"
                                                nameKey="status"
                                                cx="50%"
                                                cy="48%"
                                                innerRadius={75}
                                                outerRadius={115}
                                                paddingAngle={3}
                                            >

                                                {orderStatusBreakdown.map(
                                                    (entry, index) => (

                                                        <Cell
                                                            key={`order-status-${entry.status}-${index}`}
                                                            fill={[
                                                                "#d4a017",
                                                                "#31d17c",
                                                                "#f0b429",
                                                                "#5b8def",
                                                                "#a855f7",
                                                                "#ef5350",
                                                                "#929292"
                                                            ][index % 7]}
                                                        />

                                                    )
                                                )}

                                            </Pie>

                                            <Tooltip
                                                contentStyle={{
                                                    background: "#111111",
                                                    border: "1px solid rgba(212,160,23,0.35)",
                                                    borderRadius: "10px",
                                                    color: "#f5f5f5"
                                                }}
                                            />

                                            <Legend
                                                formatter={value =>
                                                    String(value)
                                                        .replaceAll(
                                                            "_",
                                                            " "
                                                        )
                                                        .replace(
                                                            /\b\w/g,
                                                            letter =>
                                                                letter.toUpperCase()
                                                        )
                                                }
                                            />

                                        </PieChart>

                                    </ResponsiveContainer>

                                </div>

                            ) : (

                                <div className="admin-chart-empty">

                                    <strong>
                                        No order status data
                                    </strong>

                                    <span>
                                        Order status analytics will appear
                                        once orders are available.
                                    </span>

                                </div>

                            )}

                        </div>

                    </div>


                    <div className="admin-chart-grid admin-chart-grid-secondary">

                        {/* FINANCIAL BREAKDOWN */}

                        <div className="admin-chart-card">

                            <div className="admin-chart-header">

                                <div>

                                    <h3>
                                        Financial Breakdown
                                    </h3>

                                    <p>
                                        Revenue, COGS, expenses and net profit.
                                    </p>

                                </div>

                            </div>

                            <div className="admin-chart-container">

                                <ResponsiveContainer
                                    width="100%"
                                    height={300}
                                >

                                    <BarChart
                                        data={financialChartData}
                                    >

                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="rgba(255,255,255,0.08)"
                                        />

                                        <XAxis
                                            dataKey="name"
                                            stroke="#929292"
                                            tick={{
                                                fill: "#929292",
                                                fontSize: 12
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <YAxis
                                            stroke="#929292"
                                            tick={{
                                                fill: "#929292",
                                                fontSize: 12
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                            tickFormatter={value =>
                                                `KSh ${Number(value || 0).toLocaleString()}`
                                            }
                                        />

                                        <Tooltip
                                            contentStyle={{
                                                background: "#111111",
                                                border: "1px solid rgba(212,160,23,0.35)",
                                                borderRadius: "10px",
                                                color: "#f5f5f5"
                                            }}
                                            formatter={value =>
                                                `KSh ${Number(value || 0).toLocaleString()}`
                                            }
                                        />

                                        <Bar
                                            dataKey="value"
                                            name="Amount"
                                            fill="#d4a017"
                                            radius={[
                                                6,
                                                6,
                                                0,
                                                0
                                            ]}
                                        />

                                    </BarChart>

                                </ResponsiveContainer>

                            </div>

                        </div>


                        {/* TOP PRODUCTS */}

                        <div className="admin-chart-card">

                            <div className="admin-chart-header">

                                <div>

                                    <h3>
                                        Top Products
                                    </h3>

                                    <p>
                                        Products ranked by actual recorded
                                        revenue.
                                    </p>

                                </div>

                            </div>

                            {topProducts.length > 0 ? (

                                <div className="admin-chart-container">

                                    <ResponsiveContainer
                                        width="100%"
                                        height={300}
                                    >

                                        <BarChart
                                            data={topProducts}
                                            layout="vertical"
                                            margin={{
                                                top: 5,
                                                right: 20,
                                                left: 20,
                                                bottom: 5
                                            }}
                                        >

                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="rgba(255,255,255,0.08)"
                                            />

                                            <XAxis
                                                type="number"
                                                stroke="#929292"
                                                tick={{
                                                    fill: "#929292",
                                                    fontSize: 11
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                                tickFormatter={value =>
                                                    `KSh ${Number(value || 0).toLocaleString()}`
                                                }
                                            />

                                            <YAxis
                                                type="category"
                                                dataKey="name"
                                                width={120}
                                                stroke="#929292"
                                                tick={{
                                                    fill: "#929292",
                                                    fontSize: 11
                                                }}
                                                axisLine={false}
                                                tickLine={false}
                                            />

                                            <Tooltip
                                                contentStyle={{
                                                    background: "#111111",
                                                    border: "1px solid rgba(212,160,23,0.35)",
                                                    borderRadius: "10px",
                                                    color: "#f5f5f5"
                                                }}
                                                formatter={(value, name) => {

                                                    if (name === "Revenue") {
                                                        return [
                                                            `KSh ${Number(value || 0).toLocaleString()}`,
                                                            name
                                                        ];
                                                    }

                                                    return [
                                                        value,
                                                        name
                                                    ];
                                                }}
                                            />

                                            <Bar
                                                dataKey="revenue"
                                                name="Revenue"
                                                fill="#d4a017"
                                                radius={[
                                                    0,
                                                    6,
                                                    6,
                                                    0
                                                ]}
                                            />

                                        </BarChart>

                                    </ResponsiveContainer>

                                </div>

                            ) : (

                                <div className="admin-chart-empty">

                                    <strong>
                                        No product sales data
                                    </strong>

                                    <span>
                                        Product performance will appear
                                        once sales have been recorded.
                                    </span>

                                </div>

                            )}

                        </div>


                        {/* CUSTOMER JOURNEY */}

                        <div className="admin-chart-card admin-chart-card-wide">

                            <div className="admin-chart-header">

                                <div>

                                    <h3>
                                        Customer Journey
                                    </h3>

                                    <p>
                                        Actual customer activity through the
                                        shopping funnel.
                                    </p>

                                </div>

                            </div>

                            <div className="admin-chart-container">

                                <ResponsiveContainer
                                    width="100%"
                                    height={300}
                                >

                                    <LineChart
                                        data={customerJourneyData}
                                    >

                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="rgba(255,255,255,0.08)"
                                        />

                                        <XAxis
                                            dataKey="name"
                                            stroke="#929292"
                                            tick={{
                                                fill: "#929292",
                                                fontSize: 11
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <YAxis
                                            stroke="#929292"
                                            tick={{
                                                fill: "#929292",
                                                fontSize: 11
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                            allowDecimals={false}
                                        />

                                        <Tooltip
                                            contentStyle={{
                                                background: "#111111",
                                                border: "1px solid rgba(212,160,23,0.35)",
                                                borderRadius: "10px",
                                                color: "#f5f5f5"
                                            }}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            name="Events"
                                            stroke="#d4a017"
                                            strokeWidth={3}
                                            dot={{
                                                r: 4
                                            }}
                                            activeDot={{
                                                r: 6
                                            }}
                                        />

                                    </LineChart>

                                </ResponsiveContainer>

                            </div>

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











