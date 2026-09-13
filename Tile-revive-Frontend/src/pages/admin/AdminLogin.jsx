import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminLogin.css";

const API_BASE_URL = "http://192.168.0.100:5000/api";

function AdminLogin() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loginSuccess, setLoginSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setLoading(true);

        try {
            const response = await fetch(
                `${API_BASE_URL}/auth/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: email.trim(),
                        password,
                    }),
                }
            );

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "Invalid email or password."
                );
            }

            if (!data.accessToken) {
                throw new Error(
                    "Login failed. The server did not return an access token."
                );
            }

            /*
             * IMPORTANT:
             * Clear any previous session before saving
             * the new admin session.
             */
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");

            localStorage.setItem(
                "accessToken",
                data.accessToken
            );

            if (data.refreshToken) {
                localStorage.setItem(
                    "refreshToken",
                    data.refreshToken
                );
            }

            /*
             * Save basic admin information when supplied
             * by the backend.
             */
            if (data.user) {
                localStorage.setItem(
                    "adminUser",
                    JSON.stringify(data.user)
                );
            }

            /*
             * Verify that the token was actually saved.
             */
            const savedToken =
                localStorage.getItem("accessToken");

            if (!savedToken) {
                throw new Error(
                    "Login succeeded but the access token could not be saved."
                );
            }

            setLoginSuccess(true);
            setLoading(false);

            /*
             * Give the success animation time to display.
             */
            setTimeout(() => {
                navigate("/admin/dashboard", {
                    replace: true,
                });
            }, 900);

        } catch (error) {
            console.error(
                "ADMIN LOGIN ERROR:",
                error
            );

            setLoading(false);

            if (
                error instanceof TypeError ||
                error.message?.includes("Failed to fetch")
            ) {
                setError(
                    "Unable to connect to the server. Make sure the backend is running on port 5000."
                );
            } else {
                setError(
                    error.message ||
                    "Unable to login. Please try again."
                );
            }
        }
    };

    return (
        <div className="admin-login-page">

            <div
                className={`admin-login-card ${
                    loginSuccess
                        ? "login-card-success"
                        : ""
                }`}
            >

                {/* ==================================================
                    HEADER
                ================================================== */}

                <div className="admin-login-header">

                    <div className="admin-logo">
                        TR
                    </div>

                    <h1>
                        Admin Login
                    </h1>

                    <p>
                        Sign in to manage Tile Revive
                    </p>

                </div>

                {/* ==================================================
                    ERROR
                ================================================== */}

                {error && (
                    <div
                        className="admin-login-error"
                        role="alert"
                    >
                        {error}
                    </div>
                )}

                {/* ==================================================
                    LOGIN FORM
                ================================================== */}

                <form onSubmit={handleSubmit}>

                    {/* EMAIL */}

                    <div className="admin-form-group">

                        <label htmlFor="email">
                            Email Address
                        </label>

                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) =>
                                setEmail(
                                    e.target.value
                                )
                            }
                            placeholder="Enter admin email"
                            autoComplete="username"
                            disabled={
                                loading ||
                                loginSuccess
                            }
                            required
                        />

                    </div>

                    {/* PASSWORD */}

                    <div className="admin-form-group">

                        <label htmlFor="password">
                            Password
                        </label>

                        <div className="password-input-wrapper">

                            <input
                                id="password"
                                type={
                                    showPassword
                                        ? "text"
                                        : "password"
                                }
                                value={password}
                                onChange={(e) =>
                                    setPassword(
                                        e.target.value
                                    )
                                }
                                placeholder="Enter password"
                                autoComplete="current-password"
                                disabled={
                                    loading ||
                                    loginSuccess
                                }
                                required
                            />

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() =>
                                    setShowPassword(
                                        (current) =>
                                            !current
                                    )
                                }
                                disabled={
                                    loading ||
                                    loginSuccess
                                }
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                                title={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                            >

                                {showPassword ? (

                                    <svg
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M3 3l18 18"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />

                                        <path
                                            d="M10.6 10.6a2 2 0 0 0 2.8 2.8"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />

                                        <path
                                            d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.5 9.5 7-.4 1-1.2 2.2-2.3 3.3M6.2 6.2C3.9 7.8 2.6 10 2.5 12c1 2.5 4.5 7 9.5 7 1 0 2-.2 2.9-.5"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>

                                ) : (

                                    <svg
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                    >
                                        <path
                                            d="M2.5 12S6 5 12 5s9.5 7 9.5 7S18 19 12 19 2.5 12 2.5 12Z"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinejoin="round"
                                        />

                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="2.5"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        />
                                    </svg>

                                )}

                            </button>

                        </div>

                    </div>

                    {/* ==================================================
                        LOGIN BUTTON
                    ================================================== */}

                    <button
                        type="submit"
                        className={`admin-login-button ${
                            loginSuccess
                                ? "login-success"
                                : ""
                        }`}
                        disabled={
                            loading ||
                            loginSuccess
                        }
                    >

                        {loginSuccess ? (

                            <>
                                <span className="success-check">
                                    ✓
                                </span>

                                Login Successful
                            </>

                        ) : loading ? (

                            <>
                                <span className="login-spinner"></span>
                                Signing in...
                            </>

                        ) : (

                            "Sign In"

                        )}

                    </button>

                </form>

                {/* ==================================================
                    BACK TO STORE
                ================================================== */}

                {!loginSuccess && (
                    <button
                        type="button"
                        className="back-to-store"
                        onClick={() =>
                            navigate("/")
                        }
                    >
                        ← Back to Store
                    </button>
                )}

            </div>

        </div>
    );
}

export default AdminLogin;

