import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "./Cart.css";

function Cart() {
    const {
        cartItems,
        cartCount,
        cartTotal,
        updateQuantity,
        removeFromCart
    } = useCart();

    return (
        <main className="cart-page">
            <section className="section">
                <div className="container">

                    <div className="section-heading">
                        <span className="section-eyebrow">
                            YOUR CART
                        </span>

                        <h1 className="section-title">
                            Shopping Cart
                        </h1>

                        <p>
                            {cartCount} item{cartCount === 1 ? "" : "s"} in your cart.
                        </p>
                    </div>

                    {cartItems.length === 0 ? (
                        <div className="shop-state">
                            <h2>Your cart is empty</h2>

                            <p>
                                Add some Tile Revive products to get started.
                            </p>

                            <a
                                href="/shop"
                                className="btn btn-primary"
                            >
                                Continue Shopping
                            </a>
                        </div>
                    ) : (
                        <div className="cart-layout">

                            <div className="cart-items">

                                {cartItems.map((item) => (
                                    <article
                                        key={item.id}
                                        className="cart-item"
                                    >

                                        <div className="cart-item-image">
                                            {item.image ? (
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                />
                                            ) : (
                                                <span>🧽</span>
                                            )}
                                        </div>

                                        <div className="cart-item-info">

                                            <h2>
                                                {item.name}
                                            </h2>

                                            <p className="cart-item-price">
                                                KES{" "}
                                                {Number(
                                                    item.price
                                                ).toLocaleString()}
                                            </p>

                                            <div className="cart-item-actions">

                                                <div className="quantity-control">

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.id,
                                                                item.quantity - 1
                                                            )
                                                        }
                                                        aria-label={`Decrease quantity of ${item.name}`}
                                                    >
                                                        −
                                                    </button>

                                                    <span>
                                                        {item.quantity}
                                                    </span>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            updateQuantity(
                                                                item.id,
                                                                item.quantity + 1
                                                            )
                                                        }
                                                        aria-label={`Increase quantity of ${item.name}`}
                                                    >
                                                        +
                                                    </button>

                                                </div>

                                                <button
                                                    type="button"
                                                    className="cart-remove"
                                                    onClick={() =>
                                                        removeFromCart(item.id)
                                                    }
                                                >
                                                    Remove
                                                </button>

                                            </div>

                                        </div>

                                        <div className="cart-item-total">
                                            KES{" "}
                                            {Number(
                                                item.price * item.quantity
                                            ).toLocaleString()}
                                        </div>

                                    </article>
                                ))}

                            </div>

                            <aside className="cart-summary">

                                <h2>
                                    Order Summary
                                </h2>

                                <div className="cart-summary-row">
                                    <span>
                                        Subtotal
                                    </span>

                                    <strong>
                                        KES{" "}
                                        {Number(
                                            cartTotal
                                        ).toLocaleString()}
                                    </strong>
                                </div>

                                <div className="cart-summary-row">
                                    <span>
                                        Delivery
                                    </span>

                                    <span>
                                        Calculated at checkout
                                    </span>
                                </div>

                                <div className="cart-summary-total">
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

                                <a
                                    href="/checkout"
                                    className="btn btn-primary cart-checkout-button"
                                >
                                    Proceed to Checkout
                                </a>

                                <a
                                    href="/shop"
                                    className="cart-continue"
                                >
                                    ← Continue Shopping
                                </a>

                            </aside>

                        </div>
                    )}

                </div>
            </section>
        </main>
    );
}

export default Cart;
