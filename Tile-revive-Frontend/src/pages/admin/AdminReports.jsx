import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
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
    ResponsiveContainer,
} from "recharts";

import { useNavigate } from "react-router-dom";

import {
    getAdminReports,
    getFinancialSummary,
    getFinancialTrend,
    getProductProfitability,
    getExpenseBreakdown,
    getCashFlow,
} from "../../services/api";

import GeographicAnalytics from "./GeographicAnalytics";

import "./AdminReports.css";


// ============================================================
// HELPERS
// ============================================================

const currency = (value) =>
    `KES ${Number(value || 0).toLocaleString()}`;

const number = (value) =>
    Number(value || 0).toLocaleString();

const percent = (value) =>
    `${Number(value || 0).toFixed(1)}%`;


// ============================================================
// FINANCIAL DATE RANGE
// ============================================================

const getFinancialDateRange = (selectedPeriod) => {

    const end = new Date();
    const start = new Date(end);

    switch (selectedPeriod) {

        case "1D":
            start.setHours(0, 0, 0, 0);
            break;

        case "7D":
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            break;

        case "30D":
            start.setDate(start.getDate() - 29);
            start.setHours(0, 0, 0, 0);
            break;

        case "90D":
            start.setDate(start.getDate() - 89);
            start.setHours(0, 0, 0, 0);
            break;

        case "1Y":
            start.setMonth(0, 1);
            start.setHours(0, 0, 0, 0);
            break;

        default:
            start.setDate(start.getDate() - 29);
            start.setHours(0, 0, 0, 0);
            break;
    }

    const formatDate = (date) =>
        date.toISOString().slice(0, 10);

    return {
        startDate: formatDate(start),
        endDate: formatDate(end),
    };
};


function getTimelineConfig(period) {
    switch (period) {
        case "1D":
            return {
                buckets: 24,
                unit: "hour",
                format: "hour",
            };

        case "7D":
            return {
                buckets: 7,
                unit: "day",
                format: "day",
            };

        case "1Y":
            return {
                buckets: 12,
                unit: "month",
                format: "month",
            };

        case "30D":
        default:
            return {
                buckets: 30,
                unit: "day",
                format: "day",
            };
    }
}


function getDateValue(item) {
    const value =
        item?.createdAt ||
        item?.created_at ||
        item?.date ||
        item?.orderDate ||
        item?.timestamp;

    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? null
        : date;
}


function buildSalesTimeline(
    period,
    recentOrders = [],
    backendTrend = []
) {

    // --------------------------------------------------------
    // Prefer backend timeline when available
    // --------------------------------------------------------

    if (
        Array.isArray(backendTrend) &&
        backendTrend.length
    ) {
        return backendTrend.map(
            (item, index) => ({
                name:
                    item.name ||
                    item.date ||
                    item.day ||
                    `D${index + 1}`,

                revenue:
                    Number(
                        item.revenue ??
                        item.sales ??
                        item.amount ??
                        0
                    ),

                orders:
                    Number(
                        item.orders ??
                        item.count ??
                        0
                    ),
            })
        );
    }

    // --------------------------------------------------------
    // Generate timeline from recent orders
    // --------------------------------------------------------

    const config =
        getTimelineConfig(period);

    const orders =
        Array.isArray(recentOrders)
            ? recentOrders
            : [];

    const now = new Date();

    const buckets = [];

    if (period === "1D") {

        for (let i = 23; i >= 0; i--) {

            const date = new Date(now);

            date.setMinutes(0, 0, 0);
            date.setHours(
                date.getHours() - i
            );

            buckets.push({
                key: date.toISOString(),
                name: date.toLocaleTimeString(
                    [],
                    {
                        hour: "2-digit",
                    }
                ),
                revenue: 0,
                orders: 0,
            });
        }

    } else if (period === "7D") {

        for (let i = 6; i >= 0; i--) {

            const date = new Date(now);

            date.setHours(0, 0, 0, 0);

            date.setDate(
                date.getDate() - i
            );

            buckets.push({
                key: date.toISOString().slice(0, 10),
                name: date.toLocaleDateString(
                    [],
                    {
                        weekday: "short",
                    }
                ),
                revenue: 0,
                orders: 0,
            });
        }

    } else if (period === "1Y") {

        for (let i = 11; i >= 0; i--) {

            const date = new Date(now);

            date.setDate(1);
            date.setHours(0, 0, 0, 0);

            date.setMonth(
                date.getMonth() - i
            );

            buckets.push({
                key:
                    `${date.getFullYear()}-${String(
                        date.getMonth() + 1
                    ).padStart(2, "0")}`,

                name:
                    date.toLocaleDateString(
                        [],
                        {
                            month: "short",
                        }
                    ),

                revenue: 0,
                orders: 0,
            });
        }

    } else {

        for (let i = 29; i >= 0; i--) {

            const date = new Date(now);

            date.setHours(0, 0, 0, 0);

            date.setDate(
                date.getDate() - i
            );

            buckets.push({
                key: date.toISOString().slice(0, 10),
                name:
                    date.toLocaleDateString(
                        [],
                        {
                            day: "numeric",
                            month: "short",
                        }
                    ),
                revenue: 0,
                orders: 0,
            });
        }
    }

    // --------------------------------------------------------
    // Put orders into timeline buckets
    // --------------------------------------------------------

    orders.forEach((order) => {

        const date =
            getDateValue(order);

        if (!date) return;

        let key;

        if (period === "1D") {

            date.setMinutes(0, 0, 0);

            key = date.toISOString();

        } else if (period === "1Y") {

            key =
                `${date.getFullYear()}-${String(
                    date.getMonth() + 1
                ).padStart(2, "0")}`;

        } else {

            key =
                date.toISOString().slice(
                    0,
                    10
                );
        }

        const bucket =
            buckets.find(
                (item) =>
                    item.key === key
            );

        if (!bucket) return;

        const amount =
            Number(
                order.totalAmount ??
                order.total ??
                order.amount ??
                order.totalPrice ??
                0
            );

        bucket.revenue += amount;
        bucket.orders += 1;
    });

    return buckets;
}


// ============================================================
// SAFE DATA NORMALIZER
// ============================================================

