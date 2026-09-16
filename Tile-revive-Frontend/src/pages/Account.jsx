import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Account.css";

const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");

function Account() {
    const navigate = useNavigate();
    const [mode, setMode] = useState("welcome");
    const [step, setStep] = useState("details");

    const [fullName, setFullName] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [code, setCode] = useState("");

    const [newsletter, setNewsletter] = useState({
        emailMarketingOptIn: true,
        offerUpdates: true,
        flashSaleAlerts: true,
        productUpdates: true,
        cleaningTips: false
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [user, setUser] = useState(() => {
        try {
            const saved =
                localStorage.getItem("customer");

            return saved
                ? JSON.parse(saved)
                : null;
        } catch {
            return null;
        }
    });


    const clearMessages = () => {
        setError("");
        setSuccess("");
    };


    const resetForm = () => {
        setFullName("");
        setPhoneNumber("");
        setEmail("");
        setPassword("");
        setCode("");

        setNewsletter({
            emailMarketingOptIn: true,
            offerUpdates: true,
            flashSaleAlerts: true,
            productUpdates: true,
            cleaningTips: false
        });

        setStep("details");
        clearMessages();
    };


    const openSignIn = () => {
        resetForm();
        setMode("signin");
    };


    const openCreateAccount = () => {
        resetForm();
        setMode("create");
    };


    const returnToWelcome = () => {
        resetForm();
        setMode("welcome");
    };


    const request = async (endpoint, body) => {
        const response = await fetch(
            `${API_URL}${endpoint}`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(body)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message ||
                "Something went wrong."
            );
        }

        return data;
    };


    // =====================================================
    // UPDATE CUSTOMER PHONE
    // =====================================================

    const handleUpdatePhone = async (event) => {
        event.preventDefault();

        clearMessages();

        const cleanPhone = phoneNumber.trim();

        if (!cleanPhone) {
            setError("Please enter your phone number.");
            return;
        }

        const token =
            localStorage.getItem("customerAccessToken");

        if (!token) {
            setError("Please sign in again to update your phone number.");
            return;
        }

        try {
            setLoading(true);

            const response = await fetch(
                `${API_URL}/api/customer-auth/profile/phone`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        phoneNumber: cleanPhone
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to update phone number."
                );
            }

            const updatedUser = {
                ...user,
                ...data.customer
            };

            setUser(updatedUser);

            localStorage.setItem(
                "customer",
                JSON.stringify(updatedUser)
            );

            setSuccess(
                "Phone number updated successfully."
            );

            setPhoneNumber("");

        } catch (error) {
            setError(
                error.message ||
                "Unable to update phone number."
            );
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // CREATE ACCOUNT
    // =====================================================

    const handleCreateAccount = async (event) => {
        event.preventDefault();

        clearMessages();

        const cleanName =
            fullName.trim();

        const cleanPhone =
            phoneNumber.trim();

        const cleanEmail =
            email.trim().toLowerCase();


        if (!cleanName) {
            setError(
                "Please enter your full name."
            );
            return;
        }


        if (!cleanPhone) {
            setError(
                "Please enter your phone number."
            );
            return;
        }


        if (
            !cleanEmail ||
            !cleanEmail.includes("@")
        ) {
            setError(
                "Please enter a valid email address."
            );
            return;
        }


        if (password.length < 8) {
            setError(
                "Password must be at least 8 characters."
            );
            return;
        }


        try {

            setLoading(true);

            const result =
                await request(
                    "/api/auth/register",
                    {
                        fullName: cleanName,
                        phoneNumber: cleanPhone,
                        email: cleanEmail,
                        password,

                        ...newsletter
                    }
                );


            setEmail(cleanEmail);

            setSuccess(
                result.message ||
                "Account created. Check your email for your verification code."
            );

            setStep("verify-register");

        } catch (err) {

            console.error(
                "CREATE ACCOUNT ERROR:",
                err
            );

            setError(
                err.message ||
                "Unable to create your account."
            );

        } finally {
            setLoading(false);
        }
    };


    // =====================================================
    // VERIFY REGISTRATION
    // =====================================================

    const handleVerifyRegistration =
        async (event) => {

            event.preventDefault();

            clearMessages();

            if (code.length !== 6) {
                setError(
                    "Enter the 6-digit verification code."
                );
                return;
            }


            try {

                setLoading(true);

                await request(
                    "/api/auth/verify-email",
                    {
                        email:
                            email.trim().toLowerCase(),

                        code:
                            code.trim()
                    }
                );


                setSuccess(
                    "Email verified successfully. You can now sign in."
                );


                setTimeout(() => {
                    resetForm();
                    setMode("signin");
                }, 1200);

            } catch (err) {

                console.error(
                    "VERIFICATION ERROR:",
                    err
                );

                setError(
                    err.message ||
                    "Unable to verify your account."
                );

            } finally {
                setLoading(false);
            }
        };


    // =====================================================
    // SIGN IN
    // =====================================================

    const handleSignIn = async (event) => {

        event.preventDefault();

        clearMessages();

        const cleanEmail =
            email.trim().toLowerCase();


        if (
            !cleanEmail ||
            !cleanEmail.includes("@")
        ) {
            setError(
                "Please enter a valid email address."
            );
            return;
        }


        if (!password) {
            setError(
                "Please enter your password."
            );
            return;
        }


        try {

            setLoading(true);

            const result =
                await request(
                    "/api/auth/login",
                    {
                        email: cleanEmail,
                        password
                    }
                );


            if (result.customerAccessToken) {
                localStorage.setItem(
                    "customerAccessToken",
                    result.customerAccessToken
                );
            }


            if (result.refreshToken) {
                if (rememberMe) {
                    localStorage.setItem(
                        "customerRefreshToken",
                        result.refreshToken
                    );
                    sessionStorage.removeItem(
                        "customerRefreshToken"
                    );
                } else {
                    sessionStorage.setItem(
                        "customerRefreshToken",
                        result.refreshToken
                    );
                    localStorage.removeItem(
                        "customerRefreshToken"
                    );
                }
            }


            if (result.user) {

                localStorage.setItem(
                    "customer",
                    JSON.stringify(result.user)
                );

                setUser(result.user);
            }


            setSuccess(
                "Welcome back!"
            );

            setMode("account");

        } catch (err) {

            console.error(
                "SIGN IN ERROR:",
                err
            );

            setError(
                err.message ||
                "Unable to sign in."
            );

        } finally {
            setLoading(false);
        }
    };


    // =====================================================
    // LOGOUT
    // =====================================================

    const handleLogout = () => {

        localStorage.removeItem(
            "customerAccessToken"
        );

        localStorage.removeItem(
            "customerRefreshToken"
        );

        localStorage.removeItem(
            "customer"
        );

        setUser(null);

        resetForm();

        setMode("welcome");
    };


    // =====================================================
    // WELCOME
    // =====================================================

    if (mode === "welcome") {
        return (
            <main className="account-page">
                <div className="account-shell">

                    <section className="account-hero">

                        <div className="account-brand-mark">
                            TR
                        </div>

                        <span className="account-eyebrow">
                            TILE REVIVE ACCOUNT
                        </span>

                        <h1>
                            Welcome to Tile Revive
                        </h1>

                        <p>
                            Sign in to manage your orders,
                            or create an account for faster
                            checkout.
                        </p>

                        <div className="account-choice-grid">

                            <button
                                type="button"
                                className="account-choice account-choice-primary"
                                onClick={openSignIn}
                            >
                                <span className="account-choice-icon">
                                    →
                                </span>

                                <span>
                                    <strong>
                                        Sign In
                                    </strong>

                                    <small>
                                        Access your account
                                    </small>
                                </span>

                                <span className="account-choice-arrow">
                                    →
                                </span>
                            </button>


                            <button
                                type="button"
                                className="account-choice"
                                onClick={openCreateAccount}
                            >
                                <span className="account-choice-icon">
                                    +
                                </span>

                                <span>
                                    <strong>
                                        Create Account
                                    </strong>

                                    <small>
                                        Join Tile Revive
                                    </small>
                                </span>

                                <span className="account-choice-arrow">
                                    →
                                </span>
                            </button>

                        </div>

                        <div className="account-trust-row">
                            <span>
                                ✓ Secure account
                            </span>

                            <span>
                                ✓ Email verification
                            </span>

                            <span>
                                ✓ Easy checkout
                            </span>
                        </div>

                    </section>

                </div>
            </main>
        );
    }


    // =====================================================
    // UPDATE PHONE
    // =====================================================

    if (mode === "update-phone") {
        return (
            <main className="account-page">

                <div className="account-shell">

                    <section className="account-dashboard">

                        <div className="account-dashboard-top">

                            <div>
                                <span className="account-eyebrow">
                                    ACCOUNT SETTINGS
                                </span>

                                <h1>
                                    Update your phone
                                </h1>

                                <p>
                                    Keep your Tile Revive contact number up to date.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="account-logout"
                                onClick={() => {
                                    clearMessages();
                                    setPhoneNumber("");
                                    setMode("account");
                                }}
                            >
                                Back to Account
                            </button>

                        </div>


                        <form
                            className="account-settings-form"
                            onSubmit={handleUpdatePhone}
                        >

                            <div className="account-form-group">

                                <label htmlFor="account-phone">
                                    Phone number
                                </label>

                                <input
                                    id="account-phone"
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(event) =>
                                        setPhoneNumber(event.target.value)
                                    }
                                    placeholder="07XXXXXXXX"
                                    autoComplete="tel"
                                    disabled={loading}
                                />

                                <span>
                                    Enter your Kenyan mobile number.
                                </span>

                            </div>


                            {error && (
                                <div className="account-message account-message-error">
                                    {error}
                                </div>
                            )}


                            {success && (
                                <div className="account-message account-message-success">
                                    {success}
                                </div>
                            )}


                            <button
                                type="submit"
                                className="account-settings-submit"
                                disabled={loading}
                            >
                                {loading
                                    ? "Updating..."
                                    : "Save Phone Number"}
                            </button>

                        </form>

                    </section>

                </div>

            </main>
        );
    }

    // =====================================================
    // ACCOUNT DASHBOARD
    // =====================================================

    if (mode === "account") {
        return (
            <main className="account-page">

                <div className="account-shell">

                    <section className="account-dashboard">

                        <div className="account-dashboard-top">

                            <div>

                                <span className="account-eyebrow">
                                    MY ACCOUNT
                                </span>

                                <h1>
                                    Welcome back
                                    {user?.fullName
                                        ? `, ${user.fullName.split(" ")[0]}`
                                        : ""}
                                </h1>

                                <p>
                                    Manage your Tile Revive account.
                                </p>

                            </div>


                            <button
                                type="button"
                                className="account-logout"
                                onClick={handleLogout}
                            >
                                Sign Out
                            </button>

                        </div>


                        <div className="account-dashboard-grid">

                            <div className="account-info-card">

                                <span className="account-card-icon">
                                    👤
                                </span>

                                <div>

                                    <small>
                                        ACCOUNT
                                    </small>

                                    <strong>
                                        {user?.fullName ||
                                            "Tile Revive Customer"}
                                    </strong>

                                    <span>
                                        {user?.email ||
                                            "Email verified"}
                                    </span>

                                </div>

                            </div>


                            <div className="account-info-card account-action-card">

                                <span className="account-card-icon">
                                    📱
                                </span>

                                <div>

                                    <small>
                                        PHONE
                                    </small>

                                    <strong>
                                        {user?.phoneNumber ||
                                            "Phone not available"}
                                    </strong>

                                    <span>
                                        Your customer contact number
                                    </span>

                                    <button
                                        type="button"
                                        className="account-card-action"
                                        onClick={() => setMode("update-phone")}
                                    >
                                        Update Phone
                                    </button>

                                </div>

                            </div>


                            <div className="account-info-card">

                                <span className="account-card-icon">
                                    📦
                                </span>

                                <div>

                                    <small>
                                        ORDERS
                                    </small>

                                    <strong>
                                        Your Orders
                                    </strong>

                                    <span>
                                        View your Tile Revive purchases
                                    </span>

                                </div>

                            </div>


                            <div className="account-info-card">

                                <span className="account-card-icon">
                                    🛒
                                </span>

                                <div>

                                    <small>
                                        SHOPPING
                                    </small>

                                    <strong>
                                        Continue Shopping
                                    </strong>

                                    <button type="button" className="account-card-action" onClick={() => navigate("/shop")}>
                                        Browse products →
                                    </button>

                                </div>

                            </div>


                            <div className="account-info-card">

                                <span className="account-card-icon">
                                    📧
                                </span>

                                <div>

                            <div className="account-info-card account-action-card">

                                <span className="account-card-icon">
                                    ⭐
                                </span>

                                <div>

                                    <small>
                                        REVIEWS
                                    </small>

                                    <strong>
                                        Leave a Review
                                    </strong>

                                    <span>
                                        Share your experience with Tile Revive
                                    </span>

                                    <button
                                        type="button"
                                        className="account-card-action account-review-action"
                            onClick={() => navigate("/reviews")}
                                    >
                                        Review Products →
                                    </button>

                                </div>

                            </div>


                                    <small>
                                        NEWSLETTER
                                    </small>

                                    <strong>
                                        Preferences
                                    </strong>

                                    <span>
                                        {user?.newsletter
                                            ?.emailMarketingOptIn
                                            ? "Subscribed to updates"
                                            : "Not subscribed"}
                                    </span>

                                </div>

                            </div>

                        </div>

                    </section>

                </div>

            </main>
        );
    }


    // =====================================================
    // AUTH FORM
    // =====================================================

    const isCreate =
        mode === "create";

    const isRegisterVerification =
        step === "verify-register";


    return (
        <main className="account-page">

            <div className="account-shell">

                <section className="account-auth-layout">

                    <div className="account-auth-brand">

                        <div className="account-brand-mark">
                            TR
                        </div>

                        <span className="account-eyebrow">
                            TILE REVIVE
                        </span>

                        <h1>
                            {isRegisterVerification
                                ? "Verify your account"
                                : isCreate
                                    ? "Create your account"
                                    : "Sign in to your account"}
                        </h1>

                        <p>
                            {isRegisterVerification
                                ? `Enter the 6-digit code sent to ${email}.`
                                : isCreate
                                    ? "Create your account for faster checkout and personalised Tile Revive updates."
                                    : "Welcome back. Sign in to continue shopping."}
                        </p>

                        <div className="account-benefits">
                            <span>
                                ✓ Faster checkout
                            </span>

                            <span>
                                ✓ Order information
                            </span>

                            <span>
                                ✓ Personalised offers
                            </span>
                        </div>

                    </div>


                    <div className="account-auth-card">

                        {!isRegisterVerification && (
                            <div className="account-auth-tabs">

                                <button
                                    type="button"
                                    className={
                                        mode === "signin"
                                            ? "active"
                                            : ""
                                    }
                                    onClick={openSignIn}
                                >
                                    Sign In
                                </button>


                                <button
                                    type="button"
                                    className={
                                        mode === "create"
                                            ? "active"
                                            : ""
                                    }
                                    onClick={openCreateAccount}
                                >
                                    Create Account
                                </button>

                            </div>
                        )}


                        {error && (
                            <div className="account-message account-message-error">
                                {error}
                            </div>
                        )}


                        {success && (
                            <div className="account-message account-message-success">
                                {success}
                            </div>
                        )}


                        {isRegisterVerification && (

                            <form
                                onSubmit={
                                    handleVerifyRegistration
                                }
                            >

                                <label>
                                    Verification Code
                                </label>

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    value={code}
                                    onChange={(event) =>
                                        setCode(
                                            event.target.value.replace(
                                                /\D/g,
                                                ""
                                            )
                                        )
                                    }
                                    placeholder="000000"
                                    className="account-code-input"
                                    autoFocus
                                    disabled={loading}
                                />


                                <button
                                    type="submit"
                                    className="account-submit"
                                    disabled={
                                        loading ||
                                        code.length !== 6
                                    }
                                >
                                    {loading
                                        ? "Verifying..."
                                        : "Verify Account"}
                                </button>

                            </form>
                        )}


                        {!isRegisterVerification &&
                            isCreate && (

                                <form
                                    onSubmit={
                                        handleCreateAccount
                                    }
                                >

                                    <label>
                                        Full Name
                                    </label>

                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(event) =>
                                            setFullName(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Your full name"
                                        autoComplete="name"
                                        disabled={loading}
                                    />


                                    <label>
                                        Phone Number
                                    </label>

                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(event) =>
                                            setPhoneNumber(
                                                event.target.value
                                            )
                                        }
                                        placeholder="0712 345 678"
                                        autoComplete="tel"
                                        disabled={loading}
                                    />


                                    <label>
                                        Email Address
                                    </label>

                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(event) =>
                                            setEmail(
                                                event.target.value
                                            )
                                        }
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                        disabled={loading}
                                    />


                                    <label>
                                        Password
                                    </label>

                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(event) =>
                                            setPassword(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Minimum 8 characters"
                                        autoComplete="new-password"
                                        disabled={loading}
                                    />


                                    <div className="newsletter-section">

                                        <div className="newsletter-heading">
                                            <strong>
                                                What would you like from Tile Revive?
                                            </strong>

                                            <small>
                                                Choose the updates you want to receive.
                                            </small>
                                        </div>


                                        <label className="newsletter-option">

                                            <input
                                                type="checkbox"
                                                checked={
                                                    newsletter.emailMarketingOptIn
                                                }
                                                onChange={(event) =>
                                                    setNewsletter({
                                                        ...newsletter,
                                                        emailMarketingOptIn:
                                                            event.target.checked
                                                    })
                                                }
                                            />

                                            <span>
                                                Newsletter &amp; latest news
                                            </span>

                                        </label>


                                        <label className="newsletter-option">

                                            <input
                                                type="checkbox"
                                                checked={
                                                    newsletter.flashSaleAlerts
                                                }
                                                onChange={(event) =>
                                                    setNewsletter({
                                                        ...newsletter,
                                                        flashSaleAlerts:
                                                            event.target.checked
                                                    })
                                                }
                                            />

                                            <span>
                                                Flash sales, offers &amp; deals
                                            </span>

                                        </label>


                                        <label className="newsletter-option">

                                            <input
                                                type="checkbox"
                                                checked={
                                                    newsletter.offerUpdates
                                                }
                                                onChange={(event) =>
                                                    setNewsletter({
                                                        ...newsletter,
                                                        offerUpdates:
                                                            event.target.checked
                                                    })
                                                }
                                            />

                                            <span>
                                                Special offers &amp; promotions
                                            </span>

                                        </label>


                                        <label className="newsletter-option">

                                            <input
                                                type="checkbox"
                                                checked={
                                                    newsletter.productUpdates
                                                }
                                                onChange={(event) =>
                                                    setNewsletter({
                                                        ...newsletter,
                                                        productUpdates:
                                                            event.target.checked
                                                    })
                                                }
                                            />

                                            <span>
                                                New product updates
                                            </span>

                                        </label>


                                        <label className="newsletter-option">

                                            <input
                                                type="checkbox"
                                                checked={
                                                    newsletter.cleaningTips
                                                }
                                                onChange={(event) =>
                                                    setNewsletter({
                                                        ...newsletter,
                                                        cleaningTips:
                                                            event.target.checked
                                                    })
                                                }
                                            />

                                            <span>
                                                Cleaning tips &amp; advice
                                            </span>

                                        </label>

                                    </div>


                                    <label className="remember-me">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(event) =>
                                                setRememberMe(
                                                    event.target.checked
                                                )
                                            }
                                            disabled={loading}
                                        />
                                        <span>Remember me</span>
                                    </label>

                                    <button
                                        type="submit"
                                        className="account-submit"
                                        disabled={loading}
                                    >
                                        {loading
                                            ? "Creating Account..."
                                            : "Create Account"}
                                    </button>

                                </form>
                            )}


                        {!isRegisterVerification &&
                            !isCreate && (

                                <form
                                    onSubmit={
                                        handleSignIn
                                    }
                                >

                                    <label>
                                        Email Address
                                    </label>

                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(event) =>
                                            setEmail(
                                                event.target.value
                                            )
                                        }
                                        placeholder="you@example.com"
                                        autoComplete="email"
                                        disabled={loading}
                                    />


                                    <label>
                                        Password
                                    </label>

                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(event) =>
                                            setPassword(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        disabled={loading}
                                    />


                                    <label className="remember-me">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(event) =>
                                                setRememberMe(
                                                    event.target.checked
                                                )
                                            }
                                            disabled={loading}
                                        />
                                        <span>Remember me</span>
                                    </label>

                                    <button
                                        type="submit"
                                        className="account-submit"
                                        disabled={loading}
                                    >
                                        {loading
                                            ? "Signing In..."
                                            : "Sign In"}
                                    </button>

                                </form>
                            )}


                        <button
                            type="button"
                            className="account-back"
                            onClick={
                                isRegisterVerification
                                    ? () => {
                                        setCode("");
                                        clearMessages();
                                        setStep("details");
                                    }
                                    : returnToWelcome
                            }
                            disabled={loading}
                        >
                            ← Back
                        </button>

                    </div>

                </section>

            </div>

        </main>
    );
}

export default Account;

















