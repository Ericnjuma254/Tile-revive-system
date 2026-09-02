import './GeographicAnalytics.css';
import React, { useMemo, useState } from "react";

import {
    CircleMarker,
    MapContainer,
    Popup,
    TileLayer,
    useMap,
} from "react-leaflet";

import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import "leaflet/dist/leaflet.css";

const KENYA_CENTER = [-0.0236, 37.9062];

const currency = (value) =>
    `KES ${Number(value || 0).toLocaleString()}`;

const compactCurrency = (value) => {
    const amount = Number(value || 0);

    if (amount >= 1000000) {
        return `KES ${(amount / 1000000).toFixed(1)}M`;
    }

    if (amount >= 1000) {
        return `KES ${(amount / 1000).toFixed(1)}K`;
    }

    return currency(amount);
};

const number = (value) =>
    Number(value || 0).toLocaleString();

const percent = (value) =>
    `${Number(value || 0).toFixed(1)}%`;

function MapResetControl() {
    const map = useMap();

    return (
        <button
            type="button"
            className="geo-floating-button"
            onClick={() => map.setView(KENYA_CENTER, 6)}
            title="Reset map"
        >
            ⌂
        </button>
    );
}

function FullscreenControl() {
    const map = useMap();

    const toggleFullscreen = () => {
        const container = map.getContainer();

        if (!document.fullscreenElement) {
            container.requestFullscreen?.();
        } else {
            document.exitFullscreen?.();
        }
    };

    return (
        <button
            type="button"
            className="geo-floating-button"
            onClick={toggleFullscreen}
            title="Fullscreen"
        >
            ⛶
        </button>
    );
}

function getMarkerRadius(orders, maxOrders) {
    const value = Number(orders || 0);

    if (!value || !maxOrders) return 7;

    return Math.max(
        7,
        Math.min(
            28,
            7 + (value / maxOrders) * 21
        )
    );
}

function getMarkerOpacity(revenue, maxRevenue) {
    if (!revenue || !maxRevenue) return 0.42;

    return Math.max(
        0.38,
        Math.min(
            0.92,
            0.38 + (Number(revenue) / maxRevenue) * 0.54
        )
    );
}

function performanceForCounty(county) {
    const revenue = Number(county?.revenue || 0);
    const orders = Number(county?.orders || 0);
    const growth = Number(county?.growth || 0);

    if (!orders && !revenue) return "Critical";
    if (growth >= 20 || revenue >= 10000) return "Excellent";
    if (growth >= 5 || revenue >= 3000) return "Good";
    if (growth >= 0 || revenue > 0) return "Average";

    return "Low";
}

function PerformanceBadge({ value }) {
    const normalized = String(value || "Average")
        .toLowerCase()
        .replace(/\s+/g, "-");

    return (
        <span className={`geo-performance-badge ${normalized}`}>
            {value || "Average"}
        </span>
    );
}

function SectionHeader({
    eyebrow,
    title,
    description,
    action,
}) {
    return (
        <div className="geo-section-header">
            <div>
                {eyebrow && (
                    <span className="geo-eyebrow">
                        {eyebrow}
                    </span>
                )}

                <h3>{title}</h3>

                {description && (
                    <p>{description}</p>
                )}
            </div>

            {action}
        </div>
    );
}

function MetricCard({
    icon,
    label,
    value,
    supporting,
    trend,
    featured,
}) {
    return (
        <div
            className={`geo-metric-card ${
                featured ? "featured" : ""
            }`}
        >
            <div className="geo-metric-top">
                <div className="geo-metric-icon">
                    {icon}
                </div>

                {trend !== undefined &&
                    trend !== null && (
                        <span
                            className={`geo-trend ${
                                Number(trend) >= 0
                                    ? "positive"
                                    : "negative"
                            }`}
                        >
                            {Number(trend) >= 0
                                ? "↑"
                                : "↓"}{" "}
                            {Math.abs(
                                Number(trend)
                            ).toFixed(1)}
                            %
                        </span>
                    )}
            </div>

            <span className="geo-metric-label">
                {label}
            </span>

            <strong className="geo-metric-value">
                {value}
            </strong>

            <span className="geo-metric-supporting">
                {supporting}
            </span>
        </div>
    );
}

function EmptyState({ title, description }) {
    return (
        <div className="geo-empty-state">
            <div className="geo-empty-icon">⌁</div>
            <strong>{title}</strong>
            <span>{description}</span>
        </div>
    );
}

function CountyDetailPanel({
    county,
    onClose,
}) {
    if (!county) return null;

    const aov =
        Number(county.orders || 0) > 0
            ? Number(county.revenue || 0) /
              Number(county.orders || 0)
            : 0;

    return (
        <div className="geo-county-detail">
            <div className="geo-detail-header">
                <div>
                    <span className="geo-eyebrow">
                        COUNTY DETAIL
                    </span>

                    <h4>{county.county}</h4>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="geo-detail-close"
                >
                    ×
                </button>
            </div>

            <div className="geo-detail-revenue">
                {currency(county.revenue)}
                <span>revenue</span>
            </div>

            <div className="geo-detail-grid">
                <div>
                    <span>ORDERS</span>
                    <strong>
                        {number(county.orders)}
                    </strong>
                </div>

                <div>
                    <span>CUSTOMERS</span>
                    <strong>
                        {number(county.customers)}
                    </strong>
                </div>

                <div>
                    <span>AOV</span>
                    <strong>
                        {currency(aov)}
                    </strong>
                </div>

                <div>
                    <span>GROWTH</span>
                    <strong>
                        {county.growth !== undefined
                            ? `${Number(
                                  county.growth
                              ).toFixed(1)}%`
                            : "—"}
                    </strong>
                </div>

                <div>
                    <span>REPEAT</span>
                    <strong>
                        {county.repeatCustomers !==
                        undefined
                            ? number(
                                  county.repeatCustomers
                              )
                            : "—"}
                    </strong>
                </div>

                <div>
                    <span>GPS</span>
                    <strong>
                        {county.latitude !== null &&
                        county.longitude !== null
                            ? "Mapped"
                            : "Unavailable"}
                    </strong>
                </div>
            </div>

            <div className="geo-detail-footer">
                <span>TOP PRODUCT</span>
                <strong>
                    {county.topProduct || "Not available"}
                </strong>
            </div>
        </div>
    );
}

