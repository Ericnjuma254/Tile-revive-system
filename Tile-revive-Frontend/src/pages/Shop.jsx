import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { getProducts, getProductImageUrl } from "../services/api";

function Shop() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const { addToCart } = useCart();

    useEffect(() => {
        const loadProducts = async () => {
            try {
                setLoading(true);
                setError("");

                const data = await getProducts();
                setProducts(data);
            } catch (err) {
                console.error("Failed to load products:", err);
                setError("Unable to load products.");
            } finally {
                setLoading(false);
            }
        };

        loadProducts();
    }, []);

    const handleAddToCart = (product) => {
        addToCart(product);
    };

    const handleBuyNow = (product) => {
        addToCart(product);
        window.location.href = "/cart";
    };

    return (
        <main className="shop-page">
            <section className="section">
                <div className="container">

                    <div className="shop-heading">
                        <div>
                            <span className="section-eyebrow">
                                TILE REVIVE STORE
                            </span>

                            <h1 className="section-title">
                                Shop Tile Revive
                            </h1>

                            <p className="shop-description">
                                Professional cleaning solutions for
                                tiles, floors, drains and more.
                            </p>
                        </div>
                    </div>

                    {loading && (
                        <div className="shop-state">
                            <h2>Loading products...</h2>
                            <p>Please wait while we load our products.</p>
                        </div>
                    )}

                    {error && (
                        <div className="shop-state shop-error">
                            <h2>Unable to load products</h2>
                            <p>{error}</p>
                        </div>
                    )}

                    {!loading && !error && products.length > 0 && (
                        <div className="product-grid">
                            {products.map((product) => {
                                const inStock = Number(product.stock) > 0;

                                return (
                                    <article
                                        key={product.id}
                                        className="product-card"
                                    >
                                        <Link
                                            to={`/shop/product/${product.id}`}
                                            className="product-image product-image-link"
                                        >
                                            {product.image ? (
                                                <img
                                                    src={getProductImageUrl(product.image)}
                                                    alt={product.name}
                                                />
                                            ) : (
                                                <div className="product-placeholder">
                                                    <span>🧽</span>
                                                    <small>
                                                        Tile Revive
                                                    </small>
                                                </div>
                                            )}
                                        </Link>

                                        <div className="product-info">

                                            {product.category?.name && (
                                                <span className="product-category">
                                                    {product.category.name}
                                                </span>
                                            )}

                                            <Link
                                                to={`/shop/product/${product.id}`}
                                                className="product-card-title"
                                            >
                                                <h2>{product.name}</h2>
                                            </Link>

                                            <p className="product-price">
                                                KES{" "}
                                                {Number(
                                                    product.price
                                                ).toLocaleString()}
                                            </p>

                                            <span
                                                className={
                                                    inStock
                                                        ? "product-stock"
                                                        : "product-stock product-stock-out"
                                                }
                                            >
                                                {inStock
                                                    ? `${product.stock} in stock`
                                                    : "Out of stock"}
                                            </span>

                                            <div className="product-actions">

                                                <button
                                                    type="button"
                                                    className="btn btn-primary product-button"
                                                    disabled={!inStock}
                                                    onClick={() =>
                                                        handleAddToCart(product)
                                                    }
                                                >
                                                    {inStock
                                                        ? "Add to Cart"
                                                        : "Out of Stock"}
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn product-buy-button"
                                                    disabled={!inStock}
                                                    onClick={() =>
                                                        handleBuyNow(product)
                                                    }
                                                >
                                                    Buy Now
                                                </button>

                                            </div>

                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    )}

                    {!loading &&
                        !error &&
                        products.length === 0 && (
                            <div className="shop-state">
                                <h2>No products available</h2>
                                <p>
                                    There are currently no products
                                    available in the store.
                                </p>
                            </div>
                        )}

                </div>
            </section>
        </main>
    );
}

export default Shop;

