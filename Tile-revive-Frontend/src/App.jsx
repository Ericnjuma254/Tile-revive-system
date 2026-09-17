import Reviews from "./pages/Reviews";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import { CartProvider } from "./context/CartContext";

import AnnouncementBar from "./components/layout/AnnouncementBar";
import Header from "./components/layout/header";
import Footer from "./components/layout/Footer";

import Home from "./pages/Home";
import Shop from "./pages/Shop";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Account from "./pages/Account";
import Checkout from "./pages/Checkout";
import Gallery from "./pages/Gallery";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminOrderDetails from "./pages/admin/AdminOrderDetails";
import AdminGallery from "./pages/admin/AdminGallery";
import MobileGallery from "./pages/admin/MobileGallery";
import AdminReports from "./pages/admin/AdminReports";
import AdminExpenditure from "./pages/admin/AdminExpenditure";
import AdminCustomers from "./pages/admin/AdminCustomers";
import AdminOffers from "./pages/admin/AdminOffers";
import AdminCreateOrder from "./pages/admin/AdminCreateOrder";

import StainedTiles from "./pages/cleaning/StainedTiles";

import "./index.css";
import "./App.css";


// ============================================================
// PUBLIC / ADMIN LAYOUT
// ============================================================

function AppContent() {

    const location = useLocation();

    const isAdminRoute = location.pathname.startsWith("/admin");

    const isAdminLogin = location.pathname === "/admin/login";

    const showPublicLayout = !isAdminRoute;

    return (
        <>

            {showPublicLayout && (
                <AnnouncementBar />
            )}

            {showPublicLayout && (
                <Header />
            )}

            <Routes>
        <Route path="/reviews" element={<Reviews />} />

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

                {/* =================================================
                    PRODUCT DETAILS
                   ================================================= */}

                <Route
                    path="/shop/product/:id"
                    element={<ProductDetails />}
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
                    ADMIN ROUTES
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

                <Route
                    path="/admin/login"
                    element={<AdminLogin />}
                />

                <Route element={<AdminLayout />}>
                    <Route
                        path="/admin/dashboard"
                        element={<AdminDashboard />}
                    />

                    <Route
                        path="/admin/products"
                        element={<AdminProducts />}
                    />

                    <Route
                        path="/admin/reports"
                        element={<AdminReports />}
                    />

                    <Route
                        path="/admin/expenditure"
                        element={<AdminExpenditure />}
                    />

                    <Route
                        path="/admin/customers"
                        element={<AdminCustomers />}
                    />

                    <Route
                        path="/admin/offers"
                        element={<AdminOffers />}
                    />

                    <Route
                        path="/admin/orders"
                        element={<AdminOrders />}
                    />

                    <Route
                        path="/admin/orders/create"
                        element={<AdminCreateOrder />}
                    />

                    <Route
                        path="/admin/orders/:id"
                        element={<AdminOrderDetails />}
                    />

                    <Route
                        path="/admin/gallery"
                        element={<AdminGallery />}
                    />

                    <Route
                        path="/admin/gallery/mobile"
                        element={<MobileGallery />}
                    />
                </Route>
                {/* Privacy Policy */}
                <Route
                    path="/privacy-policy"
                    element={<PrivacyPolicy />}
                />
                    <Route
                        path="/terms-of-service"
                        element={<TermsOfService />}
                    />
            </Routes>


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






















