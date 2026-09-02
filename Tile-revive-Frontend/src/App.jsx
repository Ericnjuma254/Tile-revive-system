import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { CartProvider } from "./context/CartContext";

import AnnouncementBar from "./components/layout/AnnouncementBar";
import Header from "./components/layout/header";
import Footer from "./components/layout/Footer";

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Account from "./pages/Account";
import Checkout from "./pages/Checkout";
import Gallery from "./pages/Gallery";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminOrderDetails from "./pages/admin/AdminOrderDetails";
import AdminGallery from "./pages/admin/AdminGallery";
import MobileGallery from "./pages/admin/MobileGallery";
import AdminReports from "./pages/admin/AdminReports";

import StainedTiles from "./pages/cleaning/StainedTiles";

import "./index.css";


// ============================================================
// PUBLIC / ADMIN LAYOUT
// ============================================================

function AppContent() {

    const location = useLocation();

    // Every route beginning with /admin is considered an admin route
    const isAdminRoute = location.pathname.startsWith("/admin");

    // Admin login is completely separate from the public website
    const isAdminLogin = location.pathname === "/admin/login";

    // Show public website chrome only when NOT inside admin
    const showPublicLayout = !isAdminRoute;

    return (
        <>

            {/* =====================================================
                PUBLIC WEBSITE ONLY
               ===================================================== */}

            {showPublicLayout && (
                <AnnouncementBar />
            )}

            {showPublicLayout && (
                <Header />
            )}


            {/* =====================================================
                ROUTES
               ===================================================== */}

            <Routes>

                {/* =================================================
                    CUSTOMER PAGES
                   ================================================= */}

                <Route
                    path="/"
                    element={<Home />}
                />

                <Route
                    path="/shop"
                    element={<Shop />}
                />

                <Route
                    path="/gallery"
                    element={<Gallery />}
                />

                <Route
                    path="/cart"
                    element={<Cart />}
                />

                <Route
                    path="/checkout"
                    element={<Checkout />}
                />

                <Route
                    path="/account"
                    element={<Account />}
                />

                <Route
                    path="/cleaning/stained-discoloured-tiles"
                    element={<StainedTiles />}
                />


                {/* =================================================
                    ADMIN ROOT
                   ================================================= */}

                <Route
                    path="/admin"
                    element={
                        <Navigate
                            to="/admin/dashboard"
                            replace
                        />
                    }
                />


                {/* =================================================
                    ADMIN LOGIN
                   ================================================= */}

                <Route
                    path="/admin/login"
                    element={<AdminLogin />}
                />


                {/* =================================================
                    ADMIN DASHBOARD
                   ================================================= */}

                <Route
                    path="/admin/dashboard"
                    element={<AdminDashboard />}
                />


                {/* =================================================
                    ADMIN REPORTS
                   ================================================= */}

                <Route
                    path="/admin/reports"
                    element={<AdminReports />}
                />


                {/* =================================================
                    ADMIN ORDERS
                   ================================================= */}

                <Route
                    path="/admin/orders"
                    element={<AdminOrders />}
                />


                {/* =================================================
                    ADMIN ORDER DETAILS
                   ================================================= */}

                <Route
                    path="/admin/orders/:id"
                    element={<AdminOrderDetails />}
                />


                {/* =================================================
                    ADMIN GALLERY
                   ================================================= */}

                <Route
                    path="/admin/gallery"
                    element={<AdminGallery />}
                />


                {/* =================================================
                    ADMIN MOBILE GALLERY
                   ================================================= */}

                <Route
                    path="/admin/gallery/mobile"
                    element={<MobileGallery />}
                />

            </Routes>


            {/* =====================================================
                PUBLIC FOOTER ONLY
               ===================================================== */}

            {showPublicLayout && (
                <Footer />
            )}

        </>
    );
}


// ============================================================
// MAIN APP
// ============================================================

function App() {

    return (
        <BrowserRouter>

            <CartProvider>

                <AppContent />

            </CartProvider>

        </BrowserRouter>
    );
}

export default App;

