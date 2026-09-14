import { useState } from "react";

import {
    requestCustomerOtp,
    verifyCustomerOtp
} from "../../services/customerAuth";

import "./customerAuth.css";

function CustomerAuth({
    onSuccess,
    onClose
}) {
    const [step, setStep] = useState("details");

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // =====================================================
    // REQUEST EMAIL OTP
    // =====================================================

    const handleRequestOtp = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        const cleanName = fullName.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanName) {
            setError("Please enter your full name.");
            return;
        }

        if (cleanName.length < 2) {
            setError("Please enter your full name.");
            return;
        }

        if (!cleanEmail) {
            setError("Please enter your email address.");
            return;
        }

        if (!cleanEmail.includes("@")) {
            setError("Please enter a valid email address.");
            return;
        }

        try {
            setLoading(true);

            await requestCustomerOtp({
                email: cleanEmail,
                fullName: cleanName
            });

            setEmail(cleanEmail);
            setFullName(cleanName);
            setCode("");

            setSuccess(
                "Verification code sent to your email."
            );

            setStep("otp");

        } catch (err) {
            console.error(
                "CUSTOMER OTP REQUEST ERROR:",
                err
            );

            setError(
                err?.message ||
                "Unable to send verification code."
            );

        } finally {
            setLoading(false);
        }
    }

    // =====================================================
    // VERIFY EMAIL OTP
    // =====================================================

    const handleVerifyOtp = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        const cleanEmail = email.trim().toLowerCase();
        const cleanCode = code.trim();

        if (cleanCode.length !== 6) {
            setError(
                "Enter the 6-digit verification code."
            );
            return;
        }

        try {
            setLoading(true);

            const result = await verifyCustomerOtp({
                email: cleanEmail,
                code: cleanCode
            });

            console.log(
                "CUSTOMER OTP VERIFICATION RESULT:",
                result
            );

            // =================================================
            // MAKE SURE BACKEND RETURNED A COMPLETE SESSION
            // =================================================

            if (!result?.accessToken) {
                throw new Error(
                    "Verification succeeded, but no customer access token was returned."
                );
            }

            if (!result?.customer) {
                throw new Error(
                    "Verification succeeded, but customer details were not returned."
                );
            }

            // =================================================
            // SAVE CUSTOMER SESSION
            // =================================================

            localStorage.setItem(
                "customerAccessToken",
                result.accessToken
            );

            localStorage.setItem(
                "customer",
                JSON.stringify(result.customer)
            );

            // =================================================
            // SUCCESS
            // =================================================

            setSuccess(
                "Account verified successfully."
            );

            // =================================================
            // CONTINUE TO ACCOUNT
            // =================================================

            setTimeout(() => {
                if (onSuccess) {
                    onSuccess(result.customer);
                }
            }, 500);

        } catch (err) {
            console.error(
                "CUSTOMER OTP VERIFICATION ERROR:",
                err
            );

            setError(
                err?.message ||
                "Incorrect verification code."
            );

        } finally {
            setLoading(false);
        }
    }

    // =====================================================
    // CHANGE EMAIL
    // =====================================================

    const goBack = () => {
        if (loading) {
            return;
        }

        setError("");
        setSuccess("");
        setCode("");

        setStep("details");
    }

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div
            className="customer-auth-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-auth-title"
        >

            <div className="customer-auth-card">

                {/* =================================================
                    CLOSE
                ================================================= */}

                <button
                    type="button"
                    className="customer-auth-close"
                    onClick={onClose}
                    disabled={loading}
                    aria-label="Close customer account"
                >
                    ×
                </button>


                {/* =================================================
                    DETAILS STEP
                ================================================= */}

                {step === "details" && (
                    <>

                        <div className="customer-auth-icon">
                            ✨
                        </div>

                        <h2 id="customer-auth-title">
                            Welcome to Tile Revive
                        </h2>

                        <p className="customer-auth-subtitle">
                            Enter your details to access your
                            Tile Revive account securely.
                        </p>


                        <form
                            onSubmit={handleRequestOtp}
                            noValidate
                        >

                            {/* FULL NAME */}

                            <label htmlFor="customer-full-name">
                                Full Name
                            </label>

                            <input
                                id="customer-full-name"
                                type="text"
                                value={fullName}
                                onChange={(event) =>
                                    setFullName(
                                        event.target.value
                                    )
                                }
                                placeholder="Enter your full name"
                                autoComplete="name"
                                disabled={loading}
                            />


                            {/* EMAIL */}

                            <label htmlFor="customer-email">
                                Email Address
                            </label>

                            <input
                                id="customer-email"
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


                            {/* ERROR */}

                            {error && (
                                <div
                                    className="customer-auth-error"
                                    role="alert"
                                >
                                    {error}
                                </div>
                            )}


                            {/* SUCCESS */}

                            {success && (
                                <div
                                    className="customer-auth-success"
                                    role="status"
                                >
                                    {success}
                                </div>
                            )}


                            {/* CONTINUE */}

                            <button
                                type="submit"
                                className="customer-auth-primary"
                                disabled={loading}
                            >
                                {loading
                                    ? "Sending Code..."
                                    : "Continue"}
                            </button>

                        </form>

                    </>
                )}


                {/* =================================================
                    OTP STEP
                ================================================= */}

                {step === "otp" && (
                    <>

                        <div className="customer-auth-icon">
                            ✉️
                        </div>

                        <h2 id="customer-auth-title">
                            Check Your Email
                        </h2>

                        <p className="customer-auth-subtitle">
                            We sent a 6-digit verification
                            code to
                        </p>

                        <strong className="customer-auth-email">
                            {email}
                        </strong>


                        <form
                            onSubmit={handleVerifyOtp}
                            noValidate
                        >

                            {/* OTP LABEL */}

                            <label htmlFor="customer-otp">
                                Verification Code
                            </label>


                            {/* OTP INPUT */}

                            <input
                                id="customer-otp"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={code}
                                onChange={(event) =>
                                    setCode(
                                        event.target.value
                                            .replace(/\D/g, "")
                                            .slice(0, 6)
                                    )
                                }
                                placeholder="000000"
                                className="customer-auth-otp"
                                autoFocus
                                disabled={loading}
                            />


                            {/* ERROR */}

                            {error && (
                                <div
                                    className="customer-auth-error"
                                    role="alert"
                                >
                                    {error}
                                </div>
                            )}


                            {/* SUCCESS */}

                            {success && (
                                <div
                                    className="customer-auth-success"
                                    role="status"
                                >
                                    {success}
                                </div>
                            )}


                            {/* VERIFY */}

                            <button
                                type="submit"
                                className="customer-auth-primary"
                                disabled={
                                    loading ||
                                    code.length !== 6
                                }
                            >
                                {loading
                                    ? "Verifying..."
                                    : "Verify & Continue"}
                            </button>

                        </form>


                        {/* CHANGE EMAIL */}

                        <button
                            type="button"
                            className="customer-auth-back"
                            onClick={goBack}
                            disabled={loading}
                        >
                            ← Change email
                        </button>

                    </>
                )}

            </div>

        </div>
    );
}

export default CustomerAuth;
