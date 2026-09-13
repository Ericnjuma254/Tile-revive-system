import { useCallback, useEffect, useMemo, useState } from "react";

import {
    getAdminCustomers,
    getAdminCustomer360,
    createCustomer,
} from "../../services/api";

import "./AdminCustomers.css";


function formatCurrency(value) {
    return `KSh ${Number(value || 0).toLocaleString("en-KE", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    })}`;
}


function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}


function formatDateTime(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleString("en-KE", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}


function getInitials(name) {
    if (!name) return "?";

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}


function getCustomerSegment(customer) {
    const orders = Number(customer?.totalOrders || 0);
    const spent = Number(customer?.totalSpent || 0);

    const lastOrderDate =
        customer?.lastOrder?.createdAt
            ? new Date(customer.lastOrder.createdAt)
            : null;

    const daysSinceLastOrder = lastOrderDate
        ? Math.floor(
            (Date.now() - lastOrderDate.getTime()) /
            (1000 * 60 * 60 * 24)
        )
        : null;

    // VIP: high lifetime value
    if (spent >= 100000) {
        return "VIP";
    }

    // INACTIVE: previously purchased but has been away for 90+ days
    if (
        orders > 0 &&
        daysSinceLastOrder !== null &&
        daysSinceLastOrder >= 90
    ) {
        return "INACTIVE";
    }

    // AT RISK: previously purchased but has been away for 45–89 days
    if (
        orders > 0 &&
        daysSinceLastOrder !== null &&
        daysSinceLastOrder >= 45
    ) {
        return "AT RISK";
    }

    // RETURNING: two or more purchases
    if (orders >= 2) {
        return "RETURNING";
    }

    // ACTIVE: recent customer with at least one purchase
    if (
        orders > 0 &&
        daysSinceLastOrder !== null &&
        daysSinceLastOrder < 45
    ) {
        return "ACTIVE";
    }

    // NEW: no orders or very recently created customer
    return "NEW";
}
function statusClass(status) {
    return String(status || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
}


export default function AdminCustomers() {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [customer360, setCustomer360] = useState(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [spendingFilter, setSpendingFilter] = useState("ALL");

    const [loading, setLoading] = useState(true);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [error, setError] = useState("");
    const [detailsError, setDetailsError] = useState("");

    const [emailComposerOpen, setEmailComposerOpen] =
        useState(false);

    const [emailSubject, setEmailSubject] =
        useState("");

    const [emailMessage, setEmailMessage] =
        useState("");

    // ======================================================
    // ADD CUSTOMER
    // ======================================================

    const [addCustomerOpen, setAddCustomerOpen] =
        useState(false);

    const [creatingCustomer, setCreatingCustomer] =
        useState(false);

    const [newCustomer, setNewCustomer] = useState({
        fullName: "",
        phoneNumber: "",
        email: "",
        county: "",
        location: "",
    });

    const [addCustomerError, setAddCustomerError] =
        useState("");


    const loadCustomers = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const response = await getAdminCustomers();

            if (!response?.success) {
                throw new Error(
                    response?.message ||
                    "Failed to load customers."
                );
            }

            setCustomers(
                Array.isArray(response.customers)
                    ? response.customers
                    : []
            );
        } catch (err) {
            console.error(
                "CUSTOMER DIRECTORY ERROR:",
                err
            );

            setError(
                err?.message ||
                "Unable to load customer data."
            );
        } finally {
            setLoading(false);
        }
    }, []);


    const openCustomer = useCallback(async (customer) => {
        try {
            setSelectedCustomer(customer);
            setCustomer360(null);
            setDetailsError("");
            setDetailsLoading(true);

            const response =
                await getAdminCustomer360(customer.id);

            if (!response?.success) {
                throw new Error(
                    response?.message ||
                    "Failed to load customer profile."
                );
            }

            setCustomer360(response);
        } catch (err) {
            console.error(
                "CUSTOMER 360 ERROR:",
                err
            );

            setDetailsError(
                err?.message ||
                "Unable to load customer 360."
            );
        } finally {
            setDetailsLoading(false);
        }
    }, []);


    const openEmailComposer = useCallback(() => {
        const email =
            customer360?.customer?.email ||
            selectedCustomer?.email ||
            "";

        if (!email) {
            return;
        }

        setEmailSubject(
            "Tile Revive Solutions — Customer Follow-up"
        );

        setEmailMessage(
            `Hello ${selectedCustomer?.fullName || "Customer"},


Thank you for choosing Tile Revive Solutions.


We are reaching out regarding your recent purchase.


Kind regards,
Tile Revive Solutions
0758804676`
        );

        setEmailComposerOpen(true);
    }, [customer360, selectedCustomer]);


    const emailRecipient =
        customer360?.customer?.email ||
        selectedCustomer?.email ||
        "";


    const emailMailto =
        `mailto:${emailRecipient}?subject=${encodeURIComponent(
            emailSubject
        )}&body=${encodeURIComponent(
            emailMessage
        )}`;

    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

    // ======================================================
    // CREATE CUSTOMER
    // ======================================================

    const handleCreateCustomer = async (event) => {
        event.preventDefault();

        if (!newCustomer.fullName.trim()) {
            setAddCustomerError(
                "Full name is required."
            );
            return;
        }

        if (!newCustomer.phoneNumber.trim()) {
            setAddCustomerError(
                "Phone number is required."
            );
            return;
        }

        try {
            setCreatingCustomer(true);
            setAddCustomerError("");

            const response =
                await createCustomer(newCustomer);

            if (!response?.success) {
                throw new Error(
                    response?.message ||
                    "Failed to create customer."
                );
            }

            setNewCustomer({
                fullName: "",
                phoneNumber: "",
                email: "",
                county: "",
                location: "",
            });

            setAddCustomerOpen(false);

            await loadCustomers();

        } catch (err) {

            console.error(
                "CREATE CUSTOMER ERROR:",
                err
            );

            setAddCustomerError(
                err?.message ||
                "Unable to create customer."
            );

        } finally {
            setCreatingCustomer(false);
        }
    };


    const filteredCustomers = useMemo(() => {
        const normalizedSearch =
            search.trim().toLowerCase();

        return customers.filter((customer) => {
            const matchesSearch =
                !normalizedSearch ||
                String(customer.fullName || "")
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                String(customer.phoneNumber || "")
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                String(customer.email || "")
                    .toLowerCase()
                    .includes(normalizedSearch);

            if (!matchesSearch) {
                return false;
            }

            const spent =
                Number(customer.totalSpent || 0);

            const customerSegment =
                getCustomerSegment(customer);

            if (
                statusFilter !== "ALL" &&
                customerSegment !== statusFilter
            ) {
                return false;
            }

            if (
                spendingFilter === "LOW" &&
                spent >= 5000
            ) {
                return false;
            }

            if (
                spendingFilter === "MEDIUM" &&
                (spent < 5000 || spent >= 20000)
            ) {
                return false;
            }

            if (
                spendingFilter === "HIGH" &&
                spent < 20000
            ) {
                return false;
            }

            return true;
        });
    }, [
        customers,
        search,
        statusFilter,
        spendingFilter,
    ]);


    const overview = useMemo(() => {
        const totalCustomers =
            customers.length;

        const totalSpend =
            customers.reduce(
                (sum, customer) =>
                    sum +
                    Number(customer.totalSpent || 0),
                0
            );

        const segmentCounts = customers.reduce(
            (counts, customer) => {
                const segment =
                    getCustomerSegment(customer);

                counts[segment] =
                    (counts[segment] || 0) + 1;

                return counts;
            },
            {
                NEW: 0,
                ACTIVE: 0,
                RETURNING: 0,
                "AT RISK": 0,
                INACTIVE: 0,
                VIP: 0,
            }
        );

        return {
            totalCustomers,
            totalSpend,

            averageCustomerValue:
                totalCustomers > 0
                    ? totalSpend / totalCustomers
                    : 0,

            newCustomers:
                segmentCounts.NEW,

            activeCustomers:
                segmentCounts.ACTIVE,

            returningCustomers:
                segmentCounts.RETURNING,

            atRiskCustomers:
                segmentCounts["AT RISK"],

            inactiveCustomers:
                segmentCounts.INACTIVE,

            vipCustomers:
                segmentCounts.VIP,
        };
    }, [customers]);


    const customerHealth = useMemo(() => {
        const total = overview.totalCustomers;

        const segments = [
            {
                key: "ACTIVE",
                label: "Active",
                count: overview.activeCustomers,
                description: "Purchased within 45 days",
            },
            {
                key: "RETURNING",
                label: "Returning",
                count: overview.returningCustomers,
                description: "2+ purchases",
            },
            {
                key: "NEW",
                label: "New",
                count: overview.newCustomers,
                description: "New customer segment",
            },
            {
                key: "AT RISK",
                label: "At Risk",
                count: overview.atRiskCustomers,
                description: "45–89 days since purchase",
            },
            {
                key: "INACTIVE",
                label: "Inactive",
                count: overview.inactiveCustomers,
                description: "90+ days since purchase",
            },
            {
                key: "VIP",
                label: "VIP",
                count: overview.vipCustomers,
                description: "KSh 100K+ lifetime spend",
            },
        ];

        return segments.map((segment) => ({
            ...segment,
            percentage:
                total > 0
                    ? (segment.count / total) * 100
                    : 0,
        }));
    }, [overview]);


    return (
        <div className="admin-customers-page">

            {/* ==================================================
                HEADER
            ================================================== */}

            <header className="customers-header">

                <div>
                    <div className="customers-eyebrow">
                        TILE REVIVE CRM
                    </div>

                    <h1>
                        Customer 360
                    </h1>

                    <p>
                        One complete view of your customers,
                        spending, orders, payments and activity.
                    </p>
                </div>

                <div className="customers-header-actions">

                    <div className="customers-header-status">
                        <span className="status-dot" />
                        CUSTOMER INTELLIGENCE
                    </div>

                    <button
                        type="button"
                        className="customer-add-button"
                        onClick={() => {
                            setAddCustomerError("");
                            setAddCustomerOpen(true);
                        }}
                    >
                        <span>+</span>
                        Add Customer
                    </button>

                    <button
                        type="button"
                        className="customer-refresh-button"
                        onClick={loadCustomers}
                        disabled={loading}
                    >
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>

                </div>

            </header>


            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
                <div className="customer-error">
                    <strong>
                        Customer data unavailable
                    </strong>

                    <span>
                        {error}
                    </span>
                </div>
            )}


            {/* ==================================================
                KPI OVERVIEW
            ================================================== */}

            <section className="customer-kpi-grid">

                <div className="customer-kpi-card">
                    <span>Total Customers</span>

                    <strong>
                        {loading
                            ? "..."
                            : overview.totalCustomers.toLocaleString()}
                    </strong>

                    <small>
                        Registered customers
                    </small>
                </div>

                <div className="customer-kpi-card customer-kpi-revenue">
                    <span>Revenue Generated</span>

                    <strong>
                        {loading
                            ? "..."
                            : formatCurrency(
                                overview.totalSpend
                            )}
                    </strong>

                    <small>
                        Successful customer payments
                    </small>
                </div>

                <div className="customer-kpi-card">
                    <span>Average Customer Value</span>

                    <strong>
                        {loading
                            ? "..."
                            : formatCurrency(
                                overview.averageCustomerValue
                            )}
                    </strong>

                    <small>
                        Average lifetime spend
                    </small>
                </div>

                <div
                    className="customer-kpi-card customer-kpi-segment customer-kpi-new"
                    onClick={() => setStatusFilter("NEW")}
                >
                    <span>New</span>

                    <strong>
                        {loading
                            ? "..."
                            : overview.newCustomers}
                    </strong>

                    <small>
                        New customer segment
                    </small>
                </div>

                <div
                    className="customer-kpi-card customer-kpi-segment customer-kpi-active"
                    onClick={() => setStatusFilter("ACTIVE")}
                >
                    <span>Active</span>

                    <strong>
                        {loading
                            ? "..."
                            : overview.activeCustomers}
                    </strong>

                    <small>
                        Purchased within 45 days
                    </small>
                </div>

                <div
                    className="customer-kpi-card customer-kpi-segment customer-kpi-returning"
                    onClick={() => setStatusFilter("RETURNING")}
                >
                    <span>Returning</span>

                    <strong>
                        {loading
                            ? "..."
                            : overview.returningCustomers}
                    </strong>

                    <small>
                        2+ purchases
                    </small>
                </div>

                <div
                    className="customer-kpi-card customer-kpi-segment customer-kpi-risk"
                    onClick={() => setStatusFilter("AT RISK")}
                >
                    <span>At Risk</span>

                    <strong>
                        {loading
                            ? "..."
                            : overview.atRiskCustomers}
                    </strong>

                    <small>
                        45–89 days since purchase
                    </small>
                </div>

                <div
                    className="customer-kpi-card customer-kpi-segment customer-kpi-inactive"
                    onClick={() => setStatusFilter("INACTIVE")}
                >
                    <span>Inactive</span>

                    <strong>
                        {loading
                            ? "..."
                            : overview.inactiveCustomers}
                    </strong>

                    <small>
                        90+ days since purchase
                    </small>
                </div>

                <div
                    className="customer-kpi-card customer-kpi-highlight customer-kpi-segment customer-kpi-vip"
                    onClick={() => setStatusFilter("VIP")}
                >
                    <span>VIP</span>

                    <strong>
                        {loading
                            ? "..."
                            : overview.vipCustomers}
                    </strong>

                    <small>
                        KSh 100K+ lifetime spend
                    </small>
                </div>

            </section>
            {/* ==================================================
                CUSTOMER HEALTH
            ================================================== */}

            <section className="customer-health-panel">

                <div className="customer-health-header">

                    <div>
                        <span className="section-label">
                            CUSTOMER HEALTH
                        </span>

                        <h2>
                            Customer base health
                        </h2>

                        <p>
                            Understand how your customers are
                            distributed across the lifecycle.
                        </p>
                    </div>

                    <div className="customer-health-total">
                        <strong>
                            {loading
                                ? "..."
                                : overview.totalCustomers.toLocaleString()}
                        </strong>

                        <span>
                            TOTAL CUSTOMERS
                        </span>
                    </div>

                </div>


                <div className="customer-health-list">

                    {customerHealth.map((segment) => (

                        <button
                            key={segment.key}
                            type="button"
                            className={`customer-health-row customer-health-${statusClass(segment.key)}`}
                            onClick={() =>
                                setStatusFilter(segment.key)
                            }
                        >

                            <div className="customer-health-info">

                                <span className="customer-health-name">
                                    {segment.label}
                                </span>

                                <span className="customer-health-description">
                                    {segment.description}
                                </span>

                            </div>


                            <div className="customer-health-bar">

                                <div
                                    className="customer-health-bar-fill"
                                    style={{
                                        width: `${Math.min(
                                            segment.percentage,
                                            100
                                        )}%`,
                                    }}
                                />

                            </div>


                            <div className="customer-health-value">

                                <strong>
                                    {segment.count.toLocaleString()}
                                </strong>

                                <span>
                                    {segment.percentage.toFixed(1)}%
                                </span>

                            </div>

                        </button>

                    ))}

                </div>

            </section>


            {/* ==================================================
                DIRECTORY
            ================================================== */}

            <section className="customer-directory">

                <div className="section-heading">

                    <div>
                        <span className="section-label">
                            CUSTOMER DIRECTORY
                        </span>

                        <h2>
                            All Customers
                        </h2>
                    </div>

                    <div className="directory-count">
                        {filteredCustomers.length}
                        {" "}
                        of
                        {" "}
                        {customers.length}
                    </div>

                </div>


                <div className="customer-toolbar">

                    <div className="customer-search">
                        <span>⌕</span>

                        <input
                            type="search"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Search name, phone or email..."
                        />
                    </div>


                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(
                                event.target.value
                            )
                        }
                    >
                        <option value="ALL">
                            All Customers
                        </option>

                        <option value="NEW">
                            New
                        </option>

                        <option value="ACTIVE">
                            Active
                        </option>

                        <option value="RETURNING">
                            Returning
                        </option>

                        <option value="AT RISK">
                            At Risk
                        </option>

                        <option value="INACTIVE">
                            Inactive
                        </option>

                        <option value="VIP">
                            VIP
                        </option>
                    </select>


                    <select
                        value={spendingFilter}
                        onChange={(event) =>
                            setSpendingFilter(
                                event.target.value
                            )
                        }
                    >
                        <option value="ALL">
                            All Spending
                        </option>

                        <option value="LOW">
                            Under KSh 5,000
                        </option>

                        <option value="MEDIUM">
                            KSh 5,000 – 20,000
                        </option>

                        <option value="HIGH">
                            KSh 20,000+
                        </option>
                    </select>

                </div>


                <div className="customer-table-wrapper">

                    <table className="customer-table">

                        <thead>
                            <tr>
                                <th>Customer</th>
                                <th>Contact</th>
                                <th>Orders</th>
                                <th>Total Spent</th>
                                <th>Last Order</th>
                                <th>Status</th>
                            </tr>
                        </thead>


                        <tbody>

                            {loading && (
                                <tr>
                                    <td colSpan="6">
                                        <div className="customer-empty-state">
                                            <div className="loading-ring" />

                                            <h3>
                                                Loading customers
                                            </h3>

                                            <p>
                                                Pulling customer intelligence
                                                from the Tile Revive database.
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            )}


                            {!loading &&
                                filteredCustomers.length === 0 && (
                                    <tr>
                                        <td colSpan="6">
                                            <div className="customer-empty-state">

                                                <div className="empty-icon">
                                                    ◎
                                                </div>

                                                <h3>
                                                    No customers found
                                                </h3>

                                                <p>
                                                    Try changing your search
                                                    or customer filters.
                                                </p>

                                            </div>
                                        </td>
                                    </tr>
                                )}


                            {!loading &&
                                filteredCustomers.map((customer) => {

                                    const orders =
                                        Number(
                                            customer.totalOrders || 0
                                        );

                                    const spent =
                                        Number(
                                            customer.totalSpent || 0
                                        );

                                    const status =
                                        getCustomerSegment(customer);

                                    return (
                                        <tr
                                            key={customer.id}
                                            className="customer-row"
                                            onClick={() =>
                                                openCustomer(customer)
                                            }
                                        >

                                            <td>
                                                <div className="customer-name-cell">

                                                    <div className="customer-avatar">
                                                        {getInitials(
                                                            customer.fullName
                                                        )}
                                                    </div>

                                                    <div>
                                                        <strong className="customer-click-name">
                                                            {customer.fullName ||
                                                                "Unnamed customer"}

                                                            <span className="customer-view-hint">
                                                                VIEW 360 →
                                                            </span>
                                                        </strong>

                                                        <small>
                                                            Customer #
                                                            {customer.id}
                                                        </small>
                                                    </div>

                                                </div>
                                            </td>


                                            <td>
                                                <div className="customer-contact-cell">

                                                    <span>
                                                        {customer.phoneNumber ||
                                                            "No phone"}
                                                    </span>

                                                    <small>
                                                        {customer.email ||
                                                            "No email"}
                                                    </small>

                                                </div>
                                            </td>


                                            <td>
                                                <strong>
                                                    {orders}
                                                </strong>
                                            </td>


                                            <td>
                                                <strong className="money-value">
                                                    {formatCurrency(spent)}
                                                </strong>
                                            </td>


                                            <td>
                                                <div className="last-order-cell">

                                                    <span>
                                                        {customer.lastOrder
                                                            ?.orderNumber ||
                                                            "No orders"}
                                                    </span>

                                                    <small>
                                                        {formatDate(
                                                            customer.lastOrder
                                                                ?.createdAt
                                                        )}
                                                    </small>

                                                </div>
                                            </td>


                                            <td>
                                                <span
                                                    className={`customer-status ${statusClass(
                                                        status
                                                    )}`}
                                                >
                                                    {status}
                                                </span>
                                            </td>

                                        </tr>
                                    );
                                })}

                        </tbody>

                    </table>

                </div>

            </section>


            {/* ==================================================
                CUSTOMER 360
            ================================================== */}

            {selectedCustomer && (
                <section className="customer-360-panel">

                    <div className="customer-360-header">

                        <div className="customer-profile-heading">

                            <div className="customer-profile-avatar">
                                {getInitials(
                                    selectedCustomer.fullName
                                )}
                            </div>

                            <div>
                                <span className="section-label">
                                    CUSTOMER 360
                                </span>

                                <h2>
                                    {selectedCustomer.fullName}
                                </h2>

                                <p>
                                    {selectedCustomer.email ||
                                        selectedCustomer.phoneNumber ||
                                        `Customer #${selectedCustomer.id}`}
                                </p>
                            </div>

                        </div>


                        <div className="customer-360-header-actions">

                            {(customer360?.customer?.email ||
                                selectedCustomer?.email) && (
                                <button
                                    type="button"
                                    className="customer-email-button"
                                    onClick={openEmailComposer}
                                    title="Email this customer"
                                >
                                    ✉ Email Customer
                                </button>
                            )}

                            <button
                                type="button"
                                className="customer-close-button"
                                onClick={() => {
                                    setSelectedCustomer(null);
                                    setCustomer360(null);
                                    setEmailComposerOpen(false);
                                }}
                                aria-label="Close customer profile"
                            >
                                ×
                            </button>

                        </div>

                    </div>


                    {emailComposerOpen && (
                        <div className="customer-email-composer">

                            <div className="email-composer-header">

                                <div>
                                    <span className="section-label">
                                        CUSTOMER COMMUNICATION
                                    </span>

                                    <h3>
                                        Send Email
                                    </h3>

                                    <p>
                                        Contact this customer directly.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="email-composer-close"
                                    onClick={() =>
                                        setEmailComposerOpen(false)
                                    }
                                >
                                    ×
                                </button>

                            </div>


                            <div className="email-recipient">

                                <span>
                                    TO
                                </span>

                                <strong>
                                    {emailRecipient ||
                                        "No customer email available"}
                                </strong>

                            </div>


                            <label className="email-field">

                                <span>
                                    SUBJECT
                                </span>

                                <input
                                    type="text"
                                    value={emailSubject}
                                    onChange={(event) =>
                                        setEmailSubject(
                                            event.target.value
                                        )
                                    }
                                    placeholder="Email subject"
                                />

                            </label>


                            <label className="email-field">

                                <span>
                                    MESSAGE
                                </span>

                                <textarea
                                    value={emailMessage}
                                    onChange={(event) =>
                                        setEmailMessage(
                                            event.target.value
                                        )
                                    }
                                    rows="9"
                                    placeholder="Write your message..."
                                />

                            </label>


                            <div className="email-composer-footer">

                                <span>
                                    Opens your configured email application.
                                </span>

                                <a
                                    href={emailMailto}
                                    className="email-send-button"
                                    onClick={() =>
                                        setEmailComposerOpen(false)
                                    }
                                >
                                    Send Email →
                                </a>

                            </div>

                        </div>
                    )}

                    {detailsLoading && (
                        <div className="customer-details-loading">
                            <div className="loading-ring" />

                            <span>
                                Loading complete customer profile...
                            </span>
                        </div>
                    )}


                    {detailsError && (
                        <div className="customer-error customer-details-error">
                            <strong>
                                Customer 360 unavailable
                            </strong>

                            <span>
                                {detailsError}
                            </span>
                        </div>
                    )}


                    {!detailsLoading &&
                        !detailsError &&
                        customer360 && (
                            <>

                                {/* ======================================
                                    PROFILE METRICS
                                ====================================== */}

                                <div className="customer-profile-metrics">

                                    <div>
                                        <span>
                                            Lifetime Spend
                                        </span>

                                        <strong>
                                            {formatCurrency(
                                                customer360.metrics
                                                    ?.lifetimeSpend
                                            )}
                                        </strong>
                                    </div>


                                    <div>
                                        <span>
                                            Total Orders
                                        </span>

                                        <strong>
                                            {customer360.metrics
                                                ?.totalOrders ?? 0}
                                        </strong>
                                    </div>


                                    <div>
                                        <span>
                                            Average Order Value
                                        </span>

                                        <strong>
                                            {formatCurrency(
                                                customer360.metrics
                                                    ?.averageOrderValue
                                            )}
                                        </strong>
                                    </div>


                                    <div>
                                        <span>
                                            Paid Orders
                                        </span>

                                        <strong>
                                            {customer360.metrics
                                                ?.paidOrders ?? 0}
                                        </strong>
                                    </div>


                                    <div>
                                        <span>
                                            Customer Since
                                        </span>

                                        <strong>
                                            {formatDate(
                                                customer360.customer
                                                    ?.createdAt
                                            )}
                                        </strong>
                                    </div>


                                    <div>
                                        <span>
                                            Status
                                        </span>

                                        <strong
                                            className={`profile-status ${statusClass(
                                                customer360.metrics
                                                    ?.status
                                            )}`}
                                        >
                                            {customer360.metrics
                                                ?.status || "NEW"}
                                        </strong>
                                    </div>

                                </div>


                                {/* ======================================
                                    INSIGHTS
                                ====================================== */}

                                <div className="customer-insights-grid">

                                    <div className="customer-detail-card">

                                        <div className="detail-card-header">
                                            <span className="section-label">
                                                MOST PURCHASED
                                            </span>

                                            <span>
                                                Product preference
                                            </span>
                                        </div>


                                        {customer360.mostPurchasedProduct ? (
                                            <div className="product-insight">

                                                <strong>
                                                    {
                                                        customer360
                                                            .mostPurchasedProduct
                                                            .productName
                                                    }
                                                </strong>

                                                <div>
                                                    Quantity:
                                                    {" "}
                                                    {
                                                        customer360
                                                            .mostPurchasedProduct
                                                            .quantity
                                                    }
                                                </div>

                                                <div>
                                                    Spend:
                                                    {" "}
                                                    {formatCurrency(
                                                        customer360
                                                            .mostPurchasedProduct
                                                            .amountSpent
                                                    )}
                                                </div>

                                                <small>
                                                    Last purchased:
                                                    {" "}
                                                    {formatDate(
                                                        customer360
                                                            .mostPurchasedProduct
                                                            .lastPurchased
                                                    )}
                                                </small>

                                            </div>
                                        ) : (
                                            <div className="detail-empty">
                                                No completed purchase
                                                preference yet.
                                            </div>
                                        )}

                                    </div>


                                    <div className="customer-detail-card">

                                        <div className="detail-card-header">
                                            <span className="section-label">
                                                ACCOUNT
                                            </span>

                                            <span>
                                                Customer information
                                            </span>
                                        </div>


                                        <div className="account-details">

                                            <div>
                                                <span>
                                                    Phone
                                                </span>

                                                <strong>
                                                    {customer360.customer
                                                        ?.phoneNumber ||
                                                        "—"}
                                                </strong>
                                            </div>


                                            <div>
                                                <span>
                                                    Email
                                                </span>

                                                <strong>
                                                    {customer360.customer
                                                        ?.email ||
                                                        "—"}
                                                </strong>
                                            </div>


                                            <div>
                                                <span>
                                                    County
                                                </span>

                                                <strong>
                                                    {customer360.customer
                                                        ?.county ||
                                                        "—"}
                                                </strong>
                                            </div>


                                            <div>
                                                <span>
                                                    Location
                                                </span>

                                                <strong>
                                                    {customer360.customer
                                                        ?.location ||
                                                        "—"}
                                                </strong>
                                            </div>


                                            <div>
                                                <span>
                                                    Last Order
                                                </span>

                                                <strong>
                                                    {formatDate(
                                                        customer360.metrics
                                                            ?.lastOrderAt
                                                    )}
                                                </strong>
                                            </div>


                                            <div>
                                                <span>
                                                    Outstanding
                                                </span>

                                                <strong>
                                                    {formatCurrency(
                                                        customer360.metrics
                                                            ?.outstanding
                                                    )}
                                                </strong>
                                            </div>

                                        </div>

                                    </div>

                                </div>


                                {/* ======================================
                                    ORDERS
                                ====================================== */}

                                <div className="customer-detail-card full-width">

                                    <div className="detail-card-header">

                                        <div>
                                            <span className="section-label">
                                                ORDER HISTORY
                                            </span>

                                            <h3>
                                                Customer Orders
                                            </h3>
                                        </div>

                                        <span>
                                            {customer360.orders?.length || 0}
                                            {" "}
                                            orders
                                        </span>

                                    </div>


                                    <div className="mini-table-wrapper">

                                        <table className="mini-table">

                                            <thead>
                                                <tr>
                                                    <th>Order</th>
                                                    <th>Date</th>
                                                    <th>Total</th>
                                                    <th>Payment</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>

                                            <tbody>

                                                {(customer360.orders || [])
                                                    .map((order) => (
                                                        <tr key={order.id}>

                                                            <td>
                                                                <strong>
                                                                    {order.orderNumber}
                                                                </strong>
                                                            </td>

                                                            <td>
                                                                {formatDate(
                                                                    order.createdAt
                                                                )}
                                                            </td>

                                                            <td>
                                                                {formatCurrency(
                                                                    order.totalAmount
                                                                )}
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className={`table-status ${statusClass(
                                                                        order.paymentStatus
                                                                    )}`}
                                                                >
                                                                    {order.paymentStatus}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className={`table-status ${statusClass(
                                                                        order.orderStatus
                                                                    )}`}
                                                                >
                                                                    {order.orderStatus}
                                                                </span>
                                                            </td>

                                                        </tr>
                                                    ))}

                                                {(!customer360.orders ||
                                                    customer360.orders.length === 0) && (
                                                    <tr>
                                                        <td
                                                            colSpan="5"
                                                            className="detail-empty"
                                                        >
                                                            No orders found.
                                                        </td>
                                                    </tr>
                                                )}

                                            </tbody>

                                        </table>

                                    </div>

                                </div>


                                {/* ======================================
                                    PRODUCT PREFERENCES
                                ====================================== */}

                                <div className="customer-detail-card full-width">

                                    <div className="detail-card-header">

                                        <div>
                                            <span className="section-label">
                                                BUYING BEHAVIOUR
                                            </span>

                                            <h3>
                                                Product Preferences
                                            </h3>
                                        </div>

                                    </div>


                                    <div className="preference-list">

                                        {(customer360.productPreferences || [])
                                            .map((product) => (
                                                <div
                                                    key={product.productId}
                                                    className="preference-row"
                                                >

                                                    <div>
                                                        <strong>
                                                            {product.productName}
                                                        </strong>

                                                        <small>
                                                            Last purchased:
                                                            {" "}
                                                            {formatDate(
                                                                product.lastPurchased
                                                            )}
                                                        </small>
                                                    </div>

                                                    <div className="preference-stats">

                                                        <span>
                                                            {product.quantity}
                                                            {" "}
                                                            units
                                                        </span>

                                                        <strong>
                                                            {formatCurrency(
                                                                product.amountSpent
                                                            )}
                                                        </strong>

                                                    </div>

                                                </div>
                                            ))}

                                        {(!customer360.productPreferences ||
                                            customer360.productPreferences.length === 0) && (
                                            <div className="detail-empty">
                                                No completed product purchases
                                                found.
                                            </div>
                                        )}

                                    </div>

                                </div>


                                {/* ======================================
                                    PAYMENTS
                                ====================================== */}

                                <div className="customer-detail-card full-width">

                                    <div className="detail-card-header">

                                        <div>
                                            <span className="section-label">
                                                PAYMENT HISTORY
                                            </span>

                                            <h3>
                                                Customer Payments
                                            </h3>
                                        </div>

                                    </div>


                                    <div className="mini-table-wrapper">

                                        <table className="mini-table">

                                            <thead>
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Amount</th>
                                                    <th>Method</th>
                                                    <th>Status</th>
                                                    <th>Receipt</th>
                                                </tr>
                                            </thead>

                                            <tbody>

                                                {(customer360.payments || [])
                                                    .map((payment) => (
                                                        <tr key={payment.id}>

                                                            <td>
                                                                {formatDateTime(
                                                                    payment.createdAt
                                                                )}
                                                            </td>

                                                            <td>
                                                                <strong>
                                                                    {formatCurrency(
                                                                        payment.amountPaid
                                                                    )}
                                                                </strong>
                                                            </td>

                                                            <td>
                                                                {payment.paymentMethod ||
                                                                    "—"}
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className={`table-status ${statusClass(
                                                                        payment.status
                                                                    )}`}
                                                                >
                                                                    {payment.status}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                {payment.mpesaReceiptNumber ||
                                                                    "—"}
                                                            </td>

                                                        </tr>
                                                    ))}

                                                {(!customer360.payments ||
                                                    customer360.payments.length === 0) && (
                                                    <tr>
                                                        <td
                                                            colSpan="5"
                                                            className="detail-empty"
                                                        >
                                                            No payment records found.
                                                        </td>
                                                    </tr>
                                                )}

                                            </tbody>

                                        </table>

                                    </div>

                                </div>


                                {/* ======================================
                                    COMMUNICATION HISTORY
                                ====================================== */}

                                <div className="customer-detail-card full-width">

                                    <div className="detail-card-header">

                                        <div>
                                            <span className="section-label">
                                                COMMUNICATION
                                            </span>

                                            <h3>
                                                Communication History
                                            </h3>
                                        </div>

                                    </div>


                                    <div className="timeline">

                                        {(customer360.communications || [])
                                            .map((communication) => (
                                                <div
                                                    key={communication.id}
                                                    className="timeline-item"
                                                >

                                                    <div className="timeline-marker" />

                                                    <div className="timeline-content">

                                                        <div className="timeline-top">

                                                            <strong>
                                                                {communication.type ||
                                                                    "EMAIL"}
                                                            </strong>

                                                            <span>
                                                                {formatDateTime(
                                                                    communication.createdAt
                                                                )}
                                                            </span>

                                                        </div>

                                                        <p>
                                                            {communication.subject ||
                                                                "Customer communication"}
                                                        </p>

                                                        <small>
                                                            {communication.recipient}
                                                            {" · "}
                                                            {communication.status}
                                                        </small>

                                                    </div>

                                                </div>
                                            ))}

                                        {(!customer360.communications ||
                                            customer360.communications.length === 0) && (
                                            <div className="detail-empty">
                                                No communication history recorded yet.
                                            </div>
                                        )}

                                    </div>

                                </div>


                                {/* ======================================
                                    AUDIT TRAIL
                                ====================================== */}

                                <div className="customer-detail-card full-width">

                                    <div className="detail-card-header">

                                        <div>
                                            <span className="section-label">
                                                AUDIT TRAIL
                                            </span>

                                            <h3>
                                                Customer Activity
                                            </h3>
                                        </div>

                                    </div>


                                    <div className="timeline">

                                        {(customer360.auditTrail || [])
                                            .map((entry, index) => (
                                                <div
                                                    key={`${entry.createdAt}-${index}`}
                                                    className="timeline-item"
                                                >

                                                    <div className="timeline-marker" />

                                                    <div className="timeline-content">

                                                        <div className="timeline-top">

                                                            <strong>
                                                                {entry.action}
                                                            </strong>

                                                            <span>
                                                                {formatDateTime(
                                                                    entry.createdAt
                                                                )}
                                                            </span>

                                                        </div>

                                                        <p>
                                                            {entry.entity
                                                                ? `${entry.entity}${entry.entityId ? ` #${entry.entityId}` : ""}`
                                                                : "System activity"}
                                                        </p>

                                                    </div>

                                                </div>
                                            ))}

                                        {(!customer360.auditTrail ||
                                            customer360.auditTrail.length === 0) && (
                                            <div className="detail-empty">
                                                No audit activity found.
                                            </div>
                                        )}

                                    </div>

                                </div>

                            </>
                        )}

                </section>
            )}


        {/* ======================================================
            ADD CUSTOMER MODAL
        ====================================================== */}

        {addCustomerOpen && (
            <div
                className="customer-modal-backdrop"
                onMouseDown={(event) => {
                    if (
                        event.target ===
                        event.currentTarget
                    ) {
                        if (!creatingCustomer) {
                            setAddCustomerOpen(false);
                        }
                    }
                }}
            >
                <div
                    className="customer-add-modal"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="add-customer-title"
                >

                    <div className="customer-add-modal-header">

                        <div>
                            <span className="section-label">
                                CUSTOMER MANAGEMENT
                            </span>

                            <h2 id="add-customer-title">
                                Add Customer
                            </h2>

                            <p>
                                Create a customer profile
                                with complete contact and
                                location information.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="customer-modal-close"
                            onClick={() =>
                                setAddCustomerOpen(false)
                            }
                            disabled={creatingCustomer}
                            aria-label="Close"
                        >
                            ×
                        </button>

                    </div>

                    {addCustomerError && (
                        <div className="customer-modal-error">
                            <strong>
                                Unable to create customer
                            </strong>

                            <span>
                                {addCustomerError}
                            </span>
                        </div>
                    )}

                    <form
                        className="customer-add-form"
                        onSubmit={handleCreateCustomer}
                    >

                        <div className="customer-form-grid">

                            <label>
                                <span>
                                    Full Name *
                                </span>

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
                                    placeholder="Customer full name"
                                    autoFocus
                                />
                            </label>

                            <label>
                                <span>
                                    Phone Number *
                                </span>

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
                                    placeholder="07XXXXXXXX"
                                />
                            </label>

                            <label>
                                <span>
                                    Email
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

                            <label>
                                <span>
                                    County
                                </span>

                                <input
                                    type="text"
                                    value={
                                        newCustomer.county
                                    }
                                    onChange={(event) =>
                                        setNewCustomer(
                                            (current) => ({
                                                ...current,
                                                county:
                                                    event.target
                                                        .value,
                                            })
                                        )
                                    }
                                    placeholder="e.g. Nairobi"
                                />
                            </label>

                            <label className="customer-form-full">
                                <span>
                                    Location
                                </span>

                                <input
                                    type="text"
                                    value={
                                        newCustomer.location
                                    }
                                    onChange={(event) =>
                                        setNewCustomer(
                                            (current) => ({
                                                ...current,
                                                location:
                                                    event.target
                                                        .value,
                                            })
                                        )
                                    }
                                    placeholder="Estate, area, town or delivery location"
                                />
                            </label>

                        </div>

                        <div className="customer-add-form-actions">

                            <button
                                type="button"
                                className="customer-modal-cancel"
                                onClick={() =>
                                    setAddCustomerOpen(false)
                                }
                                disabled={creatingCustomer}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="customer-modal-submit"
                                disabled={creatingCustomer}
                            >
                                {creatingCustomer
                                    ? "Creating..."
                                    : "Create Customer"}
                            </button>

                        </div>

                    </form>

                </div>
            </div>
        )}
        </div>
    );
}















