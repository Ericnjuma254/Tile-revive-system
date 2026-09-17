import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const sections = [
    {
        key: "orders",
        label: "Orders",
        icon: "ORD",
        items: [
            { label: "All Orders", path: "/admin/orders" },
            { label: "Create Order", path: "/admin/orders/create" },
        ],
    },
    {
        key: "products",
        label: "Products",
        icon: "PRD",
        items: [
            { label: "All Products", path: "/admin/products" },
        ],
    },
    {
        key: "inventory",
        label: "Inventory",
        icon: "INV",
        items: [
            { label: "Stock Overview", path: "/admin/products" },
        ],
    },
    {
        key: "customers",
        label: "Customers",
        icon: "CUS",
        items: [
            { label: "All Customers", path: "/admin/customers" },
        ],
    },
    {
        key: "reports",
        label: "Reports",
        icon: "RPT",
        items: [
            { label: "Financial Reports", path: "/admin/reports" },
            { label: "Expenditure", path: "/admin/expenditure" },
        ],
    },
    {
        key: "promotions",
        label: "Promotions",
        icon: "OFF",
        items: [
            { label: "Offers", path: "/admin/offers" },
        ],
    },
    {
        key: "gallery",
        label: "Gallery",
        icon: "GAL",
        items: [
            { label: "Manage Gallery", path: "/admin/gallery" },
            { label: "Mobile Gallery", path: "/admin/gallery/mobile" },
        ],
    },
];

function AdminSidebar({ pendingUsersCount = 0, onLogout }) {
    const navigate = useNavigate();
    const location = useLocation();

    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [openSections, setOpenSections] = useState({
        orders: true,
        products: false,
        inventory: false,
        customers: false,
        reports: false,
        promotions: false,
        gallery: false,
    });

    useEffect(() => {
        const activeSection = sections.find((section) =>
            section.items.some((item) =>
                location.pathname === item.path ||
                location.pathname.startsWith(`${item.path}/`)
            )
        );

        if (activeSection) {
            setOpenSections((current) => ({
                ...current,
                [activeSection.key]: true,
            }));
        }

        setMobileOpen(false);
    }, [location.pathname]);

    const toggleSection = (key) => {
        setOpenSections((current) => ({
            ...current,
            [key]: !current[key],
        }));
    };

    const goTo = (path) => {
        navigate(path);
        setMobileOpen(false);
    };

    return (
        <>
            <button
                type="button"
                className="admin-mobile-menu-button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open admin navigation"
            >
                ☰
            </button>

            {mobileOpen && (
                <button
                    type="button"
                    className="admin-sidebar-backdrop"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Close admin navigation"
                />
            )}

            <aside
                className={`admin-sidebar ${
                    collapsed ? "collapsed" : ""
                } ${mobileOpen ? "mobile-open" : ""}`}
            >
                <div className="admin-sidebar-brand">
                    <button
                        type="button"
                        className="admin-sidebar-logo"
                        onClick={() => goTo("/admin/dashboard")}
                        aria-label="Go to dashboard"
                    >
                        TR
                    </button>

                    {!collapsed && (
                        <div className="admin-sidebar-brand-copy">
                            <strong>TILE REVIVE</strong>
                            <span>ADMINISTRATION</span>
                        </div>
                    )}

                    <button
                        type="button"
                        className="admin-sidebar-collapse"
                        onClick={() => setCollapsed((value) => !value)}
                        aria-label={
                            collapsed
                                ? "Expand sidebar"
                                : "Collapse sidebar"
                        }
                    >
                        {collapsed ? "›" : "‹"}
                    </button>
                </div>

                <nav className="admin-sidebar-nav">
                    <button
                        type="button"
                        className={`admin-sidebar-dashboard ${
                            location.pathname === "/admin/dashboard"
                                ? "active"
                                : ""
                        }`}
                        onClick={() => goTo("/admin/dashboard")}
                    >
                        <span>⌂</span>
                        {!collapsed && <strong>Dashboard</strong>}
                    </button>

                    {sections.map((section) => {
                        const isOpen = openSections[section.key];

                        return (
                            <div
                                className="admin-sidebar-section"
                                key={section.key}
                            >
                                <button
                                    type="button"
                                    className="admin-sidebar-section-toggle"
                                    onClick={() =>
                                        toggleSection(section.key)
                                    }
                                    title={
                                        collapsed
                                            ? section.label
                                            : undefined
                                    }
                                >
                                    <span>{section.icon}</span>

                                    {!collapsed && (
                                        <>
                                            <strong>
                                                {section.label}
                                            </strong>
                                            <span className="admin-sidebar-chevron">
                                                {isOpen ? "⌃" : "⌄"}
                                            </span>
                                        </>
                                    )}
                                </button>

                                {!collapsed && isOpen && (
                                    <div className="admin-sidebar-submenu">
                                        {section.items.map((item) => {
                                            const active =
                                                location.pathname ===
                                                    item.path ||
                                                location.pathname.startsWith(
                                                    `${item.path}/`
                                                );

                                            return (
                                                <button
                                                    type="button"
                                                    key={item.path}
                                                    className={
                                                        active
                                                            ? "active"
                                                            : ""
                                                    }
                                                    onClick={() =>
                                                        goTo(item.path)
                                                    }
                                                >
                                                    <span />
                                                    {item.label}

                                                    {item.path ===
                                                        "/admin/customers" &&
                                                        pendingUsersCount >
                                                            0 && (
                                                            <small>
                                                                {
                                                                    pendingUsersCount
                                                                }
                                                            </small>
                                                        )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                <div className="admin-sidebar-bottom">
                    <button
                        type="button"
                        onClick={() => goTo("/admin/dashboard")}
                    >
                        <span>SET</span>
                        {!collapsed && <strong>Settings</strong>}
                    </button>

                    <button
                        type="button"
                        className="logout-button"
                        onClick={onLogout}
                    >
                        <span>OUT</span>
                        {!collapsed && <strong>Logout</strong>}
                    </button>
                </div>
            </aside>
        </>
    );
}

export default AdminSidebar;

