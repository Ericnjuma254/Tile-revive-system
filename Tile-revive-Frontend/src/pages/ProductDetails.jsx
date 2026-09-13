import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProducts, getProductImages, getProductImageUrl } from "../services/api";
import { useCart } from "../context/CartContext";
import "./ProductDetails.css";

const demoReviews = [
    {
        id: 1,
        name: "Brian K.",
        rating: 5,
        date: "2 weeks ago",
        title: "Excellent on old tiles",
        text: "I used Tile Revive on very stained bathroom tiles and the difference was impressive. The lavender scent is also much better than most strong cleaners."
    },
    {
        id: 2,
        name: "Mary W.",
        rating: 5,
        date: "1 month ago",
        title: "Works really well",
        text: "Bought the 5L container and used it on the floor, grout and cabro outside. Very good value for money."
    },
    {
        id: 3,
        name: "Kevin M.",
        rating: 4,
        date: "1 month ago",
        title: "Good product",
        text: "Good cleaning power and easy to use. Delivery was also quick."
    }
];

const ratingBreakdown = [
    { stars: 5, percentage: 82 },
    { stars: 4, percentage: 12 },
    { stars: 3, percentage: 4 },
    { stars: 2, percentage: 1 },
    { stars: 1, percentage: 1 }
];

function Stars({ rating = 5 }) {
    return (
        <span className="product-stars" aria-label={`${rating} out of 5 stars`}>
            {"★★★★★".split("").map((star, index) => (
                <span key={index} className={index < Math.round(rating) ? "" : "muted"}>
                    {star}
                </span>
            ))}
        </span>
    );
}

function ProductDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToCart } = useCart();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState("description");
    const [selectedImage, setSelectedImage] = useState("");
    const [productImages, setProductImages] = useState([]);
    const [galleryLoading, setGalleryLoading] = useState(false);

    