function ChartTooltip({
    active,
    payload,
    label,
}) {
    if (!active || !payload || !payload.length) {
        return null;
    }

    return (
        <div
            style={{
                background: "#0a0a0a",
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: "10px",
                padding: "12px 14px",
                boxShadow: "0 12px 35px rgba(0,0,0,.45)",
            }}
        >
            {label && (
                <div
                    style={{
                        color: "#fff",
                        fontSize: "11px",
                        fontWeight: 700,
                        marginBottom: "8px",
                        letterSpacing: ".08em",
                        textTransform: "uppercase",
                    }}
                >
                    {label}
                </div>
            )}

            {payload.map((item, index) => (
                <div
                    key={`${item.dataKey || item.name}-${index}`}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "24px",
                        marginTop: "5px",
                        fontSize: "12px",
                    }}
                >
                    <span
                        style={{
                            color: "rgba(255,255,255,.65)",
                        }}
                    >
                        {item.name || item.dataKey}
                    </span>

                    <strong
                        style={{
                            color: "#32e875",
                        }}
                    >
                        {typeof item.value === "number"
                            ? item.value.toLocaleString()
                            : item.value}
                    </strong>
                </div>
            ))}
        </div>
    );
}

function normalizeReports(raw) {

    const data = raw || {};

    // ============================================================
    // ACTUAL BACKEND RESPONSE
    // ============================================================

    const summary =
        data.summary || {};

    const liveCustomers =
        data.liveCustomers || {};

    const customerJourney =
        data.customerJourney || {};

    const productPerformance =
        Array.isArray(data.productPerformance)
            ? data.productPerformance
            : [];

    const advertising =
        data.advertising || {};

    const recentOrders =
        Array.isArray(data.recentOrders)
            ? data.recentOrders
            : [];

    const orderStatusBreakdown =
        Array.isArray(data.orderStatusBreakdown)
            ? data.orderStatusBreakdown
            : [];

    const paymentStatusBreakdown =
        Array.isArray(data.paymentStatusBreakdown)
            ? data.paymentStatusBreakdown
            : [];

    // ============================================================
    // CORE BUSINESS VALUES
    // ============================================================

    const revenue =
        Number(summary.totalRevenue || 0);

    const expenditure =
        Number(summary.totalExpenditure || 0);

    const profit =
        Number(
            summary.totalProfit ??
            (revenue - expenditure)
        );

    const orders =
        Number(summary.totalOrders || 0);

    const customersCount =
        Number(summary.totalCustomers || 0);

    const activeCustomers =
        Number(liveCustomers.count || 0);

    // ============================================================
    // CUSTOMER JOURNEY
    // ============================================================

    const visitors =
        Number(customerJourney.pageViews || 0);

    const productViews =
        Number(customerJourney.productViews || 0);

    const addToCart =
        Number(customerJourney.addToCart || 0);

    const checkoutStarted =
        Number(customerJourney.checkoutStarted || 0);

    const ordersPlaced =
        Number(customerJourney.ordersPlaced || 0);

    const paymentsStarted =
        Number(customerJourney.paymentsStarted || 0);

    const paymentsCompleted =
        Number(customerJourney.paymentsCompleted || 0);

    const conversion =
        visitors > 0
            ? (ordersPlaced / visitors) * 100
            : 0;

    // ============================================================
    // CUSTOMER JOURNEY CHART
    // ============================================================

    const customerTrend = [
        {
            name: "Page Views",
            visitors,
            customers: customersCount,
        },
        {
            name: "Products",
            visitors: productViews,
            customers: customersCount,
        },
        {
            name: "Cart",
            visitors: addToCart,
            customers: customersCount,
        },
        {
            name: "Checkout",
            visitors: checkoutStarted,
            customers: customersCount,
        },
        {
            name: "Orders",
            visitors: ordersPlaced,
            customers: customersCount,
        },
        {
            name: "Payments",
            visitors: paymentsCompleted,
            customers: customersCount,
        },
    ];

    // ============================================================
    // PAYMENT STATUS
    // ============================================================

    const paymentMethods =
        paymentStatusBreakdown.map(
            item => ({
                name:
                    item.status || "UNKNOWN",

                value:
                    Number(item.count || 0),
            })
        );

    // ============================================================
    // NORMALIZED REPORT
    // ============================================================

    return {
        raw: data,

        revenue,
        expenditure,
        profit,
        orders,

        customersCount,
        activeCustomers,

        visitors,
        conversion,

        salesTrend:
            Array.isArray(data.salesTrend)
                ? data.salesTrend
                : [],
        customerTrend,

        productPerformance,

        trafficSources: [],
        paymentMethods,

        advertising,

        recentOrders,

        orderStatusBreakdown,
        paymentStatusBreakdown,

        customerJourney,
        liveCustomers,
        summary,

        geographicAnalytics:
            data.geographicAnalytics || {
                summary: {},
                counties: [],
                orders: [],
            },
    };
}


