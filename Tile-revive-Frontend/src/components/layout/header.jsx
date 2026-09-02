import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useCart } from "../../context/CartContext";

function Header() {
    const [search, setSearch] = useState("");
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    const { cartCount } = useCart();

    /*
     * Change this to false when there are no active deals.
     */
    const hasDeals = true;

    const navigationItems = [
        {
            label: "HOME",
            path: "/",
        },
        {
            label: "SHOP PRODUCTS",
            path: "/shop",
        },
        {
            label: "BLOGS",
            path: "/blogs",
        },
        {
            label: "REVIEWS",
            path: "/reviews",
        },
        {
            label: "GALLERY",
            path: "/gallery",
        },

        ...(hasDeals
            ? [
                  {
                      label: "DEALS",
                      path: "/deals",
                  },
              ]
            : []),
    ];

    const handleSearch = (event) => {
        event.preventDefault();

        const value = search.trim();

        if (!value) {
            return;
        }

        console.log("Searching for:", value);

        /*
         * Later we can connect this directly to
         * your Shop products search.
         */
    };

    const closeMobileNavigation = () => {
        setMobileNavOpen(false);
    };

    return (
        <header className="site-header">

            {/* =====================================================
                MAIN HEADER
            ====================================================== */}

            <div className="container header-main">

                {/* =================================================
                    LOGO
                ================================================== */}

                <NavLink
                    to="/"
                    className="brand"
                    onClick={closeMobileNavigation}
                    aria-label="Tile Revive Home"
                >
                    <div className="brand-mark">
                        TR
                    </div>

                    <div className="brand-text">
                        <strong>Tile Revive</strong>

                        <span>
                            Clean. Shine. Revive.
                        </span>
                    </div>
                </NavLink>


                {/* =================================================
                    SEARCH
                ================================================== */}

                <form
                    className="search-form"
                    onSubmit={handleSearch}
                    role="search"
                >
                    <input
                        id="site-search"
                        name="search"
                        type="search"
                        placeholder="Search for products..."
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        aria-label="Search products"
                        autoComplete="off"
                    />

                    <button
                        type="submit"
                        className="search-button"
                        aria-label="Search products"
                    >
                        🔍
                    </button>
                </form>


                {/* =================================================
                    ACTIONS
                ================================================== */}

                <div className="header-actions">

                    {/* ACCOUNT */}

                    <NavLink
                        to="/account"
                        className="header-action"
                        onClick={closeMobileNavigation}
                    >
                        <span
                            className="action-icon"
                            aria-hidden="true"
                        >
                            👤
                        </span>

                        <span className="action-label">
                            Account
                        </span>
                    </NavLink>


                    {/* CART */}

                    <NavLink
                        to="/cart"
                        className="header-action cart-action"
                        onClick={closeMobileNavigation}
                    >
                        <span
                            className="action-icon"
                            aria-hidden="true"
                        >
                            🛒
                        </span>

                        <span className="action-label">
                            Cart
                        </span>

                        <span
                            className="cart-count"
                            aria-label={`${cartCount} items in cart`}
                        >
                            {cartCount}
                        </span>
                    </NavLink>


                    {/* MOBILE MENU BUTTON */}

                    <button
                        type="button"
                        className={`mobile-nav-button ${
                            mobileNavOpen ? "open" : ""
                        }`}
                        onClick={() =>
                            setMobileNavOpen(
                                !mobileNavOpen
                            )
                        }
                        aria-label={
                            mobileNavOpen
                                ? "Close navigation"
                                : "Open navigation"
                        }
                        aria-expanded={mobileNavOpen}
                        aria-controls="mobile-category-navigation"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>

                </div>

            </div>


            {/* =====================================================
                DESKTOP LOWER NAVIGATION
            ====================================================== */}

            <nav
                className="category-nav"
                aria-label="Main navigation"
            >
                <div className="container category-nav-inner">

                    {navigationItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.path}
                            end={item.path === "/"}
                            className={({ isActive }) =>
                                `category-nav-link ${
                                    isActive
                                        ? "active"
                                        : ""
                                } ${
                                    item.label === "DEALS"
                                        ? "deals-link"
                                        : ""
                                }`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}

                </div>
            </nav>


            {/* =====================================================
                MOBILE LOWER NAVIGATION
            ====================================================== */}

            <div
                id="mobile-category-navigation"
                className={`mobile-category-nav ${
                    mobileNavOpen ? "show" : ""
                }`}
            >
                <div className="mobile-category-nav-inner">

                    {navigationItems.map((item) => (
                        <NavLink
                            key={item.label}
                            to={item.path}
                            end={item.path === "/"}
                            className={({ isActive }) =>
                                `mobile-category-link ${
                                    isActive
                                        ? "active"
                                        : ""
                                } ${
                                    item.label === "DEALS"
                                        ? "deals-link"
                                        : ""
                                }`
                            }
                            onClick={
                                closeMobileNavigation
                            }
                        >
                            <span>
                                {item.label}
                            </span>

                            <span
                                className="mobile-nav-arrow"
                                aria-hidden="true"
                            >
                                →
                            </span>
                        </NavLink>
                    ))}

                </div>
            </div>

        </header>
    );
}

export default Header;