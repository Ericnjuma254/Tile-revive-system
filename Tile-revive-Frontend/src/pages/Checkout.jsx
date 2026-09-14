import { useState } from "react";
import { useCart } from "../context/CartContext";
import { createOrder, initiateMpesaPayment } from "../services/api";

function Checkout() {
    const {
        cartItems,
        cartCount,
        cartTotal
    } = useCart();

    const [form, setForm] = useState({
        name: "",
        phone: "",
        email: "",
        county: "",
        location: ""
    });

    const [paymentMethod, setPaymentMethod] = useState("MPESA");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [mpesaPayment, setMpesaPayment] = useState(null);

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setSuccess("");
        setMpesaPayment(null);

        if (cartItems.length === 0) {
            setError("Your cart is empty.");
            return;
        }

        if (!form.name.trim()) {
            setError("Please enter your full name.");
            return;
        }

        if (!form.phone.trim()) {
            setError("Please enter your phone number.");
            return;
        }

        if (!form.email.trim()) {
            setError("Please enter your email address.");
            return;
        }

        if (!form.county.trim()) {
            setError("Please enter your county.");
            return;
        }

        if (!form.location.trim()) {
            setError("Please enter your delivery location.");
            return;
        }

        try {
            setLoading(true);

            const orderData = {
                customerName: form.name.trim(),
                customerPhone: form.phone.trim(),
                email: form.email.trim(),
                county: form.county.trim(),
                location: form.location.trim(),
                paymentMethod,

                items: cartItems.map((item) => ({
                    productId: item.id,
                    quantity: item.quantity
                }))
            };

            const result = await createOrder(orderData);

            if (!result.success) {
                throw new Error(
                    result.message || "Failed to create order."
                );
            }

            // ==================================================
            // PROCESS SELECTED PAYMENT METHOD
            // ==================================================

            if (!result.order?.id) {
                throw new Error(
                    "Order was created but no order ID was returned."
                );
            }

            const paymentResult = await initiateMpesaPayment({
                orderId: result.order.id,
                customerPhone: form.phone.trim(),
                paymentMethod
            });

            if (!paymentResult?.success) {
                throw new Error(
                    paymentResult?.message ||
                    "Unable to initialize the selected payment method."
                );
            }

            // ==================================================
            // M-PESA STK PUSH
            // ==================================================

            if (paymentMethod === "MPESA") {

                setSuccess(
                    `Order ${result.order.orderNumber} created. ` +
                    "An M-Pesa payment prompt has been sent to your phone."
                );

                setMpesaPayment({
                    orderNumber: result.order.orderNumber,
                    orderId: result.order.id,
                    amount: Number(result.order.totalAmount),
                    paybill: "522533",
                    accountNumber: "7927213",
                    checkoutRequestId:
                        paymentResult.mpesa?.CheckoutRequestID ||
                        paymentResult.mpesa?.checkoutRequestId ||
                        null,
                    merchantRequestId:
                        paymentResult.mpesa?.MerchantRequestID ||
                        paymentResult.mpesa?.merchantRequestId ||
                        null,
                    message:
                        paymentResult.message ||
                        "Check your phone and enter your M-Pesa PIN to complete payment."
                });

                return;
            }

            // ==================================================
            // CASH ON DELIVERY
            // ==================================================

            setSuccess(
                `Order ${result.order.orderNumber} placed successfully. ` +
                "Your order is confirmed for Cash on Delivery."
            );

        } catch (err) {
            console.error("Checkout failed:", err);

            setError(
                err.message ||
                "Unable to complete your order."
            );
        } finally {
            setLoading(false);
        }
    };

    // ==========================================================
    // EMPTY CART
    // ==========================================================

    if (cartItems.length === 0) {
        return (
            <main className="checkout-page">
                <section className="section">
                    <div className="container">

                        <div className="shop-state">

                            <h2>
                                Your cart is empty
                            </h2>

                            <p>
                                Add products before proceeding
                                to checkout.
                            </p>

                            <a
                                href="/shop"
                                className="btn btn-primary"
                            >
                                Continue Shopping
                            </a>

                        </div>

                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="checkout-page">

            <section className="section">

                <div className="container">

                    <div className="section-heading">

                        <span className="section-eyebrow">
                            CHECKOUT
                        </span>

                        <h1 className="section-title">
                            Complete Your Order
                        </h1>

                        <p>
                            Enter your delivery details and choose
                            your payment method.
                        </p>

                    </div>

                    <div className="checkout-layout">

                        {/* ==================================================
                            CHECKOUT FORM
                        ================================================== */}

                        <form
                            className="checkout-form"
                            onSubmit={handleSubmit}
                        >

                            <div className="checkout-card">

                                <h2>
                                    Customer Details
                                </h2>

                                {error && (
                                    <div className="checkout-error">
                                        {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="checkout-success">
                                        {success}
                                    </div>
                                )}

                                {/* NAME */}

                                <div className="form-group">

                                    <label htmlFor="name">
                                        Full Name
                                    </label>

                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="Enter your full name"
                                        required
                                    />

                                </div>

                                {/* PHONE */}

                                <div className="form-group">

                                    <label htmlFor="phone">
                                        Phone Number
                                    </label>

                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        value={form.phone}
                                        onChange={handleChange}
                                        placeholder="0712 345 678"
                                        required
                                    />

                                </div>

                                {/* EMAIL */}

                                <div className="form-group">

                                    <label htmlFor="email">
                                        Email Address
                                    </label>

                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        placeholder="you@example.com"
                                        required
                                    />

                                </div>

                                {/* COUNTY */}

                                <div className="form-group">

                                    <label htmlFor="county">
                                        County
                                    </label>

                                    <input
                                        id="county"
                                        name="county"
                                        type="text"
                                        value={form.county}
                                        onChange={handleChange}
                                        placeholder="e.g. Nairobi"
                                        required
                                    />

                                </div>

                                {/* LOCATION */}

                                <div className="form-group">

                                    <label htmlFor="location">
                                        Delivery Location
                                    </label>

                                    <textarea
                                        id="location"
                                        name="location"
                                        value={form.location}
                                        onChange={handleChange}
                                        placeholder="Estate, building, street or delivery instructions"
                                        rows="4"
                                        required
                                    />

                                </div>

                                {/* ==================================================
                                    PAYMENT METHOD
                                ================================================== */}

                                <div className="payment-method-section">

                                    <h2>
                                        Payment Method
                                    </h2>

                                    <div className="payment-options">

                                        {/* M-PESA */}

                                        <label
                                            className={
                                                `payment-option ${
                                                    paymentMethod === "MPESA"
                                                        ? "payment-option-active"
                                                        : ""
                                                }`
                                            }
                                        >

                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="MPESA"
                                                checked={
                                                    paymentMethod === "MPESA"
                                                }
                                                onChange={(event) =>
                                                    setPaymentMethod(
                                                        event.target.value
                                                    )
                                                }
                                            />

                                            <span className="payment-option-content">

                                                <strong>
                                                    M-Pesa
                                                </strong>

                                                <small>
                                                    Pay via M-Pesa PayBill
                                                    522533
                                                </small>

                                            </span>

                                        </label>

                                        {/* CASH ON DELIVERY */}

                                        <label
                                            className={
                                                `payment-option ${
                                                    paymentMethod === "COD"
                                                        ? "payment-option-active"
                                                        : ""
                                                }`
                                            }
                                        >

                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="COD"
                                                checked={
                                                    paymentMethod === "COD"
                                                }
                                                onChange={(event) =>
                                                    setPaymentMethod(
                                                        event.target.value
                                                    )
                                                }
                                            />

                                            <span className="payment-option-content">

                                                <strong>
                                                    Cash on Delivery
                                                </strong>

                                                <small>
                                                    Pay when your order
                                                    is delivered
                                                </small>

                                            </span>

                                        </label>

                                    </div>

                                </div>

{/* ==================================================
    SUBMIT BUTTON
================================================== */}

                                <button
                                    type="submit"
                                    className="btn btn-primary checkout-button"
                                    disabled={loading}
                                >

                                    {loading
                                        ? "Creating Order..."
                                        : paymentMethod === "MPESA"
                                            ? "Place Order & Pay with M-Pesa"
                                            : "Place Order - Cash on Delivery"}

                                </button>

                            </div>

                        </form>

                        {/* ==================================================
                            ORDER SUMMARY
                        ================================================== */}

                        <aside className="checkout-summary">

                            <div className="checkout-card">

                                <h2>
                                    Order Summary
                                </h2>

                                <div className="checkout-items">

                                    {cartItems.map((item) => (

                                        <div
                                            key={item.id}
                                            className="checkout-item"
                                        >

                                            <div>

                                                <strong>
                                                    {item.name}
                                                </strong>

                                                <span>
                                                    Qty: {item.quantity}
                                                </span>

                                            </div>

                                            <strong>
                                                KES{" "}
                                                {Number(
                                                    item.price *
                                                    item.quantity
                                                ).toLocaleString()}
                                            </strong>

                                        </div>

                                    ))}

                                </div>

                                <div className="checkout-summary-row">

                                    <span>
                                        Items
                                    </span>

                                    <span>
                                        {cartCount}
                                    </span>

                                </div>

                                <div className="checkout-summary-row">

                                    <span>
                                        Payment
                                    </span>

                                    <span>
                                        {paymentMethod === "MPESA"
                                            ? "M-Pesa PayBill"
                                            : "Cash on Delivery"}
                                    </span>

                                </div>

                                <div className="checkout-summary-total">

                                    <span>
                                        Total
                                    </span>

                                    <strong>
                                        KES{" "}
                                        {Number(
                                            cartTotal
                                        ).toLocaleString()}
                                    </strong>

                                </div>

                            </div>

                        </aside>

                    </div>

{/* ==========================================================
    M-PESA PAYMENT INSTRUCTIONS
========================================================== */}

{mpesaPayment && (
    <section className="mpesa-payment-wrapper">

        {/* SUCCESS HEADER */}
        <div className="mpesa-order-success">

            <div className="mpesa-success-icon">
                ✓
            </div>

            <div className="mpesa-success-content">
                <span className="mpesa-success-label">
                    ORDER CREATED SUCCESSFULLY
                </span>

                <h2>
                    Complete Your Payment
                </h2>

                <p>
                    Your order has been created and is waiting for
                    M-Pesa payment.
                </p>
            </div>

            <div className="mpesa-status-badge">
                <span className="mpesa-status-dot"></span>

                <div>
                    <strong>
                        Payment Pending
                    </strong>

                    <small>
                        Awaiting payment
                    </small>
                </div>
            </div>

        </div>


        {/* MAIN PAYMENT CARD */}
        <div className="mpesa-payment-card">

            <div className="mpesa-payment-heading">

                <div className="mpesa-icon-box">
                    📱
                </div>

                <div>
                    <span className="section-eyebrow">
                        M-PESA PAYMENT
                    </span>

                    <h2>
                        Make Your Payment
                    </h2>

                    <p>
                        Use the details below to complete payment
                        for your order.
                    </p>
                </div>

            </div>


            {/* PAYMENT DETAILS */}
            <div className="mpesa-payment-details">

                <div className="mpesa-detail-card">

                    <span>
                        Order Number
                    </span>

                    <strong>
                        {mpesaPayment.orderNumber}
                    </strong>

                </div>


                <div className="mpesa-detail-card">

                    <span>
                        PayBill Number
                    </span>

                    <strong className="mpesa-highlight">
                        522533
                    </strong>

                </div>


                <div className="mpesa-detail-card">

                    <span>
                        Account Number
                    </span>

                    <strong className="mpesa-highlight">
                        7927213
                    </strong>

                </div>


                <div className="mpesa-detail-card mpesa-amount-card">

                    <span>
                        Amount to Pay
                    </span>

                    <strong>
                        KES{" "}
                        {Number(
                            mpesaPayment.amount
                        ).toLocaleString()}
                    </strong>

                </div>

            </div>


            {/* PAYMENT CONTENT */}
            <div className="mpesa-payment-grid">

                {/* HOW TO PAY */}
                <div className="mpesa-how-to">

                    <div className="mpesa-section-title">

                        <span>
                            ☷
                        </span>

                        <h3>
                            How to Pay
                        </h3>

                    </div>


                    <div className="mpesa-steps">

                        <div className="mpesa-step">

                            <span className="mpesa-step-number">
                                1
                            </span>

                            <div>
                                <strong>
                                    Open M-Pesa
                                </strong>

                                <p>
                                    Open the M-Pesa menu on your
                                    phone.
                                </p>
                            </div>

                        </div>


                        <div className="mpesa-step">

                            <span className="mpesa-step-number">
                                2
                            </span>

                            <div>
                                <strong>
                                    Select Lipa na M-Pesa
                                </strong>

                                <p>
                                    Choose <b>Lipa na M-Pesa</b>.
                                </p>
                            </div>

                        </div>


                        <div className="mpesa-step">

                            <span className="mpesa-step-number">
                                3
                            </span>

                            <div>
                                <strong>
                                    Select Pay Bill
                                </strong>

                                <p>
                                    Choose the <b>Pay Bill</b>
                                    option.
                                </p>
                            </div>

                        </div>


                        <div className="mpesa-step">

                            <span className="mpesa-step-number">
                                4
                            </span>

                            <div>
                                <strong>
                                    Enter Business Number
                                </strong>

                                <p>
                                    PayBill:
                                    <b> 522533</b>
                                </p>
                            </div>

                        </div>


                        <div className="mpesa-step">

                            <span className="mpesa-step-number">
                                5
                            </span>

                            <div>
                                <strong>
                                    Enter Account Number
                                </strong>

                                <p>
                                    Account:
                                    <b> 7927213</b>
                                </p>
                            </div>

                        </div>


                        <div className="mpesa-step">

                            <span className="mpesa-step-number">
                                6
                            </span>

                            <div>
                                <strong>
                                    Enter Amount
                                </strong>

                                <p>
                                    Enter exactly:
                                    <b>
                                        {" "}
                                        KES{" "}
                                        {Number(
                                            mpesaPayment.amount
                                        ).toLocaleString()}
                                    </b>
                                </p>
                            </div>

                        </div>


                        <div className="mpesa-step">

                            <span className="mpesa-step-number">
                                7
                            </span>

                            <div>
                                <strong>
                                    Confirm Payment
                                </strong>

                                <p>
                                    Enter your M-Pesa PIN and
                                    confirm the transaction.
                                </p>
                            </div>

                        </div>

                    </div>


                    <div className="mpesa-exact-amount">

                        <span>
                            ✓
                        </span>

                        <p>
                            <strong>
                                Important:
                            </strong>{" "}
                            Enter the exact amount shown above
                            to avoid payment delays.
                        </p>

                    </div>

                </div>


                {/* RIGHT SIDE */}
                <div className="mpesa-payment-side">

                    {/* VERIFICATION */}
                    <div className="mpesa-verification">

                        <div className="mpesa-side-icon">
                            ✓
                        </div>

                        <div>

                            <h3>
                                Payment Verification
                            </h3>

                            <p>
                                Once your payment is received,
                                Safaricom will notify Tile Revive
                                automatically.
                            </p>

                            <p>
                                Your order will then be marked as
                                <strong> PAID</strong> and moved
                                for processing.
                            </p>

                        </div>

                    </div>


                    {/* IMPORTANT */}
                    <div className="mpesa-important">

                        <div className="mpesa-important-header">

                            <span>
                                !
                            </span>

                            <h3>
                                Important
                            </h3>

                        </div>

                        <ul>

                            <li>
                                Use PayBill:
                                <strong> 522533</strong>
                            </li>

                            <li>
                                Use Account:
                                <strong> 7927213</strong>
                            </li>

                            <li>
                                Enter the exact amount:
                                <strong>
                                    {" "}
                                    KES{" "}
                                    {Number(
                                        mpesaPayment.amount
                                    ).toLocaleString()}
                                </strong>
                            </li>

                            <li>
                                Keep your M-Pesa confirmation
                                message.
                            </li>

                        </ul>

                    </div>


                    {/* HELP */}
                    <div className="mpesa-help">

                        <h3>
                            Need Help?
                        </h3>

                        <p>
                            Having trouble completing your
                            payment? Contact Tile Revive.
                        </p>

                        <div className="mpesa-contact">

                            <span>
                                📞 0758 804 676
                            </span>

                            <span>
                                ✉️ Tilerevive7@gmail.com
                            </span>

                        </div>

                    </div>

                </div>

            </div>


            {/* BOTTOM NOTICE */}
            <div className="mpesa-bottom-notice">

                <span>
                    ℹ
                </span>

                <p>
                    <strong>
                        Payment status:
                    </strong>{" "}
                    You can keep this page open while completing
                    your M-Pesa payment. Your payment will be
                    verified automatically once received.
                </p>

            </div>

        </div>

    </section>
                )}

            </div>
        </section>
    </main>
);
}

export default Checkout;