function AdminReports() {

    const navigate = useNavigate();

    const [reports, setReports] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");

    // ========================================================
    // CENTRAL FINANCIAL DATA
    // ========================================================

    const [financial, setFinancial] = useState(null);
    const [financialTrend, setFinancialTrend] = useState([]);
    const [productProfitability, setProductProfitability] = useState([]);
    const [expenseBreakdown, setExpenseBreakdown] = useState([]);
    const [cashFlow, setCashFlow] = useState(null);

    const [activeSection, setActiveSection] =
        useState("overview");

    const [period, setPeriod] =
        useState("30D");

    const [menuOpen, setMenuOpen] =
        useState(false);


    // ========================================================
    // LOAD
    // ========================================================

    const loadReports = useCallback(async () => {

        try {

            setError("");
            setRefreshing(true);

            const { startDate, endDate } =
                getFinancialDateRange(period);

            const requestDefinitions = [
                ["adminReports", () => getAdminReports(period)],
                ["financialSummary", () => getFinancialSummary({ startDate, endDate })],
                ["financialTrend", () => getFinancialTrend({ startDate, endDate })],
                ["productProfitability", () => getProductProfitability({ startDate, endDate })],
                ["expenseBreakdown", () => getExpenseBreakdown({ startDate, endDate })],
                ["cashFlow", () => getCashFlow({ startDate, endDate })],
            ];

            const requestResults = await Promise.all(
                requestDefinitions.map(async ([name, requestFn]) => {
                    try {
                        const result = await requestFn();
                        console.log(`REPORT API OK: ${name}`, result);
                        return result;
                    } catch (requestError) {
                        console.error(`REPORT API FAILED: ${name}`, requestError);
                        throw requestError;
                    }
                })
            );

            const [
                reportResult,
                financialResult,
                financialTrendResult,
                productProfitabilityResult,
                expenseBreakdownResult,
                cashFlowResult,
            ] = requestResults;

            setReports(
                normalizeReports(reportResult)
            );

            setFinancial(
                financialResult?.data ??
                financialResult ??
                null
            );

            setFinancialTrend(
                financialTrendResult?.data ??
                financialTrendResult ??
                []
            );

            setProductProfitability(
                productProfitabilityResult?.data ??
                productProfitabilityResult ??
                []
            );

            setExpenseBreakdown(
                expenseBreakdownResult?.data ??
                expenseBreakdownResult ??
                []
            );
            setCashFlow(
                cashFlowResult?.data ??
                cashFlowResult ??
                null
            );

        } catch (err) {

            console.error(
                "ADMIN REPORTS ERROR:",
                err
            );

            setError(
                err?.message ||
                "Unable to load reports."
            );
        } finally {

            setLoading(false);
            setRefreshing(false);

        }

    }, [period]);
    useEffect(() => {

        loadReports();

    }, [loadReports, period]);


    // ========================================================
    // DERIVED
    // ========================================================

    const data = useMemo(
        () => reports || normalizeReports({}),
        [reports]
    );


    const reportSections = [
        {
            id: "overview",
            number: "00",
            label: "Overview",
            description: "Business command center",
        },
        {
            id: "sales",
            number: "01",
            label: "Sales Analytics",
            description: "Revenue and order performance",
        },
        {
            id: "customers",
            number: "02",
            label: "Customer Analytics",
            description: "Visitors and customer behaviour",
        },
        {
            id: "products",
            number: "03",
            label: "Product Analytics",
            description: "Products and sales performance",
        },
        {
            id: "marketing",
            number: "04",
            label: "Marketing Analytics",
            description: "Traffic and campaign intelligence",
        },
        {
            id: "financial",
            number: "05",
            label: "Financial Analytics",
            description: "Revenue, expenses and profit",
        },
        {
            id: "geographic",
            number: "06",
            label: "Geographic Analytics",
            description: "Where customers are buying",
        },
    ];


    const currentSection =
        reportSections.find(
            (section) =>
                section.id === activeSection
        ) || reportSections[0];


    // ========================================================
    // CHART DATA
    // ========================================================

    const financialTrendData = useMemo(() => {

        if (!Array.isArray(financialTrend)) {
            return [];
        }

        return financialTrend.map((item, index) => ({

            name:
                item.name ||
                item.date ||
                item.day ||
                `D${index + 1}`,

            revenue:
                Number(item.revenue || 0),

            cogs:
                Number(item.cogs || 0),

            grossProfit:
                Number(item.grossProfit || 0),

            expenses:
                Number(item.expenses || 0),

            netProfit:
                Number(item.netProfit || 0),

            cashIn:
                Number(item.revenue || 0),

            cashOut:
                Number(item.expenses || 0),

            cashFlow:
                Number(item.revenue || 0) -
                Number(item.expenses || 0),

        }));

    }, [financialTrend]);


    const expenseBreakdownData = useMemo(() => {

        if (!Array.isArray(expenseBreakdown)) {
            return [];
        }

        return expenseBreakdown
            .map((item, index) => ({

                name:
                    item.category ||
                    item.name ||
                    `Category ${index + 1}`,

                value:
                    Number(
                        item.amount ??
                        item.total ??
                        item.value ??
                        0
                    ),

            }))
            .filter(
                (item) => item.value > 0
            );

    }, [expenseBreakdown]);


    const profitabilityData = useMemo(() => {

        if (!Array.isArray(productProfitability)) {
            return [];
        }

        return [...productProfitability]
            .sort(
                (a, b) =>
                    Number(b.grossProfit || 0) -
                    Number(a.grossProfit || 0)
            )
            .slice(0, 8)
            .map((item, index) => ({

                name:
                    item.productName ||
                    item.name ||
                    `Product ${index + 1}`,

                revenue:
                    Number(item.revenue || 0),

                cogs:
                    Number(item.cogs || 0),

                grossProfit:
                    Number(item.grossProfit || 0),

                margin:
                    Number(item.margin || 0),

            }));

    }, [productProfitability]);

    const salesData = useMemo(() => {

        if (
            Array.isArray(data.salesTrend) &&
            data.salesTrend.length
        ) {

            return data.salesTrend.map(
                (item, index) => ({
                    name:
                        item.name ||
                        item.date ||
                        item.day ||
                        `D${index + 1}`,

                    revenue:
                        Number(
                            item.revenue ??
                            item.sales ??
                            item.amount ??
                            0
                        ),

                    orders:
                        Number(
                            item.orders ??
                            item.count ??
                            0
                        ),
                })
            );

        }

        return [];

    }, [data.salesTrend]);


    const customerData = useMemo(() => {

        if (
            Array.isArray(data.customerTrend) &&
            data.customerTrend.length
        ) {

            return data.customerTrend.map(
                (item, index) => ({
                    name:
                        item.name ||
                        item.date ||
                        item.day ||
                        `D${index + 1}`,

                    visitors:
                        Number(
                            item.visitors ??
                            item.views ??
                            0
                        ),

                    customers:
                        Number(
                            item.customers ??
                            item.count ??
                            0
                        ),
                })
            );

        }

        return [
            { name: "Mon", visitors: 0, customers: 0 },
            { name: "Tue", visitors: 0, customers: 0 },
            { name: "Wed", visitors: 0, customers: 0 },
            { name: "Thu", visitors: 0, customers: 0 },
            { name: "Fri", visitors: 0, customers: 0 },
            { name: "Sat", visitors: 0, customers: 0 },
            { name: "Sun", visitors: 0, customers: 0 },
        ];

    }, [data.customerTrend]);


    const productData = useMemo(() => {

        if (
            Array.isArray(data.productPerformance) &&
            data.productPerformance.length
        ) {

            return data.productPerformance
                .slice(0, 8)
                .map((item, index) => ({
                    name:
                        item.name ||
                        item.productName ||
                        `Product ${index + 1}`,

                    revenue:
                        Number(
                            item.revenue ??
                            item.sales ??
                            item.total ??
                            0
                        ),

                    units:
                        Number(
                            item.units ??
                            item.quantity ??
                            item.sold ??
                            0
                        ),
                }));

        }

        return [];

    }, [data.productPerformance]);


    const paymentData = useMemo(() => {

        if (
            Array.isArray(data.paymentMethods) &&
            data.paymentMethods.length
        ) {

            return data.paymentMethods.map(
                (item, index) => ({
                    name:
                        item.name ||
                        item.method ||
                        `Method ${index + 1}`,

                    value:
                        Number(
                            item.value ??
                            item.amount ??
                            item.total ??
                            0
                        ),
                })
            );

        }

        return [
            {
                name: "Paid",
                value: Number(data.revenue || 0),
            },
            {
                name: "Pending",
                value: 0,
            },
        ];

    }, [data.paymentMethods, data.revenue]);


    const live =
        Number(data.activeCustomers || 0) > 0;


    // ========================================================
    // LOADING
    // ========================================================

    if (loading) {

        return (
            <div className="admin-reports-loading">

                <div className="reports-loading-orbit">
                    <span />
                </div>

                <div className="reports-loading-copy">

                    <strong>
                        TILE REVIVE
                    </strong>

                    <span>
                        Loading business intelligence
                    </span>

                </div>

            </div>
        );

    }


    // ========================================================
    // RENDER
    // ========================================================

    return (
        <main className="admin-reports">


            {/* ==================================================
                TOP BAR
               ================================================== */}

            <header className="reports-topbar">

                <div className="reports-brand">

                    <div className="reports-brand-mark">
                        TR
                    </div>

                    <div>

                        <span>
                            TILE REVIVE
                        </span>

                        <small>
                            BUSINESS INTELLIGENCE
                        </small>

                    </div>

                </div>


                <div className="reports-topbar-actions">

                    <div
                        className={`reports-live-status ${
                            live
                                ? "live"
                                : "warning"
                        }`}
                    >

                        <span className="reports-live-dot" />

                        {live
                            ? `${number(data.activeCustomers)} ACTIVE`
                            : "NO ACTIVE CUSTOMERS"}

                    </div>


                    <button
                        className="reports-refresh-button"
                        onClick={loadReports}
                        disabled={refreshing}
                    >

                        <span
                            className={
                                refreshing
                                    ? "refresh-icon spinning"
                                    : "refresh-icon"
                            }
                        >
                            ↻
                        </span>

                        Refresh

                    </button>


                    <button
                        className="reports-back-button"
                        onClick={() =>
                            navigate(
                                "/admin/dashboard"
                            )
                        }
                    >
                        ← Back
                    </button>

                </div>

            </header>


            {/* ==================================================
                HERO
               ================================================== */}

            <section className="reports-hero">

                <div className="reports-hero-copy">

                    <div className="reports-kicker">

                        <span />

                        ADMIN / REPORTS

                    </div>

                    <h1>
                        REPORTS
                        <span>/</span>
                        INTELLIGENCE
                    </h1>

                    <p>
                        A real-time business intelligence
                        command center for Tile Revive.
                        Monitor sales, customers, products,
                        marketing performance and financial
                        health from one place.
                    </p>

                </div>


                <div className="reports-hero-meta">

                    <div className="hero-meta-line" />

                    <span>
                        ACTIVE VIEW
                    </span>

                    <strong>
                        {currentSection.number}
                    </strong>

                    <small>
                        {currentSection.label}
                    </small>

                </div>

            </section>


            {/* ==================================================
                ERROR
               ================================================== */}

            {error && (

                <div className="reports-error">

                    <div className="reports-error-icon">
                        !
                    </div>

                    <div className="reports-error-copy">

                        <strong>
                            Report data unavailable
                        </strong>

                        <span>
                            {error}
                        </span>

                    </div>

                    <button
                        onClick={loadReports}
                    >
                        Retry
                    </button>

                </div>

            )}


            {/* ==================================================
                REPORT NAVIGATION
               ================================================== */}

            <section className="reports-navigation">

                <div className="reports-nav-header">

                    <div>

                        <span>
                            ANALYTICS
                        </span>

                        <strong>
                            Report centre
                        </strong>

                    </div>


                    <div className="period-selector">

                        {[
                            "1D",
                            "7D",
                            "30D",
                            "90D",
                            "1Y",
                        ].map((item) => (

                            <button
                                key={item}
                                className={
                                    period === item
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setPeriod(item)
                                }
                            >
                                {item}
                            </button>

                        ))}

                    </div>

                </div>


                <div className="reports-dropdown">

                    <button
                        className="reports-dropdown-trigger"
                        onClick={() =>
                            setMenuOpen(
                                !menuOpen
                            )
                        }
                    >

                        <div>

                            <span>
                                CURRENT REPORT
                            </span>

                            <strong>
                                {currentSection.label}
                            </strong>

                        </div>

                        <span
                            className={
                                menuOpen
                                    ? "dropdown-arrow open"
                                    : "dropdown-arrow"
                            }
                        >
                            ↓
                        </span>

                    </button>


                    {menuOpen && (

                        <div className="reports-dropdown-menu">

                            {reportSections.map(
                                (section) => (

                                    <button
                                        key={section.id}
                                        className={
                                            activeSection ===
                                            section.id
                                                ? "selected"
                                                : ""
                                        }
                                        onClick={() => {

                                            setActiveSection(
                                                section.id
                                            );

                                            setMenuOpen(
                                                false
                                            );

                                        }}
                                    >

                                        <span>
                                            {section.number}
                                        </span>

                                        <div>

                                            <strong>
                                                {section.label}
                                            </strong>

                                            <small>
                                                {
                                                    section.description
                                                }
                                            </small>

                                        </div>

                                        {activeSection ===
                                            section.id && (
                                            <b>✓</b>
                                        )}

                                    </button>

                                )
                            )}

                        </div>

                    )}

                </div>

            </section>


            {/* ==================================================
                OVERVIEW
               ================================================== */}

            {activeSection === "overview" && (

                <>

                    <section className="reports-live-panel">

                        <div className="live-panel-heading">

                            <div>

                                <span className="section-index">
                                    LIVE / 00
                                </span>

                                <h2>
                                    Live business pulse
                                </h2>

                                <p>
                                    Current activity across
                                    your store.
                                </p>

                            </div>

                            <div
                                className={
                                    live
                                        ? "live-indicator active"
                                        : "live-indicator inactive"
                                }
                            >

                                <span className="live-indicator-dot" />

                                <div>

                                    <strong>
                                        {live
                                            ? "Customers active"
                                            : "No active customers"}
                                    </strong>

                                    <small>
                                        Real-time monitoring
                                    </small>

                                </div>

                            </div>

                        </div>


                        <div className="live-metrics">

                            <div className="live-metric primary">

                                <span>
                                    ACTIVE CUSTOMERS
                                </span>

                                <strong>
                                    {number(
                                        data.activeCustomers
                                    )}
                                </strong>

                                <small>
                                    Currently active
                                </small>

                            </div>


                            <div className="live-metric">

                                <span>
                                    VISITORS
                                </span>

                                <strong>
                                    {number(
                                        data.visitors
                                    )}
                                </strong>

                                <small>
                                    Tracked visitors
                                </small>

                            </div>


                            <div className="live-metric">

                                <span>
                                    CONVERSION
                                </span>

                                <strong>
                                    {percent(
                                        data.conversion
                                    )}
                                </strong>

                                <small>
                                    Visitor to customer
                                </small>

                            </div>


                            <div className="live-visual">

                                <div className="live-wave">

                                    {Array.from(
                                        { length: 16 }
                                    ).map(
                                        (_, index) => (
                                            <span
                                                key={index}
                                            />
                                        )
                                    )}

                                </div>

                                <small>
                                    LIVE ACTIVITY SIGNAL
                                </small>

                            </div>

                        </div>

                    </section>


                    <section className="reports-section">

                        <div className="section-heading">

                            <div>

                                <span className="section-index">
                                    01 / SALES
                                </span>

                                <h2>
                                    Sales performance
                                </h2>

                                <p>
                                    Revenue and order
                                    activity over time.
                                </p>

                            </div>

                            <span className="section-heading-note">
                                {period} PERIOD
                            </span>

                        </div>


                        <div className="chart-card chart-large">

                            <div className="chart-card-header">

                                <div>

                                    <span>
                                        REVENUE
                                    </span>

                                    <strong>
                                        {currency(
                                            data.revenue
                                        )}
                                    </strong>

                                </div>

                                <span className="chart-live-label">
                                    ● LIVE
                                </span>

                            </div>

                            <div className="chart-area">

                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >

                                    <AreaChart
                                        data={salesData}
                                    >

                                        <defs>

                                            <linearGradient
                                                id="revenueGradient"
                                                x1="0"
                                                y1="0"
                                                x2="0"
                                                y2="1"
                                            >

                                                <stop
                                                    offset="0%"
                                                    stopColor="#32e875"
                                                    stopOpacity=".35"
                                                />

                                                <stop
                                                    offset="100%"
                                                    stopColor="#32e875"
                                                    stopOpacity="0"
                                                />

                                            </linearGradient>

                                        </defs>

                                        <CartesianGrid
                                            stroke="rgba(255,255,255,.06)"
                                            vertical={false}
                                        />

                                        <XAxis
                                            dataKey="name"
                                            stroke="#555"
                                            tick={{
                                                fill: "#666",
                                                fontSize: 10,
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <YAxis
                                            stroke="#555"
                                            tick={{
                                                fill: "#666",
                                                fontSize: 10,
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <Tooltip
                                            content={
                                                <ChartTooltip />
                                            }
                                        />

                                        <Area
                                            type="monotone"
                                            dataKey="revenue"
                                            name="Revenue"
                                            stroke="#32e875"
                                            strokeWidth={2}
                                            fill="url(#revenueGradient)"
                                        />

                                    </AreaChart>

                                </ResponsiveContainer>

                            </div>

                        </div>


                        <div className="financial-grid">

                            <MetricCard
                                label="TOTAL REVENUE"
                                value={currency(
                                    data.revenue
                                )}
                                symbol="↗"
                            />

                            <MetricCard
                                label="ORDERS"
                                value={number(
                                    data.orders
                                )}
                                symbol="◈"
                            />

                            <MetricCard
                                label="CUSTOMERS"
                                value={number(
                                    data.customersCount
                                )}
                                symbol="◎"
                            />

                            <MetricCard
                                label="NET PROFIT"
                                value={currency(
                                    data.profit
                                )}
                                symbol="✦"
                                positive
                            />

                        </div>

                    </section>

                </>

            )}


            {/* ==================================================
                SALES
               ================================================== */}

            {activeSection === "sales" && (

                <section className="reports-section">

                    <AnalyticsHeading
                        index="01"
                        title="Sales Analytics"
                        description="Understand how revenue and orders are moving."
                        period={period}
                    />

                    <div className="analytics-kpis">

                        <MetricCard
                            label="REVENUE"
                            value={currency(data.revenue)}
                            symbol="↗"
                            positive
                        />

                        <MetricCard
                            label="ORDERS"
                            value={number(data.orders)}
                            symbol="◈"
                        />

                        <MetricCard
                            label="AVG ORDER VALUE"
                            value={currency(
                                data.orders
                                    ? data.revenue /
                                      data.orders
                                    : 0
                            )}
                            symbol="◆"
                        />

                        <MetricCard
                            label="CONVERSION"
                            value={percent(data.conversion)}
                            symbol="%"
                        />

                    </div>


                    <div className="chart-grid">

                        <ChartPanel
                            title="Revenue trend"
                            subtitle="Sales movement"
                            large
                        >

                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >

                                <LineChart
                                    data={salesData}
                                >

                                    <CartesianGrid
                                        stroke="rgba(255,255,255,.06)"
                                        vertical={false}
                                    />

                                    <XAxis
                                        dataKey="name"
                                        stroke="#555"
                                        tick={{
                                            fill: "#666",
                                            fontSize: 10,
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        stroke="#555"
                                        tick={{
                                            fill: "#666",
                                            fontSize: 10,
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <Tooltip
                                        content={
                                            <ChartTooltip />
                                        }
                                    />

                                    <Line
                                        type="monotone"
                                        dataKey="revenue"
                                        name="Revenue"
                                        stroke="#fff"
                                        strokeWidth={3}
                                        dot={false}
                                    />

                                </LineChart>

                            </ResponsiveContainer>

                        </ChartPanel>


                        <ChartPanel
                            title="Orders"
                            subtitle="Order volume"
                        >

                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >

                                <BarChart
                                    data={salesData}
                                >

                                    <CartesianGrid
                                        stroke="rgba(255,255,255,.06)"
                                        vertical={false}
                                    />

                                    <XAxis
                                        dataKey="name"
                                        stroke="#555"
                                        tick={{
                                            fill: "#666",
                                            fontSize: 10,
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        stroke="#555"
                                        tick={{
                                            fill: "#666",
                                            fontSize: 10,
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <Tooltip
                                        content={
                                            <ChartTooltip />
                                        }
                                    />

                                    <Bar
                                        dataKey="orders"
                                        name="Orders"
                                        fill="#32e875"
                                        radius={[
                                            3,
                                            3,
                                            0,
                                            0,
                                        ]}
                                    />

                                </BarChart>

                            </ResponsiveContainer>

                        </ChartPanel>

                    </div>

                </section>

            )}


            {/* ==================================================
                CUSTOMERS
               ================================================== */}

            {activeSection === "customers" && (

                <section className="reports-section">

                    <AnalyticsHeading
                        index="02"
                        title="Customer Analytics"
                        description="Understand visitors, customers and conversion."
                        period={period}
                    />

                    <div className="analytics-kpis">

                        <MetricCard
                            label="VISITORS"
                            value={number(data.visitors)}
                            symbol="◎"
                        />

                        <MetricCard
                            label="CUSTOMERS"
                            value={number(data.customersCount)}
                            symbol="◉"
                            positive
                        />

                        <MetricCard
                            label="ACTIVE NOW"
                            value={number(data.activeCustomers)}
                            symbol="●"
                            positive
                        />

                        <MetricCard
                            label="CONVERSION"
                            value={percent(data.conversion)}
                            symbol="%"
                        />

                    </div>


                    <div className="chart-grid">

                        <ChartPanel
                            title="Customer journey"
                            subtitle="Visitors vs customers"
                            large
                        >

                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >

                                <AreaChart
                                    data={customerData}
                                >

                                    <CartesianGrid
                                        stroke="rgba(255,255,255,.06)"
                                        vertical={false}
                                    />

                                    <XAxis
                                        dataKey="name"
                                        stroke="#555"
                                        tick={{
                                            fill: "#666",
                                            fontSize: 10,
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        stroke="#555"
                                        tick={{
                                            fill: "#666",
                                            fontSize: 10,
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <Tooltip
                                        content={
                                            <ChartTooltip />
                                        }
                                    />

                                    <Area
                                        type="monotone"
                                        dataKey="visitors"
                                        name="Visitors"
                                        stroke="#777"
                                        fill="rgba(255,255,255,.05)"
                                    />

                                    <Area
                                        type="monotone"
                                        dataKey="customers"
                                        name="Customers"
                                        stroke="#32e875"
                                        fill="rgba(50,232,117,.10)"
                                    />

                                </AreaChart>

                            </ResponsiveContainer>

                        </ChartPanel>


                        <div className="journey-card">

                            <span>
                                CUSTOMER JOURNEY
                            </span>

                            <strong>
                                {number(data.visitors)}
                            </strong>

                            <small>
                                Total tracked visitors
                            </small>

                            <div className="journey-progress">

                                <div
                                    style={{
                                        width: `${Math.min(
                                            Number(
                                                data.conversion
                                            ) || 0,
                                            100
                                        )}%`,
                                    }}
                                />

                            </div>

                            <div className="journey-stat">

                                <span>
                                    CONVERSION RATE
                                </span>

                                <b>
                                    {percent(
                                        data.conversion
                                    )}
                                </b>

                            </div>

                        </div>

                    </div>

                </section>

            )}


            {/* ==================================================
                PRODUCTS
               ================================================== */}

            {activeSection === "products" && (

                <section className="reports-section">

                    <AnalyticsHeading
                        index="03"
                        title="Product Analytics"
                        description="See which products drive the business."
                        period={period}
                    />


                    <div className="chart-grid">

                        <ChartPanel
                            title="Product performance"
                            subtitle="Revenue by product"
                            large
                        >

                            {productData.length ? (

                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >

                                    <BarChart
                                        data={productData}
                                        layout="vertical"
                                    >

                                        <CartesianGrid
                                            stroke="rgba(255,255,255,.06)"
                                            horizontal={false}
                                        />

                                        <XAxis
                                            type="number"
                                            stroke="#555"
                                            tick={{
                                                fill: "#666",
                                                fontSize: 10,
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <YAxis
                                            dataKey="name"
                                            type="category"
                                            width={120}
                                            stroke="#555"
                                            tick={{
                                                fill: "#999",
                                                fontSize: 10,
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <Tooltip
                                            content={
                                                <ChartTooltip />
                                            }
                                        />

                                        <Bar
                                            dataKey="revenue"
                                            name="Revenue"
                                            fill="#32e875"
                                            radius={[
                                                0,
                                                4,
                                                4,
                                                0,
                                            ]}
                                        />

                                    </BarChart>

                                </ResponsiveContainer>

                            ) : (

                                <EmptyChart
                                    message="Product performance data will appear here."
                                />

                            )}

                        </ChartPanel>


                        <ChartPanel
                            title="Units sold"
                            subtitle="Product volume"
                        >

                            {productData.length ? (

                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >

                                    <BarChart
                                        data={productData}
                                    >

                                        <CartesianGrid
                                            stroke="rgba(255,255,255,.06)"
                                            vertical={false}
                                        />

                                        <XAxis
                                            dataKey="name"
                                            stroke="#555"
                                            tick={{
                                                fill: "#666",
                                                fontSize: 9,
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <YAxis
                                            stroke="#555"
                                            tick={{
                                                fill: "#666",
                                                fontSize: 10,
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <Tooltip
                                            content={
                                                <ChartTooltip />
                                            }
                                        />

                                        <Bar
                                            dataKey="units"
                                            name="Units"
                                            fill="#fff"
                                            radius={[
                                                3,
                                                3,
                                                0,
                                                0,
                                            ]}
                                        />

                                    </BarChart>

                                </ResponsiveContainer>

                            ) : (

                                <EmptyChart
                                    message="No product sales data yet."
                                />

                            )}

                        </ChartPanel>

                    </div>

                </section>

            )}


            {/* ==================================================
                MARKETING
               ================================================== */}

            {activeSection === "marketing" && (

                <section className="reports-section">

                    <AnalyticsHeading
                        index="04"
                        title="Marketing Analytics"
                        description="Measure traffic, campaigns and acquisition."
                        period={period}
                    />


                    <div className="ads-panel">

                        <div className="ads-panel-brand">

                            <div className="meta-mark">
                                M
                            </div>

                            <div>

                                <strong>
                                    Meta Ads Intelligence
                                </strong>

                                <span>
                                    Ready for campaign
                                    integration
                                </span>

                            </div>

                        </div>


                        <div className="ads-coming">

                            <div className="ads-lock">
                                ◇
                            </div>

                            <div>

                                <strong>
                                    Marketing data layer
                                </strong>

                                <small>
                                    Connect Meta Ads when
                                    campaigns begin running.
                                    The reporting architecture
                                    is ready for spend, CTR,
                                    CPC, conversions and ROAS.
                                </small>

                            </div>

                        </div>

                    </div>


                    <div className="analytics-kpis">

                        <MetricCard
                            label="VISITORS"
                            value={number(data.visitors)}
                            symbol="◎"
                        />

                        <MetricCard
                            label="CONVERSION"
                            value={percent(data.conversion)}
                            symbol="%"
                        />

                        <MetricCard
                            label="CAMPAIGN SPEND"
                            value="KES 0"
                            symbol="↗"
                        />

                        <MetricCard
                            label="ROAS"
                            value="—"
                            symbol="◆"
                        />

                    </div>


                    <ChartPanel
                        title="Traffic sources"
                        subtitle="Where visitors come from"
                    >

                        {data.trafficSources.length ? (

                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >

                                <PieChart>

                                    <Pie
                                        data={
                                            data.trafficSources
                                        }
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={100}
                                        paddingAngle={3}
                                    >

                                        {data.trafficSources.map(
                                            (_, index) => (
                                                <Cell
                                                    key={index}
                                                    fill={
                                                        index %
                                                            2 ===
                                                        0
                                                            ? "#32e875"
                                                            : "#777"
                                                    }
                                                />
                                            )
                                        )}

                                    </Pie>

                                    <Tooltip
                                        content={
                                            <ChartTooltip />
                                        }
                                    />

                                </PieChart>

                            </ResponsiveContainer>

                        ) : (

                            <EmptyChart
                                message="Traffic source data will appear once tracking is connected."
                            />

                        )}

                    </ChartPanel>

                </section>

            )}


            {/* ==================================================
                FINANCIAL
               ================================================== */}

            {activeSection === "financial" && (

                <section className="reports-section">

                    <AnalyticsHeading
                        index="05"
                        title="Financial Analytics"
                        description="Revenue, COGS, expenses, profit and cash flow from the central financial engine."
                        period={period}
                    />



                    {/* ==================================================
                        FINANCIAL KPIs
                       ================================================== */}

                    <div className="financial-grid">

                        <MetricCard
                            label="REVENUE"
                            value={currency(
                                financial?.revenue
                            )}
                            symbol="↗"
                            positive
                        />

                        <MetricCard
                            label="COGS"
                            value={currency(
                                financial?.cogs
                            )}
                            symbol="◌"
                        />

                        <MetricCard
                            label="GROSS PROFIT"
                            value={currency(
                                financial?.grossProfit
                            )}
                            symbol="◆"
                            positive
                        />

                        <MetricCard
                            label="EXPENSES"
                            value={currency(
                                financial?.totalExpenses
                            )}
                            symbol="↘"
                        />

                        <MetricCard
                            label="NET PROFIT"
                            value={currency(
                                financial?.netProfit
                            )}
                            symbol="✦"
                            positive
                        />

                        <MetricCard
                            label="PROFIT MARGIN"
                            value={percent(
                                financial?.profitMargin
                            )}
                            symbol="%"
                            positive
                        />

                    </div>


                    {/* ==================================================
                        PROFIT & LOSS
                       ================================================== */}

                    <div className="chart-grid">

                        <ChartPanel
                            title="Profit & Loss trend"
                            subtitle="Revenue, COGS, gross profit, expenses and net profit"
                            large
                        >

                            {financialTrendData.length ? (

                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >

                                    <LineChart
                                        data={financialTrendData}
                                    >

                                        <CartesianGrid
                                            stroke="rgba(255,255,255,.06)"
                                            vertical={false}
                                        />

                                        <XAxis
                                            dataKey="name"
                                            stroke="#555"
                                            tick={{
                                                fill: "#666",
                                                fontSize: 10,
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <YAxis
                                            stroke="#555"
                                            tick={{
                                                fill: "#666",
                                                fontSize: 10,
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <Tooltip
                                            content={
                                                <ChartTooltip />
                                            }
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="revenue"
                                            name="Revenue"
                                            stroke="#32e875"
                                            strokeWidth={2.5}
                                            dot={false}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="cogs"
                                            name="COGS"
                                            stroke="#777"
                                            strokeWidth={2}
                                            dot={false}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="grossProfit"
                                            name="Gross Profit"
                                            stroke="#fff"
                                            strokeWidth={2}
                                            dot={false}
                                        />

                                        <Line
                                            type="monotone"
                                            dataKey="netProfit"
                                            name="Net Profit"
                                            stroke="#aaa"
                                            strokeWidth={2}
                                            dot={false}
                                        />

                                    </LineChart>

                                </ResponsiveContainer>

                            ) : (

                                <EmptyChart
                                    message="No financial activity for this period."
                                />

                            )}

                        </ChartPanel>


                        {/* ==================================================
                            EXPENSE BREAKDOWN
                           ================================================== */}

                        <ChartPanel
                            title="Expense structure"
                            subtitle="Where paid expenses are going"
                        >

                            {expenseBreakdownData.length ? (

                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >

                                    <PieChart>

                                        <Pie
                                            data={
                                                expenseBreakdownData
                                            }
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={95}
                                            paddingAngle={3}
                                        >

                                            {expenseBreakdownData.map(
                                                (_, index) => (

                                                    <Cell
                                                        key={index}
                                                        fill={
                                                            index === 0
                                                                ? "#32e875"
                                                                : "#555"
                                                        }
                                                    />

                                                )
                                            )}

                                        </Pie>

                                        <Tooltip
                                            content={
                                                <ChartTooltip />
                                            }
                                        />

                                    </PieChart>

                                </ResponsiveContainer>

                            ) : (

                                <EmptyChart
                                    message="No paid expenses recorded for this period."
                                />

                            )}

                        </ChartPanel>

                    </div>


                    {/* ==================================================
                        PRODUCT PROFITABILITY + CASH FLOW
                       ================================================== */}

                    <div className="chart-grid">

                        <ChartPanel
                            title="Product profitability"
                            subtitle="Top products ranked by gross profit"
                            large
                        >

                            {profitabilityData.length ? (

                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >

                                    <BarChart
                                        data={
                                            profitabilityData
                                        }
                                        layout="vertical"
                                    >

                                        <CartesianGrid
                                            stroke="rgba(255,255,255,.06)"
                                            horizontal={false}
                                        />

                                        <XAxis
                                            type="number"
                                            stroke="#555"
                                            tick={{
                                                fill: "#666",
                                                fontSize: 10,
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            width={120}
                                            stroke="#555"
                                            tick={{
                                                fill: "#999",
                                                fontSize: 10,
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <Tooltip
                                            content={
                                                <ChartTooltip />
                                            }
                                        />

                                        <Bar
                                            dataKey="grossProfit"
                                            name="Gross Profit"
                                            fill="#32e875"
                                            radius={[
                                                0,
                                                4,
                                                4,
                                                0,
                                            ]}
                                        />

                                    </BarChart>

                                </ResponsiveContainer>

                            ) : (

                                <EmptyChart
                                    message="Product profitability will appear after successful sales."
                                />

                            )}

                        </ChartPanel>


                        <ChartPanel
                            title="Cash flow"
                            subtitle="Revenue received vs paid expenses"
                        >

                            {financialTrendData.length ? (

                                <ResponsiveContainer
                                    width="100%"
                                    height="100%"
                                >

                                    <BarChart
                                        data={
                                            financialTrendData
                                        }
                                    >

                                        <CartesianGrid
                                            stroke="rgba(255,255,255,.06)"
                                            vertical={false}
                                        />

                                        <XAxis
                                            dataKey="name"
                                            stroke="#555"
                                            tick={{
                                                fill: "#666",
                                                fontSize: 10,
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <YAxis
                                            stroke="#555"
                                            tick={{
                                                fill: "#666",
                                                fontSize: 10,
                                            }}
                                            axisLine={false}
                                            tickLine={false}
                                        />

                                        <Tooltip
                                            content={
                                                <ChartTooltip />
                                            }
                                        />

                                        <Bar
                                            dataKey="cashIn"
                                            name="Cash In"
                                            fill="#32e875"
                                            radius={[
                                                3,
                                                3,
                                                0,
                                                0,
                                            ]}
                                        />

                                        <Bar
                                            dataKey="cashOut"
                                            name="Cash Out"
                                            fill="#777"
                                            radius={[
                                                3,
                                                3,
                                                0,
                                                0,
                                            ]}
                                        />

                                    </BarChart>

                                </ResponsiveContainer>

                            ) : (

                                <EmptyChart
                                    message="Cash-flow activity will appear for this period."
                                />

                            )}

                        </ChartPanel>

                    </div>


                    {/* ==================================================
                        CASH SUMMARY
                       ================================================== */}

                    <div className="financial-grid">

                        <MetricCard
                            label="CASH IN"
                            value={currency(
                                cashFlow?.cashIn ??
                                financial?.cashIn
                            )}
                            symbol="↑"
                            positive
                        />

                        <MetricCard
                            label="CASH OUT"
                            value={currency(
                                cashFlow?.cashOut ??
                                financial?.cashOut
                            )}
                            symbol="↓"
                        />

                        <MetricCard
                            label="NET CASH FLOW"
                            value={currency(
                                cashFlow?.cashFlow ??
                                financial?.cashFlow
                            )}
                            symbol="≈"
                            positive
                        />

                        <MetricCard
                            label="UNITS SOLD"
                            value={number(
                                financial?.unitsSold
                            )}
                            symbol="◈"
                        />

                    </div>

                </section>

            )}
            {/* ==================================================
                GEOGRAPHIC
               ================================================== */}

            {activeSection === "geographic" && (

                <section className="reports-section">

                    <AnalyticsHeading
                        index="06"
                        title="Geographic Analytics"
                        description="Understand where Tile Revive customers are buying."
                        period={period}
                    />

                    <GeographicAnalytics
                        geographicAnalytics={
                            data.geographicAnalytics
                        }
                    />

                </section>

            )}
            {/* ==================================================
                FOOTER
               ================================================== */}

            <footer className="reports-footer">

                <div>
                    TILE REVIVE
                    <span>
                        {" "} / REPORTS
                    </span>
                </div>

                <small>
                    {currentSection.label.toUpperCase()}
                    {" · "}
                    {period}
                    {" · "}
                    LIVE BUSINESS INTELLIGENCE
                </small>

            </footer>

        </main>
    );
}


// ============================================================
// COMPONENTS
// ============================================================

function MetricCard({
    label,
    value,
    symbol,
    positive = false,
}) {

    return (
        <div
            className={
                positive
                    ? "financial-card profit-card"
                    : "financial-card"
            }
        >

            <div className="financial-card-top">

                <span>
                    {label}
                </span>

                <i>
                    {symbol}
                </i>

            </div>

            <strong>
                {value}
            </strong>

            <div className="financial-card-bottom">
                CURRENT PERIOD
            </div>

        </div>
    );
}


function AnalyticsHeading({
    index,
    title,
    description,
    period,
}) {

    return (
        <div className="section-heading">

            <div>

                <span className="section-index">
                    {index} / ANALYTICS
                </span>

                <h2>
                    {title}
                </h2>

                <p>
                    {description}
                </p>

            </div>

            <span className="section-heading-note">
                {period} PERIOD
            </span>

        </div>
    );
}


function ChartPanel({
    title,
    subtitle,
    children,
    large = false,
}) {

    return (
        <div
            className={
                large
                    ? "chart-card chart-large"
                    : "chart-card"
            }
        >

            <div className="chart-card-header">

                <div>

                    <span>
                        {title.toUpperCase()}
                    </span>

                    <small>
                        {subtitle}
                    </small>

                </div>

            </div>

            <div className="chart-area">

                {children}

            </div>

        </div>
    );
}


function EmptyChart({ message }) {

    return (
        <div className="empty-chart">

            <div className="empty-chart-icon">
                ∿
            </div>

            <strong>
                Awaiting data
            </strong>

            <span>
                {message}
            </span>

        </div>
    );
}


export default AdminReports;