export default function GeographicAnalytics({
    geographicAnalytics,
    onRefresh,
    onExport,
}) {
    const analytics =
        geographicAnalytics || {};

    const summary =
        analytics.summary || {};

    const counties = useMemo(
        () =>
            Array.isArray(analytics.counties)
                ? analytics.counties
                : [],
        [analytics.counties]
    );

    const [range, setRange] =
        useState("30 Days");

    const [mapMode, setMapMode] =
        useState("map");

    const [mapLayer, setMapLayer] =
        useState("orders");

    const [mapFilter, setMapFilter] =
        useState("all");

    const [heatmapMode, setHeatmapMode] =
        useState("orders");

    const [selectedCounty, setSelectedCounty] =
        useState(null);

    const [countySort, setCountySort] =
        useState("revenue");

    const [countySearch, setCountySearch] =
        useState("");

    const [trendRange, setTrendRange] =
        useState("30 Days");

    const [region, setRegion] =
        useState("All Counties");

    const [tablePage, setTablePage] =
        useState(1);

    const topCounty =
        summary.topCounty ||
        counties[0] ||
        null;

    const totalOrders =
        Number(summary.totalOrders || 0);

    const successfulOrders =
        Number(summary.successfulOrders || 0);

    const totalRevenue =
        Number(summary.totalRevenue || 0);

    const totalCustomers =
        Number(summary.customers || 0);

    const mappedOrders =
        Number(summary.mappedOrders || 0);

    const countiesReached =
        Number(summary.countiesReached || 0);

    const gpsCoverage =
        Number(summary.mappingCoverage || 0);

    const aov =
        successfulOrders > 0
            ? totalRevenue / successfulOrders
            : 0;

    const maxRevenue = useMemo(
        () =>
            counties.reduce(
                (max, county) =>
                    Math.max(
                        max,
                        Number(county.revenue || 0)
                    ),
                0
            ),
        [counties]
    );

    const maxOrders = useMemo(
        () =>
            counties.reduce(
                (max, county) =>
                    Math.max(
                        max,
                        Number(county.orders || 0)
                    ),
                0
            ),
        [counties]
    );

    const sortedCounties = useMemo(() => {
        const filtered = counties.filter(
            (county) =>
                String(
                    county.county || ""
                )
                    .toLowerCase()
                    .includes(
                        countySearch.toLowerCase()
                    )
        );

        return [...filtered].sort((a, b) => {
            if (countySort === "orders") {
                return (
                    Number(b.orders || 0) -
                    Number(a.orders || 0)
                );
            }

            if (countySort === "customers") {
                return (
                    Number(b.customers || 0) -
                    Number(a.customers || 0)
                );
            }

            if (countySort === "growth") {
                return (
                    Number(b.growth || 0) -
                    Number(a.growth || 0)
                );
            }

            return (
                Number(b.revenue || 0) -
                Number(a.revenue || 0)
            );
        });
    }, [
        counties,
        countySearch,
        countySort,
    ]);

    const revenueChartData =
        Array.isArray(
            analytics.revenueTrend
        )
            ? analytics.revenueTrend
            : Array.isArray(
                  analytics.trend
              )
            ? analytics.trend
            : [];

    const customerDistribution =
        useMemo(() => {
            const source = [...counties]
                .sort(
                    (a, b) =>
                        Number(b.customers || 0) -
                        Number(a.customers || 0)
                )
                .slice(0, 6);

            return source.map((county) => ({
                name: county.county,
                customers: Number(
                    county.customers || 0
                ),
                revenue: Number(
                    county.revenue || 0
                ),
            }));
        }, [counties]);

    const topOrderCounties =
        useMemo(
            () =>
                [...counties]
                    .sort(
                        (a, b) =>
                            Number(
                                b.orders || 0
                            ) -
                            Number(
                                a.orders || 0
                            )
                    )
                    .slice(0, 6),
            [counties]
        );

    const deliveryCoverage =
        Number(
            summary.deliveryCoverage ||
                summary.countyCoverage ||
                gpsCoverage
        );

    const customerLocation =
        [...counties].sort(
            (a, b) =>
                Number(b.customers || 0) -
                Number(a.customers || 0)
        )[0] || null;

    const highestRevenueLocation =
        [...counties].sort(
            (a, b) =>
                Number(b.revenue || 0) -
                Number(a.revenue || 0)
        )[0] || null;

    const mostOrdersLocation =
        [...counties].sort(
            (a, b) =>
                Number(b.orders || 0) -
                Number(a.orders || 0)
        )[0] || null;

    const fastestGrowingLocation =
        [...counties].sort(
            (a, b) =>
                Number(b.growth || 0) -
                Number(a.growth || 0)
        )[0] || null;

    const repeatLocation =
        [...counties].sort(
            (a, b) =>
                Number(b.repeatCustomers || 0) -
                Number(a.repeatCustomers || 0)
        )[0] || null;

    const generateInsights = () => {
        const insights = [];

        if (topCounty && totalRevenue > 0) {
            const share =
                (Number(topCounty.revenue || 0) /
                    totalRevenue) *
                100;

            if (share >= 50) {
                insights.push({
                    category: "OPPORTUNITY",
                    title: `${topCounty.county} dominates revenue`,
                    text: `${topCounty.county} contributes ${share.toFixed(
                        1
                    )}% of recorded revenue.`,
                });
            }
        }

        if (fastestGrowingLocation) {
            const growth = Number(
                fastestGrowingLocation.growth || 0
            );

            if (growth > 0) {
                insights.push({
                    category: "GROWTH",
                    title: `${fastestGrowingLocation.county} is growing`,
                    text: `Recorded geographic growth is ${growth.toFixed(
                        1
                    )}% in this territory.`,
                });
            }
        }

        if (
            countiesReached > 0 &&
            countiesReached < 24
        ) {
            insights.push({
                category: "WARNING",
                title: "Geographic coverage remains concentrated",
                text: `${countiesReached} counties currently have recorded activity.`,
            });
        }

        if (
            mappedOrders > 0 &&
            gpsCoverage < 50
        ) {
            insights.push({
                category: "WARNING",
                title: "GPS coverage needs improvement",
                text: `${gpsCoverage.toFixed(
                    1
                )}% of available geographic order data has coordinates.`,
            });
        }

        if (
            highestRevenueLocation &&
            mostOrdersLocation &&
            highestRevenueLocation.county !==
                mostOrdersLocation.county
        ) {
            insights.push({
                category: "TRENDING",
                title: "Revenue and order leadership differ",
                text: `${highestRevenueLocation.county} leads revenue while ${mostOrdersLocation.county} leads order volume.`,
            });
        }

        if (
            totalOrders > 0 &&
            totalCustomers > 0
        ) {
            const ordersPerCustomer =
                totalOrders / totalCustomers;

            if (ordersPerCustomer < 1.2) {
                insights.push({
                    category: "OPPORTUNITY",
                    title: "Repeat purchasing opportunity",
                    text: "Order frequency suggests an opportunity to increase repeat purchasing.",
                });
            }
        }

        if (!insights.length) {
            insights.push({
                category: "OPPORTUNITY",
                title: "Collect more geographic data",
                text: "More completed orders and location data will unlock deeper geographic intelligence.",
            });
        }

        return insights.slice(0, 6);
    };

    const insights = generateInsights();

    const pageSize = 8;

    const paginatedCounties =
        sortedCounties.slice(
            (tablePage - 1) * pageSize,
            tablePage * pageSize
        );

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                sortedCounties.length /
                    pageSize
            )
        );

    const donutTotal =
        customerDistribution.reduce(
            (sum, item) =>
                sum +
                Number(
                    item.customers || 0
                ),
            0
        );

    const donutColors = [
        "#32e875",
        "#20c9c3",
        "#6475ff",
        "#8b5cf6",
        "#f59e0b",
        "#6b7280",
    ];

    const filteredMapCounties =
        counties.filter((county) => {
            const orders = Number(
                county.orders || 0
            );

            const revenue = Number(
                county.revenue || 0
            );

            const growth = Number(
                county.growth || 0
            );

            if (mapFilter === "high-revenue") {
                return (
                    maxRevenue > 0 &&
                    revenue >=
                        maxRevenue * 0.25
                );
            }

            if (mapFilter === "high-orders") {
                return (
                    maxOrders > 0 &&
                    orders >=
                        maxOrders * 0.25
                );
            }

            if (mapFilter === "new-customers") {
                return (
                    Number(
                        county.newCustomers ||
                            0
                    ) > 0
                );
            }

            if (mapFilter === "repeat-customers") {
                return (
                    Number(
                        county.repeatCustomers ||
                            0
                    ) > 0
                );
            }

            if (
                mapFilter ===
                "pending-deliveries"
            ) {
                return (
                    Number(
                        county.pendingDeliveries ||
                            0
                    ) > 0
                );
            }

            if (growth < -100) {
                return false;
            }

            return true;
        });

    return (
        <div className="geo-analytics">
            {/* PAGE HEADER */}

            <div className="geo-page-header">
                <div>
                    <div className="geo-title-line">
                        <span className="geo-live-pill">
                            <span />
                            LIVE
                        </span>

                        <span className="geo-data-status">
                            Geographic intelligence
                        </span>
                    </div>

                    <h2>
                        Geographic Analytics
                    </h2>

                    <p>
                        Understand where Tile Revive
                        customers are buying.
                    </p>
                </div>

                <div className="geo-header-actions">
                    <div className="geo-range-selector">
                        {[
                            "Today",
                            "7 Days",
                            "30 Days",
                            "3 Months",
                            "12 Months",
                            "Custom",
                        ].map((item) => (
                            <button
                                type="button"
                                key={item}
                                className={
                                    range === item
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setRange(item)
                                }
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    <div className="geo-action-buttons">
                        <button
                            type="button"
                            onClick={onRefresh}
                            className="geo-action secondary"
                        >
                            ↻ Refresh
                        </button>

                        <button
                            type="button"
                            onClick={onExport}
                            className="geo-action secondary"
                        >
                            ⇩ Export
                        </button>

                        <button
                            type="button"
                            onClick={onExport}
                            className="geo-action"
                        >
                            PDF
                        </button>

                        <button
                            type="button"
                            onClick={onExport}
                            className="geo-action primary"
                        >
                            CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* EXECUTIVE KPIs */}

            <div className="geo-metric-grid">
                <MetricCard
                    featured
                    icon="⌖"
                    label="TOP COUNTY"
                    value={
                        topCounty?.county || "—"
                    }
                    supporting={
                        topCounty
                            ? currency(
                                  topCounty.revenue
                              )
                            : "No revenue data"
                    }
                    trend={
                        topCounty?.growth
                    }
                />

                <MetricCard
                    icon="↗"
                    label="TOTAL ORDERS"
                    value={number(totalOrders)}
                    supporting={`${number(
                        successfulOrders
                    )} successful orders`}
                />

                <MetricCard
                    icon="◆"
                    label="TOTAL REVENUE"
                    value={compactCurrency(
                        totalRevenue
                    )}
                    supporting="From successful orders"
                />

                <MetricCard
                    icon="◎"
                    label="COUNTIES REACHED"
                    value={number(
                        countiesReached
                    )}
                    supporting="Active counties"
                />

                <MetricCard
                    icon="⌁"
                    label="GPS COVERAGE"
                    value={`${number(
                        mappedOrders
                    )}`}
                    supporting={`${gpsCoverage.toFixed(
                        1
                    )}% coordinate coverage`}
                />

                <MetricCard
                    icon="◉"
                    label="TOTAL CUSTOMERS"
                    value={number(
                        totalCustomers
                    )}
                    supporting="Recorded customers"
                />

                <MetricCard
                    icon="▣"
                    label="ACTIVE LOCATIONS"
                    value={number(
                        countiesReached
                    )}
                    supporting="Locations with activity"
                />

                <MetricCard
                    icon="◌"
                    label="AVERAGE ORDER VALUE"
                    value={currency(aov)}
                    supporting="Successful orders"
                />
            </div>

            {/* MAP + SIDE ANALYTICS */}

            <div className="geo-main-grid">
                <section className="geo-map-card">
                    <SectionHeader
                        eyebrow="TERRITORY INTELLIGENCE"
                        title="Customer geography"
                        description="Sales concentration, customer activity and GPS-mapped orders across Kenya."
                        action={
                            <div className="geo-map-status">
                                <span />
                                {number(
                                    mappedOrders
                                )} GPS mapped
                            </div>
                        }
                    />

                    <div className="geo-map-wrapper">
                        <MapContainer
                            center={KENYA_CENTER}
                            zoom={6}
                            minZoom={5}
                            maxZoom={11}
                            maxBounds={[
                                [-4.8, 33.5],
                                [5.2, 42.2],
                            ]}
                            maxBoundsViscosity={0.85}
                            scrollWheelZoom
                            zoomControl
                            style={{
                                width: "100%",
                                height: "650px",
                            }}
                        >
                            <TileLayer
                                attribution={
                                    mapMode ===
                                    "satellite"
                                        ? "&copy; Esri"
                                        : "&copy; OpenStreetMap contributors"
                                }
                                url={
                                    mapMode ===
                                    "satellite"
                                        ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                        : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                }
                            />

                            <MapResetControl />
                            <FullscreenControl />

                            {filteredMapCounties
                                .filter(
                                    (county) =>
                                        county.latitude !==
                                            null &&
                                        county.longitude !==
                                            null &&
                                        county.county !==
                                            "Unknown"
                                )
                                .map(
                                    (county) => (
                                        <CircleMarker
                                            key={
                                                county.county
                                            }
                                            center={[
                                                Number(
                                                    county.latitude
                                                ),
                                                Number(
                                                    county.longitude
                                                ),
                                            ]}
                                            radius={getMarkerRadius(
                                                county.orders,
                                                maxOrders
                                            )}
                                            pathOptions={{
                                                color:
                                                    "#32e875",
                                                weight: 1.5,
                                                fillColor:
                                                    "#19c9c0",
                                                fillOpacity:
                                                    getMarkerOpacity(
                                                        county.revenue,
                                                        maxRevenue
                                                    ),
                                            }}
                                            eventHandlers={{
                                                click: () =>
                                                    setSelectedCounty(
                                                        county
                                                    ),
                                            }}
                                        >
                                            <Popup>
                                                <div className="geo-popup">
                                                    <span className="geo-popup-eyebrow">
                                                        LOCATION
                                                    </span>

                                                    <strong>
                                                        {
                                                            county.county
                                                        }
                                                    </strong>

                                                    <div className="geo-popup-revenue">
                                                        {currency(
                                                            county.revenue
                                                        )}
                                                    </div>

                                                    <div className="geo-popup-grid">
                                                        <div>
                                                            <span>
                                                                ORDERS
                                                            </span>
                                                            <strong>
                                                                {number(
                                                                    county.orders
                                                                )}
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>
                                                                CUSTOMERS
                                                            </span>
                                                            <strong>
                                                                {number(
                                                                    county.customers
                                                                )}
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>
                                                                AOV
                                                            </span>
                                                            <strong>
                                                                {currency(
                                                                    Number(
                                                                        county.orders ||
                                                                            0
                                                                    ) >
                                                                        0
                                                                        ? Number(
                                                                              county.revenue ||
                                                                                  0
                                                                          ) /
                                                                              Number(
                                                                                  county.orders
                                                                              )
                                                                        : 0
                                                                )}
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>
                                                                TOP PRODUCT
                                                            </span>
                                                            <strong>
                                                                {county.topProduct ||
                                                                    "—"}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </CircleMarker>
                                    )
                                )}
                        </MapContainer>

                        <div className="geo-map-toolbar">
                            <div className="geo-map-switch">
                                <button
                                    type="button"
                                    className={
                                        mapMode ===
                                        "map"
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() =>
                                        setMapMode(
                                            "map"
                                        )
                                    }
                                >
                                    MAP
                                </button>

                                <button
                                    type="button"
                                    className={
                                        mapMode ===
                                        "satellite"
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() =>
                                        setMapMode(
                                            "satellite"
                                        )
                                    }
                                >
                                    SATELLITE
                                </button>
                            </div>

                            <div className="geo-map-control-row">
                                {[
                                    [
                                        "orders",
                                        "Orders",
                                    ],
                                    [
                                        "customers",
                                        "Customers",
                                    ],
                                    [
                                        "revenue",
                                        "Revenue",
                                    ],
                                    [
                                        "delivery",
                                        "Delivery",
                                    ],
                                    [
                                        "heatmap",
                                        "Heatmap",
                                    ],
                                ].map(
                                    ([value, label]) => (
                                        <button
                                            type="button"
                                            key={
                                                value
                                            }
                                            className={
                                                mapLayer ===
                                                value
                                                    ? "active"
                                                    : ""
                                            }
                                            onClick={() =>
                                                setMapLayer(
                                                    value
                                                )
                                            }
                                        >
                                            {label}
                                        </button>
                                    )
                                )}
                            </div>

                            <select
                                value={mapFilter}
                                onChange={(event) =>
                                    setMapFilter(
                                        event.target
                                            .value
                                    )
                                }
                                className="geo-map-filter"
                            >
                                <option value="all">
                                    All locations
                                </option>
                                <option value="high-revenue">
                                    High revenue
                                </option>
                                <option value="high-orders">
                                    High orders
                                </option>
                                <option value="new-customers">
                                    New customers
                                </option>
                                <option value="repeat-customers">
                                    Repeat customers
                                </option>
                                <option value="pending-deliveries">
                                    Pending deliveries
                                </option>
                            </select>
                        </div>

                        <div className="geo-map-legend">
                            <span>
                                SALES INTENSITY
                            </span>

                            <div className="geo-gradient" />

                            <div>
                                <span>LOW</span>
                                <span>HIGH</span>
                            </div>
                        </div>

                        {selectedCounty && (
                            <CountyDetailPanel
                                county={
                                    selectedCounty
                                }
                                onClose={() =>
                                    setSelectedCounty(
                                        null
                                    )
                                }
                            />
                        )}
                    </div>
                </section>

                <aside className="geo-side-stack">
                    {/* REVENUE BY COUNTY */}

                    <section className="geo-panel">
                        <SectionHeader
                            eyebrow="REVENUE"
                            title="Revenue by county"
                            description="Highest-value territories."
                            action={
                                <select
                                    value={
                                        countySort
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setCountySort(
                                            event
                                                .target
                                                .value
                                        )
                                    }
                                    className="geo-mini-select"
                                >
                                    <option value="revenue">
                                        Revenue
                                    </option>
                                    <option value="orders">
                                        Orders
                                    </option>
                                    <option value="customers">
                                        Customers
                                    </option>
                                    <option value="growth">
                                        Growth
                                    </option>
                                </select>
                            }
                        />

                        {sortedCounties.length ? (
                            <div className="geo-revenue-bars">
                                {sortedCounties
                                    .slice(
                                        0,
                                        7
                                    )
                                    .map(
                                        (
                                            county,
                                            index
                                        ) => (
                                            <button
                                                type="button"
                                                className="geo-revenue-row"
                                                key={
                                                    county.county
                                                }
                                                onClick={() =>
                                                    setSelectedCounty(
                                                        county
                                                    )
                                                }
                                            >
                                                <div className="geo-bar-label">
                                                    <span>
                                                        {
                                                            county.county
                                                        }
                                                    </span>
                                                    <strong>
                                                        {compactCurrency(
                                                            county.revenue
                                                        )}
                                                    </strong>
                                                </div>

                                                <div className="geo-bar-track">
                                                    <div
                                                        className="geo-bar-fill"
                                                        style={{
                                                            width: `${
                                                                maxRevenue
                                                                    ? Math.max(
                                                                          3,
                                                                          (Number(
                                                                              county.revenue ||
                                                                                  0
                                                                          ) /
                                                                              maxRevenue) *
                                                                              100
                                                                      )
                                                                    : 0
                                                            }%`,
                                                            animationDelay: `${
                                                                index *
                                                                60
                                                            }ms`,
                                                        }}
                                                    />
                                                </div>
                                            </button>
                                        )
                                    )}
                            </div>
                        ) : (
                            <EmptyState
                                title="No county revenue"
                                description="Revenue data will appear when geographic orders are available."
                            />
                        )}
                    </section>

                    {/* CUSTOMER DISTRIBUTION */}

                    <section className="geo-panel">
                        <SectionHeader
                            eyebrow="CUSTOMERS"
                            title="Customer distribution"
                        />

                        {customerDistribution.length ? (
                            <div className="geo-donut-wrap">
                                <ResponsiveContainer
                                    width="100%"
                                    height={220}
                                >
                                    <PieChart>
                                        <Pie
                                            data={
                                                customerDistribution
                                            }
                                            dataKey="customers"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={63}
                                            outerRadius={87}
                                            paddingAngle={3}
                                            strokeWidth={
                                                0
                                            }
                                        >
                                            {customerDistribution.map(
                                                (
                                                    item,
                                                    index
                                                ) => (
                                                    <Cell
                                                        key={
                                                            item.name
                                                        }
                                                        fill={
                                                            donutColors[
                                                                index %
                                                                    donutColors.length
                                                            ]
                                                        }
                                                    />
                                                )
                                            )}
                                        </Pie>

                                        <Tooltip
                                            formatter={(
                                                value,
                                                name
                                            ) => [
                                                number(
                                                    value
                                                ),
                                                name,
                                            ]}
                                            contentStyle={{
                                                background:
                                                    "#101010",
                                                border:
                                                    "1px solid rgba(255,255,255,.12)",
                                                borderRadius:
                                                    12,
                                                color: "#fff",
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>

                                <div className="geo-donut-center">
                                    <strong>
                                        {number(
                                            donutTotal ||
                                                totalCustomers
                                        )}
                                    </strong>
                                    <span>
                                        Customers
                                    </span>
                                </div>

                                <div className="geo-donut-legend">
                                    {customerDistribution
                                        .slice(
                                            0,
                                            5
                                        )
                                        .map(
                                            (
                                                item,
                                                index
                                            ) => (
                                                <div
                                                    key={
                                                        item.name
                                                    }
                                                >
                                                    <span>
                                                        <i
                                                            style={{
                                                                background:
                                                                    donutColors[
                                                                        index %
                                                                            donutColors.length
                                                                    ],
                                                            }}
                                                        />
                                                        {
                                                            item.name
                                                        }
                                                    </span>

                                                    <strong>
                                                        {number(
                                                            item.customers
                                                        )}
                                                    </strong>
                                                </div>
                                            )
                                        )}
                                </div>
                            </div>
                        ) : (
                            <EmptyState
                                title="No customer distribution"
                                description="Customer geography will appear here once locations are available."
                            />
                        )}
                    </section>

                    {/* DELIVERY COVERAGE */}

                    <section className="geo-panel geo-coverage-panel">
                        <SectionHeader
                            eyebrow="DELIVERY NETWORK"
                            title="Delivery coverage"
                        />

                        <div className="geo-gauge">
                            <div
                                className="geo-gauge-ring"
                                style={{
                                    "--coverage": `${Math.min(
                                        100,
                                        deliveryCoverage
                                    )}%`,
                                }}
                            >
                                <div>
                                    <strong>
                                        {deliveryCoverage.toFixed(
                                            1
                                        )}
                                        %
                                    </strong>
                                    <span>
                                        Coverage
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="geo-coverage-count">
                            <strong>
                                {number(
                                    countiesReached
                                )}
                            </strong>
                            <span>
                                counties with recorded activity
                            </span>
                        </div>

                        <div className="geo-coverage-stats">
                            <div>
                                <strong>
                                    {number(
                                        countiesReached
                                    )}
                                </strong>
                                <span>
                                    Counties
                                </span>
                            </div>

                            <div>
                                <strong>
                                    {number(
                                        mappedOrders
                                    )}
                                </strong>
                                <span>
                                    GPS Orders
                                </span>
                            </div>

                            <div>
                                <strong>
                                    {number(
                                        totalOrders
                                    )}
                                </strong>
                                <span>
                                    Orders
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="geo-full-action"
                            onClick={() =>
                                document
                                    .querySelector(
                                        ".geo-map-card"
                                    )
                                    ?.scrollIntoView({
                                        behavior:
                                            "smooth",
                                        block:
                                            "center",
                                    })
                            }
                        >
                            VIEW DELIVERY MAP
                            <span>→</span>
                        </button>
                    </section>
                </aside>
            </div>

            {/* TOP COUNTIES */}

            <section className="geo-panel geo-ranking-panel">
                <SectionHeader
                    eyebrow="ORDER VOLUME"
                    title="Top counties by orders"
                    description="Territories generating the highest order activity."
                />

                <div className="geo-ranking-list">
                    {topOrderCounties.length ? (
                        topOrderCounties.map(
                            (
                                county,
                                index
                            ) => {
                                const orderShare =
                                    totalOrders >
                                    0
                                        ? (Number(
                                              county.orders ||
                                                  0
                                          ) /
                                              totalOrders) *
                                          100
                                        : 0;

                                return (
                                    <button
                                        type="button"
                                        className="geo-ranking-row"
                                        key={
                                            county.county
                                        }
                                        onClick={() =>
                                            setSelectedCounty(
                                                county
                                            )
                                        }
                                    >
                                        <span className="geo-ranking-number">
                                            {String(
                                                index +
                                                    1
                                            ).padStart(
                                                2,
                                                "0"
                                            )}
                                        </span>

                                        <div className="geo-ranking-name">
                                            <strong>
                                                {
                                                    county.county
                                                }
                                            </strong>
                                            <span>
                                                {orderShare.toFixed(
                                                    1
                                                )}
                                                % of orders
                                            </span>
                                        </div>

                                        <div className="geo-ranking-track">
                                            <div
                                                style={{
                                                    width: `${
                                                        maxOrders
                                                            ? (Number(
                                                                  county.orders ||
                                                                      0
                                                              ) /
                                                                  maxOrders) *
                                                              100
                                                            : 0
                                                    }%`,
                                                }}
                                            />
                                        </div>

                                        <strong className="geo-ranking-value">
                                            {number(
                                                county.orders
                                            )}
                                        </strong>
                                    </button>
                                );
                            }
                        )
                    ) : (
                        <EmptyState
                            title="No order geography"
                            description="Order ranking will populate from the database."
                        />
                    )}
                </div>
            </section>

            {/* REVENUE TREND */}

            <section className="geo-panel geo-trend-panel">
                <SectionHeader
                    eyebrow="TIME SERIES"
                    title="Revenue trend by region"
                    description="Track geographic revenue performance over time."
                    action={
                        <div className="geo-chart-controls">
                            {[
                                "7 Days",
                                "30 Days",
                                "3 Months",
                                "6 Months",
                                "12 Months",
                            ].map(
                                (item) => (
                                    <button
                                        type="button"
                                        key={
                                            item
                                        }
                                        className={
                                            trendRange ===
                                            item
                                                ? "active"
                                                : ""
                                        }
                                        onClick={() =>
                                            setTrendRange(
                                                item
                                            )
                                        }
                                    >
                                        {item}
                                    </button>
                                )
                            )}

                            <select
                                value={region}
                                onChange={(
                                    event
                                ) =>
                                    setRegion(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className="geo-mini-select"
                            >
                                <option>
                                    All Counties
                                </option>

                                {counties
                                    .slice(
                                        0,
                                        8
                                    )
                                    .map(
                                        (
                                            county
                                        ) => (
                                            <option
                                                key={
                                                    county.county
                                                }
                                            >
                                                {
                                                    county.county
                                                }
                                            </option>
                                        )
                                    )}
                            </select>
                        </div>
                    }
                />

                <div className="geo-chart-area">
                    {revenueChartData.length ? (
                        <ResponsiveContainer
                            width="100%"
                            height={340}
                        >
                            <AreaChart
                                data={
                                    revenueChartData
                                }
                            >
                                <defs>
                                    <linearGradient
                                        id="geoRevenueGradient"
                                        x1="0"
                                        y1="0"
                                        x2="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="0%"
                                            stopColor="#32e875"
                                            stopOpacity={
                                                0.3
                                            }
                                        />
                                        <stop
                                            offset="100%"
                                            stopColor="#32e875"
                                            stopOpacity={
                                                0
                                            }
                                        />
                                    </linearGradient>
                                </defs>

                                <CartesianGrid
                                    stroke="rgba(255,255,255,.06)"
                                    vertical={false}
                                />

                                <XAxis
                                    dataKey="date"
                                    stroke="#666"
                                    tickLine={
                                        false
                                    }
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#666"
                                    tickLine={
                                        false
                                    }
                                    axisLine={
                                        false
                                    }
                                    tickFormatter={(
                                        value
                                    ) =>
                                        compactCurrency(
                                            value
                                        )
                                    }
                                />

                                <Tooltip
                                    contentStyle={{
                                        background:
                                            "#0d0d0d",
                                        border:
                                            "1px solid rgba(255,255,255,.12)",
                                        borderRadius:
                                            12,
                                    }}
                                    formatter={(
                                        value
                                    ) =>
                                        currency(
                                            value
                                        )
                                    }
                                />

                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#32e875"
                                    strokeWidth={
                                        2.5
                                    }
                                    fill="url(#geoRevenueGradient)"
                                />

                                <Line
                                    type="monotone"
                                    dataKey="orders"
                                    stroke="#20c9c3"
                                    strokeWidth={
                                        1.5
                                    }
                                    dot={false}
                                    yAxisId={
                                        0
                                    }
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyState
                            title="Revenue trend unavailable"
                            description="The current geographic API does not expose time-series revenue yet. No artificial values are displayed."
                        />
                    )}
                </div>
            </section>

            {/* COUNTY TABLE */}

            <section className="geo-panel geo-table-panel">
                <SectionHeader
                    eyebrow="BUSINESS INTELLIGENCE"
                    title="County performance summary"
                    description="A detailed view of geographic commercial performance."
                    action={
                        <button
                            type="button"
                            className="geo-action secondary"
                            onClick={onExport}
                        >
                            ⇩ Export
                        </button>
                    }
                />

                <div className="geo-table-toolbar">
                    <div className="geo-search">
                        <span>⌕</span>
                        <input
                            value={
                                countySearch
                            }
                            onChange={(
                                event
                            ) => {
                                setCountySearch(
                                    event
                                        .target
                                        .value
                                );
                                setTablePage(
                                    1
                                );
                            }}
                            placeholder="Search counties..."
                        />
                    </div>

                    <select
                        value={countySort}
                        onChange={(
                            event
                        ) =>
                            setCountySort(
                                event
                                    .target
                                    .value
                            )
                        }
                        className="geo-mini-select"
                    >
                        <option value="revenue">
                            Sort: Revenue
                        </option>
                        <option value="orders">
                            Sort: Orders
                        </option>
                        <option value="customers">
                            Sort: Customers
                        </option>
                        <option value="growth">
                            Sort: Growth
                        </option>
                    </select>
                </div>

                <div className="geo-table-scroll">
                    <table className="geo-data-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>COUNTY</th>
                                <th>ORDERS</th>
                                <th>CUSTOMERS</th>
                                <th>REVENUE</th>
                                <th>AOV</th>
                                <th>REPEAT</th>
                                <th>GROWTH</th>
                                <th>TOP PRODUCT</th>
                                <th>PERFORMANCE</th>
                            </tr>
                        </thead>

                        <tbody>
                            {paginatedCounties.map(
                                (
                                    county,
                                    index
                                ) => {
                                    const orders =
                                        Number(
                                            county.orders ||
                                                0
                                        );

                                    const revenue =
                                        Number(
                                            county.revenue ||
                                                0
                                        );

                                    const countyAov =
                                        orders >
                                        0
                                            ? revenue /
                                              orders
                                            : 0;

                                    return (
                                        <tr
                                            key={
                                                county.county
                                            }
                                            onClick={() =>
                                                setSelectedCounty(
                                                    county
                                                )
                                            }
                                        >
                                            <td>
                                                <span className="geo-table-rank">
                                                    {String(
                                                        (tablePage -
                                                            1) *
                                                            pageSize +
                                                            index +
                                                            1
                                                    ).padStart(
                                                        2,
                                                        "0"
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <strong>
                                                    {
                                                        county.county
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {number(
                                                    orders
                                                )}
                                            </td>

                                            <td>
                                                {number(
                                                    county.customers
                                                )}
                                            </td>

                                            <td className="geo-table-money">
                                                {currency(
                                                    revenue
                                                )}
                                            </td>

                                            <td>
                                                {currency(
                                                    countyAov
                                                )}
                                            </td>

                                            <td>
                                                {county.repeatCustomers !==
                                                undefined
                                                    ? number(
                                                          county.repeatCustomers
                                                      )
                                                    : "—"}
                                            </td>

                                            <td>
                                                {county.growth !==
                                                undefined
                                                    ? `${
                                                          Number(
                                                              county.growth
                                                          ) >=
                                                          0
                                                              ? "+"
                                                              : ""
                                                      }${Number(
                                                          county.growth
                                                      ).toFixed(
                                                          1
                                                      )}%`
                                                    : "—"}
                                            </td>

                                            <td className="geo-product-cell">
                                                {
                                                    county.topProduct ||
                                                    "—"
                                                }
                                            </td>

                                            <td>
                                                <PerformanceBadge
                                                    value={performanceForCounty(
                                                        county
                                                    )}
                                                />
                                            </td>
                                        </tr>
                                    );
                                }
                            )}
                        </tbody>
                    </table>
                </div>

                {!paginatedCounties.length && (
                    <EmptyState
                        title="No counties found"
                        description="Try changing your search or wait for geographic data to become available."
                    />
                )}

                <div className="geo-pagination">
                    <span>
                        Showing{" "}
                        {paginatedCounties.length}{" "}
                        of{" "}
                        {sortedCounties.length}
                    </span>

                    <div>
                        <button
                            type="button"
                            disabled={
                                tablePage <= 1
                            }
                            onClick={() =>
                                setTablePage(
                                    (page) =>
                                        Math.max(
                                            1,
                                            page -
                                                1
                                        )
                                )
                            }
                        >
                            ←
                        </button>

                        <span>
                            {tablePage} /{" "}
                            {totalPages}
                        </span>

                        <button
                            type="button"
                            disabled={
                                tablePage >=
                                totalPages
                            }
                            onClick={() =>
                                setTablePage(
                                    (page) =>
                                        Math.min(
                                            totalPages,
                                            page +
                                                1
                                        )
                                )
                            }
                        >
                            →
                        </button>
                    </div>
                </div>
            </section>

            {/* INSIGHTS + TOP LOCATIONS */}

            <div className="geo-bottom-grid">
                <section className="geo-panel">
                    <SectionHeader
                        eyebrow="DECISION SUPPORT"
                        title="Geographic insights"
                        description="Automatically derived from available geographic performance data."
                    />

                    <div className="geo-insights">
                        {insights.map(
                            (
                                insight,
                                index
                            ) => (
                                <div
                                    className={`geo-insight ${String(
                                        insight.category
                                    ).toLowerCase()}`}
                                    key={`${insight.category}-${index}`}
                                >
                                    <div className="geo-insight-icon">
                                        {insight.category ===
                                        "OPPORTUNITY"
                                            ? "↗"
                                            : insight.category ===
                                              "WARNING"
                                            ? "!"
                                            : insight.category ===
                                              "CRITICAL"
                                            ? "×"
                                            : "◆"}
                                    </div>

                                    <div>
                                        <span>
                                            {
                                                insight.category
                                            }
                                        </span>

                                        <strong>
                                            {
                                                insight.title
                                            }
                                        </strong>

                                        <p>
                                            {
                                                insight.text
                                            }
                                        </p>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                </section>

                <section className="geo-panel">
                    <SectionHeader
                        eyebrow="LOCATION LEADERS"
                        title="Top locations"
                        description="The strongest geographic signals in the current dataset."
                    />

                    <div className="geo-location-cards">
                        <div>
                            <span>
                                TOP CUSTOMER LOCATION
                            </span>
                            <strong>
                                {
                                    customerLocation?.county ||
                                    "—"
                                }
                            </strong>
                            <small>
                                {number(
                                    customerLocation?.customers
                                )}{" "}
                                customers
                            </small>
                        </div>

                        <div>
                            <span>
                                HIGHEST REVENUE
                            </span>
                            <strong>
                                {
                                    highestRevenueLocation?.county ||
                                    "—"
                                }
                            </strong>
                            <small>
                                {highestRevenueLocation
                                    ? currency(
                                          highestRevenueLocation.revenue
                                      )
                                    : "—"}
                            </small>
                        </div>

                        <div>
                            <span>
                                MOST ORDERS
                            </span>
                            <strong>
                                {
                                    mostOrdersLocation?.county ||
                                    "—"
                                }
                            </strong>
                            <small>
                                {number(
                                    mostOrdersLocation?.orders
                                )}{" "}
                                orders
                            </small>
                        </div>

                        <div>
                            <span>
                                FASTEST GROWING
                            </span>
                            <strong>
                                {
                                    fastestGrowingLocation?.county ||
                                    "—"
                                }
                            </strong>
                            <small>
                                {fastestGrowingLocation?.growth !==
                                undefined
                                    ? `+${Number(
                                          fastestGrowingLocation.growth
                                      ).toFixed(
                                          1
                                      )}%`
                                    : "Growth unavailable"}
                            </small>
                        </div>

                        <div>
                            <span>
                                MOST REPEAT CUSTOMERS
                            </span>
                            <strong>
                                {
                                    repeatLocation?.county ||
                                    "—"
                                }
                            </strong>
                            <small>
                                {repeatLocation?.repeatCustomers !==
                                undefined
                                    ? `${number(
                                          repeatLocation.repeatCustomers
                                      )} repeat`
                                    : "Data unavailable"}
                            </small>
                        </div>
                    </div>
                </section>
            </div>

            {/* HEATMAP MODE */}

            <section className="geo-panel geo-heatmap-panel">
                <div className="geo-heatmap-header">
                    <div>
                        <span className="geo-eyebrow">
                            GEOGRAPHIC HEATMAP
                        </span>

                        <h3>
                            Geographic intensity
                        </h3>

                        <p>
                            Switch the analytical signal used to interpret geographic concentration.
                        </p>
                    </div>

                    <div className="geo-heat-buttons">
                        {[
                            [
                                "orders",
                                "Orders",
                            ],
                            [
                                "revenue",
                                "Revenue",
                            ],
                            [
                                "customers",
                                "Customers",
                            ],
                        ].map(
                            ([value, label]) => (
                                <button
                                    type="button"
                                    key={
                                        value
                                    }
                                    className={
                                        heatmapMode ===
                                        value
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() =>
                                        setHeatmapMode(
                                            value
                                        )
                                    }
                                >
                                    {label}
                                </button>
                            )
                        )}
                    </div>
                </div>

                <div className="geo-heat-strip">
                    <span>LOW</span>

                    <div />

                    <span>HIGH</span>
                </div>

                <div className="geo-heat-summary">
                    <span>
                        Current mode:
                    </span>

                    <strong>
                        {heatmapMode
                            .charAt(0)
                            .toUpperCase() +
                            heatmapMode.slice(
                                1
                            )}
                    </strong>

                    <span>
                        · Based on available database geography
                    </span>
                </div>
            </section>
        </div>
    );
}