useEffect(() => {
        let mounted = true;

        const loadProducts = async () => {
            try {
                setLoading(true);
                setError("");

                const response = await getProducts();

                const productList = Array.isArray(response)
                    ? response
                    : Array.isArray(response?.products)
                        ? response.products
                        : Array.isArray(response?.data)
                            ? response.data
                            : [];

                if (mounted) {
                    setProducts(productList);
                }
            } catch (err) {
                console.error("Failed to load product:", err);

                if (mounted) {
                    setError("We couldn't load this product right now.");
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadProducts();

        return () => {
            mounted = false;
        };
    }, []);

    const product = useMemo(() => {
        return products.find(
            (item) => String(item.id) === String(id)
        );
    }, [products, id]);

    const relatedProducts = useMemo(() => {
        if (!product) return [];

        return products
            .filter((item) => String(item.id) !== String(product.id))
            .slice(0, 4);
    }, [products, product]);

    useEffect(() => {
        if (product) {
            setSelectedImage(
                product.image ||
                product.imageUrl ||
                product.photo ||
                ""
            );

            let mounted = true;

            const loadProductGallery = async () => {
                try {
                    setGalleryLoading(true);

                    const images = await getProductImages(product.id);

                    if (!mounted) {
                        return;
                    }

                    /*
                     * Backend returns the complete gallery with
                     * slot 1 as the primary image and slots 2-10
                     * as productimage records.
                     */
                    const validImages = Array.isArray(images)
                        ? images.filter((item) => {
                            const image =
                                typeof item === "string"
                                    ? item
                                    : item?.image;

                            return Boolean(image);
                        })
                        : [];

                    setProductImages(validImages);

                    /*
                     * Always start the gallery on the primary image.
                     */
                    const firstImage = validImages[0];

                    const firstImageValue =
                        typeof firstImage === "string"
                            ? firstImage
                            : firstImage?.image;

                    if (firstImageValue) {
                        setSelectedImage(firstImageValue);
                    }

                } catch (galleryError) {
                    console.error(
                        "Failed to load product gallery:",
                        galleryError
                    );

                    if (mounted) {
                        setProductImages([]);
                    }
                } finally {
                    if (mounted) {
                        setGalleryLoading(false);
                    }
                }
            };

            loadProductGallery();

            return () => {
                mounted = false;
            };
        }
    }, [product]);

    if (loading) {
        return (
            <main className="product-details-page">
                <div className="product-details-container">
                    <div className="product-loading">
                        <div className="product-loading-content">
                            <div className="product-loading-image"></div>
                            <div>
                                <div className="product-loading-line"></div>
                                <div className="product-loading-line"></div>
                                <div className="product-loading-line short"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    if (error || !product) {
        return (
            <main className="product-details-page">
                <div className="product-details-container">
                    <div className="product-error">
                        <span className="product-error-icon">!</span>
                        <h1>Product not found</h1>
                        <p>{error || "This product may have been removed or is no longer available."}</p>
                        <Link to="/shop" className="product-back-button">
                            Back to Shop
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    const price = Number(product.price || 0);
    const stock = Number(product.stock || 0);
    const rating = 4.8;

    const productImage =
        selectedImage ||
        product.image ||
        product.imageUrl ||
        product.photo ||
        "";

    const description =
        product.description ||
        "A powerful premium cleaning solution designed to restore the appearance of stained and discoloured surfaces.";

    const category =
        product.category?.name ||
        product.category ||
        "Tile Care";

    const sku =
        product.sku ||
        `TR-${String(product.id).padStart(4, "0")}`;

    const handleAddToCart = () => {
        addToCart(product, quantity);
    };

    const handleBuyNow = () => {
        addToCart(product, quantity);
        navigate("/checkout");
    };

    const increaseQuantity = () => {
        if (stock > 0 && quantity < stock) {
            setQuantity((current) => current + 1);
        }
    };

    const decreaseQuantity = () => {
        setQuantity((current) => Math.max(1, current - 1));
    };

    return (
        <main className="product-details-page">
            <div className="product-details-container">

                <nav className="product-breadcrumb">
                    <Link to="/">Home</Link>
                    <span>/</span>
                    <Link to="/shop">Shop</Link>
                    <span>/</span>
                    <span>{product.name}</span>
                </nav>

                <section className="product-main-card">

                    <div className="product-gallery">

                        <div className="product-gallery-main">

                            {productImage ? (
                                <img
                                    src={getProductImageUrl(productImage)}
                                    alt={product.name}
                                />
                            ) : (
                                <div className="product-large-placeholder">
                                    <span>Tile Revive</span>
                                    <strong>{product.name}</strong>
                                </div>
                            )}

                            <span className="gallery-badge">
                                PREMIUM
                            </span>

                            {productImages && productImages.length >= 2 && (
                                <>
                                    <button
                                        type="button"
                                        className="gallery-arrow gallery-arrow-prev"
                                        aria-label="Previous product image"
                                        onClick={() => {
                                            const currentIndex =
                                                productImages.findIndex(
                                                    (item) => {
                                                        const value =
                                                            typeof item === "string"
                                                                ? item
                                                                : item?.image;

                                                        return value === selectedImage;
                                                    }
                                                );

                                            const safeIndex =
                                                currentIndex < 0
                                                    ? 0
                                                    : currentIndex;

                                            const previousIndex =
                                                (safeIndex - 1 + productImages.length) %
                                                productImages.length;

                                            const previous =
                                                productImages[previousIndex];

                                            setSelectedImage(
                                                typeof previous === "string"
                                                    ? previous
                                                    : previous?.image || ""
                                            );
                                        }}
                                    >
                                        ‹
                                    </button>

                                    <button
                                        type="button"
                                        className="gallery-arrow gallery-arrow-next"
                                        aria-label="Next product image"
                                        onClick={() => {
                                            const currentIndex =
                                                productImages.findIndex(
                                                    (item) => {
                                                        const value =
                                                            typeof item === "string"
                                                                ? item
                                                                : item?.image;

                                                        return value === selectedImage;
                                                    }
                                                );

                                            const safeIndex =
                                                currentIndex < 0
                                                    ? 0
                                                    : currentIndex;

                                            const nextIndex =
                                                (safeIndex + 1) %
                                                productImages.length;

                                            const next =
                                                productImages[nextIndex];

                                            setSelectedImage(
                                                typeof next === "string"
                                                    ? next
                                                    : next?.image || ""
                                            );
                                        }}
                                    >
                                        ›
                                    </button>
                                </>
                            )}
                        </div>

                        {productImages.length > 0 && (
                            <div className="product-gallery-thumbnails">
                                {productImages.map((item, index) => {
                                    const image =
                                        typeof item === "string"
                                            ? item
                                            : item?.image;

                                    if (!image) {
                                        return null;
                                    }

                                    const isActive =
                                        selectedImage === image;

                                    return (
                                        <button
                                            key={`${image}-${index}`}
                                            type="button"
                                            className={`product-gallery-thumbnail ${
                                                isActive ? "active" : ""
                                            }`}
                                            onClick={() =>
                                                setSelectedImage(image)
                                            }
                                            aria-label={`View product image ${index + 1}`}
                                        >
                                            <img
                                                src={getProductImageUrl(image)}
                                                alt={`${product.name} view ${index + 1}`}
                                            />
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {galleryLoading && (
                            <div className="product-gallery-loading">
                                Loading product images...
                            </div>
                        )}

                        <div className="gallery-trust">
                            <span>✓ Authentic Product</span>
                            <span>✓ Quality Tested</span>
                            <span>✓ Fast Delivery</span>
                        </div>

                    </div>

                    <div className="product-information">

                        <div className="product-category-row">
                            <span className="product-category-pill">
                                {category}
                            </span>

                            <span className="product-sku">
                                SKU: {sku}
                            </span>
                        </div>

                        <h1>{product.name}</h1>

                        <div className="product-rating-row">
                            <span className="rating-score">
                                {rating}
                            </span>

                            <Stars rating={rating} />

                            <span className="rating-divider">|</span>

                            <span>
                                24 verified reviews
                            </span>
                        </div>

                        <p className="product-short-description">
                            {description}
                        </p>

                        <div className="product-price-box">
                            <span className="price-label">
                                OUR PRICE
                            </span>

                            <div className="product-detail-price">
                                KSh {price.toLocaleString()}
                            </div>

                            <span className="price-note">
                                Inclusive of current listed price
                            </span>
                        </div>

                        <div className="detail-stock">
                            <span className="stock-dot"></span>

                            {stock > 0
                                ? `${stock} units available`
                                : "Currently out of stock"}
                        </div>

                        {stock > 0 && stock <= 5 && (
                            <div className="low-stock-message">
                                Only {stock} left — order soon
                            </div>
                        )}

                        <div className="product-detail-divider"></div>

                        <div className="purchase-section">

                            <div className="quantity-row">
                                <span className="quantity-label">
                                    Quantity
                                </span>

                                <div className="quantity-control">
                                    <button
                                        type="button"
                                        onClick={decreaseQuantity}
                                        disabled={quantity <= 1}
                                    >
                                        −
                                    </button>

                                    <span>{quantity}</span>

                                    <button
                                        type="button"
                                        onClick={increaseQuantity}
                                        disabled={
                                            stock <= 0 ||
                                            quantity >= stock
                                        }
                                    >
                                        +
                                    </button>
                                </div>

                                <span className="quantity-total">
                                    KSh {(price * quantity).toLocaleString()}
                                </span>
                            </div>

                            <div className="product-purchase-buttons">

                                <button
                                    type="button"
                                    className="detail-add-cart"
                                    onClick={handleAddToCart}
                                    disabled={stock <= 0}
                                >
                                    Add to Cart
                                </button>

                                <button
                                    type="button"
                                    className="detail-buy-now"
                                    onClick={handleBuyNow}
                                    disabled={stock <= 0}
                                >
                                    Buy Now
                                </button>

                            </div>

                        </div>

                        <div className="product-service-grid">

                            <div className="benefit-item">
                                <span className="benefit-icon">🚚</span>
                                <div>
                                    <strong>Fast Delivery</strong>
                                    <span>Nairobi same-day delivery</span>
                                </div>
                            </div>

                            <div className="benefit-item">
                                <span className="benefit-icon">💳</span>
                                <div>
                                    <strong>Secure Payment</strong>
                                    <span>M-Pesa & Cash on Delivery</span>
                                </div>
                            </div>

                            <div className="benefit-item">
                                <span className="benefit-icon">✓</span>
                                <div>
                                    <strong>Quality Product</strong>
                                    <span>Made for effective cleaning</span>
                                </div>
                            </div>

                            <div className="benefit-item">
                                <span className="benefit-icon">☎</span>
                                <div>
                                    <strong>Customer Support</strong>
                                    <span>We're here to help</span>
                                </div>
                            </div>

                        </div>

                    </div>
                </section>

                <section className="product-info-layout">

                    <div className="product-description-column">

                        <section className="detail-section">

                            <div className="product-info-tabs">
                                <button
                                    type="button"
                                    className={activeTab === "description" ? "active" : ""}
                                    onClick={() => setActiveTab("description")}
                                >
                                    Description
                                </button>

                                <button
                                    type="button"
                                    className={activeTab === "features" ? "active" : ""}
                                    onClick={() => setActiveTab("features")}
                                >
                                    Features
                                </button>

                                <button
                                    type="button"
                                    className={activeTab === "usage" ? "active" : ""}
                                    onClick={() => setActiveTab("usage")}
                                >
                                    How to Use
                                </button>
                            </div>

                            {activeTab === "description" && (
                                <div className="product-description-content">

                                    <span className="section-eyebrow">
                                        PRODUCT DETAILS
                                    </span>

                                    <h2>
                                        Powerful cleaning. Beautiful results.
                                    </h2>

                                    <p className="product-description-text">
                                        {description}
                                    </p>

                                    <p className="product-description-text">
                                        Tile Revive is designed to help restore
                                        the appearance of stained and discoloured
                                        surfaces while delivering a premium
                                        cleaning experience.
                                    </p>

                                    <div className="product-use-card">
                                        <span className="section-eyebrow">
                                            IDEAL FOR
                                        </span>

                                        <div className="surface-tags">
                                            <span>Ceramic</span>
                                            <span>Porcelain</span>
                                            <span>Grout</span>
                                            <span>Terrazzo</span>
                                            <span>Cabro</span>
                                            <span>Mirrors</span>
                                            <span>Sofa & Carpet</span>
                                            <span>Tents</span>
                                        </div>

                                        <div className="surface-warning">
                                            Avoid use on polished marble,
                                            granite, sandstone and wood.
                                        </div>
                                    </div>

                                </div>
                            )}

                            {activeTab === "features" && (
                                <div className="product-description-content">

                                    <span className="section-eyebrow">
                                        PRODUCT FEATURES
                                    </span>

                                    <h2>Why customers choose Tile Revive</h2>

                                    <div className="feature-grid">

                                        <div className="feature-card">
                                            <strong>Deep Cleaning</strong>
                                            <span>
                                                Helps tackle stubborn stains
                                                and discolouration.
                                            </span>
                                        </div>

                                        <div className="feature-card">
                                            <strong>Premium Formula</strong>
                                            <span>
                                                Developed for everyday surface
                                                restoration.
                                            </span>
                                        </div>

                                        <div className="feature-card">
                                            <strong>Versatile</strong>
                                            <span>
                                                Suitable for multiple common
                                                household surfaces.
                                            </span>
                                        </div>

                                        <div className="feature-card">
                                            <strong>5L Size</strong>
                                            <span>
                                                A practical size for repeated
                                                cleaning jobs.
                                            </span>
                                        </div>

                                    </div>

                                </div>
                            )}

                            {activeTab === "usage" && (
                                <div className="product-description-content">

                                    <span className="section-eyebrow">
                                        HOW TO USE
                                    </span>

                                    <h2>Simple application</h2>

                                    <div className="feature-grid">

                                        <div className="feature-card">
                                            <strong>01 — Prepare</strong>
                                            <span>
                                                Remove loose dirt and debris
                                                from the surface.
                                            </span>
                                        </div>

                                        <div className="feature-card">
                                            <strong>02 — Apply</strong>
                                            <span>
                                                Apply the product according to
                                                the cleaning requirement.
                                            </span>
                                        </div>

                                        <div className="feature-card">
                                            <strong>03 — Agitate</strong>
                                            <span>
                                                Work the product into the
                                                affected area.
                                            </span>
                                        </div>

                                        <div className="feature-card">
                                            <strong>04 — Rinse</strong>
                                            <span>
                                                Rinse thoroughly and inspect
                                                the finished surface.
                                            </span>
                                        </div>

                                    </div>

                                </div>
                            )}

                        </section>

                    </div>

                    <aside>

                        <div className="delivery-card">

                            <div className="delivery-card-heading">
                                Delivery & Payment
                            </div>

                            <div className="delivery-option">
                                <span>🚚</span>
                                <div>
                                    <strong>Nairobi Delivery</strong>
                                    <small>Same-day delivery available</small>
                                </div>
                            </div>

                            <div className="delivery-divider"></div>

                            <div className="delivery-option">
                                <span>💰</span>
                                <div>
                                    <strong>Cash on Delivery</strong>
                                    <small>Available on eligible orders</small>
                                </div>
                            </div>

                            <div className="delivery-divider"></div>

                            <div className="delivery-option">
                                <span>📱</span>
                                <div>
                                    <strong>M-Pesa</strong>
                                    <small>Fast and secure checkout</small>
                                </div>
                            </div>

                            <div className="payment-methods">
                                <span>PAYMENT OPTIONS</span>

                                <div className="payment-pills">
                                    <span>M-PESA</span>
                                    <span>COD</span>
                                </div>
                            </div>

                            <div className="secure-shopping">
                                🔒 Secure checkout
                            </div>

                        </div>

                    </aside>

                </section>

                <section className="reviews-section">

                    <div className="reviews-header">

                        <div>
                            <span className="section-eyebrow">
                                CUSTOMER FEEDBACK
                            </span>

                            <h2>Reviews & Ratings</h2>
                        </div>

                        <button
                            type="button"
                            className="write-review-button"
                        >
                            Write a Review
                        </button>

                    </div>

                    <div className="reviews-summary">

                        <div className="overall-rating">
                            <strong>4.8</strong>

                            <div className="overall-stars">
                                ★★★★★
                            </div>

                            <span>
                                Based on 24 verified reviews
                            </span>
                        </div>

                        <div className="rating-breakdown">

                            {ratingBreakdown.map((item) => (
                                <div
                                    className="rating-bar-row"
                                    key={item.stars}
                                >
                                    <span>{item.stars}</span>

                                    <div className="rating-bar">
                                        <span
                                            style={{
                                                width: `${item.percentage}%`
                                            }}
                                        />
                                    </div>

                                    <span>{item.percentage}%</span>
                                </div>
                            ))}

                        </div>

                    </div>

                    <div className="review-list">

                        {demoReviews.map((review) => (
                            <article
                                className="review-card"
                                key={review.id}
                            >

                                <div className="review-top">

                                    <div className="review-avatar">
                                        {review.name.charAt(0)}
                                    </div>

                                    <div>
                                        <strong>{review.name}</strong>

                                        <div className="review-stars">
                                            {"★★★★★"}
                                        </div>
                                    </div>

                                    <span>{review.date}</span>

                                </div>

                                <div className="review-content">
                                    <h3>{review.title}</h3>
                                    <p>{review.text}</p>
                                </div>

                            </article>
                        ))}

                    </div>

                </section>

                {relatedProducts.length > 0 && (
                    <section className="related-products">

                        <div className="related-header">

                            <div>
                                <span className="section-eyebrow">
                                    YOU MAY ALSO LIKE
                                </span>

                                <h2>Related Products</h2>
                            </div>

                            <Link to="/shop">
                                View All
                            </Link>

                        </div>

                        <div className="related-grid">

                            {relatedProducts.map((item) => {

                                const image =
                                    item.image ||
                                    item.imageUrl ||
                                    item.photo ||
                                    "";

                                return (
                                    <Link
                                        to={`/shop/product/${item.id}`}
                                        className="related-card"
                                        key={item.id}
                                    >

                                        <div className="related-image">

                                            {image ? (
                                                <img
                                                    src={getProductImageUrl(image)}
                                                    alt={item.name}
                                                />
                                            ) : (
                                                <span>
                                                    Tile Revive
                                                </span>
                                            )}

                                        </div>

                                        <div className="related-info">

                                            <span>
                                                {item.category?.name ||
                                                    item.category ||
                                                    "Tile Care"}
                                            </span>

                                            <h3>{item.name}</h3>

                                            <div className="related-rating">
                                                ★★★★★
                                            </div>

                                            <strong>
                                                KSh{" "}
                                                {Number(
                                                    item.price || 0
                                                ).toLocaleString()}
                                            </strong>

                                        </div>

                                    </Link>
                                );
                            })}

                        </div>

                    </section>
                )}

            </div>
        </main>
    );
}

export default ProductDetails;







