import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getProducts, getProductImages, getProductImageUrl, getProductReviews } from "../services/api";
import { useCart } from "../context/CartContext";
import CustomerAuth from "../components/customer/CustomerAuth";
import { createProductReview } from "../services/customerAuth";
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

    const [reviews, setReviews] = useState([]);
    const [reviewSummary, setReviewSummary] = useState({
        averageRating: 0,
        reviewCount: 0
    });
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [reviewsError, setReviewsError] = useState("");

    const [showCustomerAuth, setShowCustomerAuth] = useState(false);
    const [showReviewForm, setShowReviewForm] = useState(false);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewSubmitError, setReviewSubmitError] = useState("");
    const [reviewSubmitSuccess, setReviewSubmitSuccess] = useState("");

    

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

    const ratingBreakdown = useMemo(() => {
        const total = reviews.length;

        return [5, 4, 3, 2, 1].map((stars) => {
            const count = reviews.filter(
                (review) => Number(review.rating) === stars
            ).length;

            return {
                stars,
                count,
                percentage: total
                    ? Math.round((count / total) * 100)
                    : 0
            };
        });
    }, [reviews]);

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

    useEffect(() => {
        if (!product) return;

        let mounted = true;

        const loadReviews = async () => {
            try {
                setReviewsLoading(true);
                setReviewsError("");

                const data = await getProductReviews(product.id);

                if (!mounted) return;

                setReviews(data.reviews || []);
                setReviewSummary(
                    data.summary || {
                        averageRating: 0,
                        reviewCount: 0
                    }
                );
            } catch (error) {
                console.error(
                    "Failed to load product reviews:",
                    error
                );

                if (mounted) {
                    setReviews([]);
                    setReviewSummary({
                        averageRating: 0,
                        reviewCount: 0
                    });
                    setReviewsError(
                        "We couldn't load reviews right now."
                    );
                }
            } finally {
                if (mounted) {
                    setReviewsLoading(false);
                }
            }
        };

        loadReviews();

        return () => {
            mounted = false;
        };
    }, [product]);

    const handleWriteReview = () => {
        const token = localStorage.getItem("customerAccessToken");

        setReviewSubmitError("");
        setReviewSubmitSuccess("");

        if (!token) {
            setShowCustomerAuth(true);
            return;
        }

        setShowReviewForm(true);
    };

    const handleCustomerAuthSuccess = () => {
        setShowCustomerAuth(false);
        setReviewRating(0);
        setReviewComment("");
        setReviewSubmitError("");
        setReviewSubmitSuccess("");
        setShowReviewForm(true);
    };

    const handleSubmitReview = async (event) => {
        event.preventDefault();

        if (!product) return;

        setReviewSubmitError("");
        setReviewSubmitSuccess("");

        if (!reviewRating) {
            setReviewSubmitError("Please select a star rating.");
            return;
        }

        if (reviewComment.trim().length > 1000) {
            setReviewSubmitError(
                "Review must be 1000 characters or less."
            );
            return;
        }

        try {
            setReviewSubmitting(true);

            const result = await createProductReview({
                productId: product.id,
                rating: reviewRating,
                comment: reviewComment.trim()
            });

            setReviewSubmitSuccess(
                result?.message ||
                "Review submitted successfully."
            );

            setReviews((currentReviews) => [
                result.review,
                ...currentReviews
            ]);

            if (result.summary) {
                setReviewSummary(result.summary);
            }

            setReviewRating(0);
            setReviewComment("");

            setTimeout(() => {
                setShowReviewForm(false);
                setReviewSubmitSuccess("");
            }, 1200);

        } catch (error) {
            console.error(
                "PRODUCT REVIEW SUBMISSION ERROR:",
                error
            );

            setReviewSubmitError(
                error?.message ||
                "Unable to submit your review."
            );

        } finally {
            setReviewSubmitting(false);
        }
    };

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
    const rating = Number(reviewSummary.averageRating || 0);
    const reviewCount = Number(reviewSummary.reviewCount || 0);

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
                                {reviewCount > 0 ? `${reviewCount} verified reviews` : "No reviews yet"}
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
                            onClick={handleWriteReview}
                        >
                            Write a Review
                        </button>

                    </div>

                    <div className="reviews-summary">

                        <div className="overall-rating">
                            <strong>{reviewCount > 0 ? rating.toFixed(1) : "—"}</strong>

                            <div className="overall-stars">
                                ★★★★★
                            </div>

                            <span>
                                Based on {reviewCount > 0 ? `${reviewCount} verified reviews` : "No reviews yet"}
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

                        {reviewsLoading ? (
                            <div className="reviews-empty-state">
                                <strong>Loading reviews...</strong>
                                <span>
                                    Fetching real customer feedback.
                                </span>
                            </div>
                        ) : reviewsError ? (
                            <div className="reviews-empty-state">
                                <strong>Reviews unavailable</strong>
                                <span>{reviewsError}</span>
                            </div>
                        ) : reviews.length === 0 ? (
                            <div className="reviews-empty-state">
                                <strong>No reviews yet</strong>
                                <span>
                                    Be the first customer to review this product.
                                </span>
                            </div>
                        ) : (
                            reviews.map((review) => (
                                <article
                                    className="review-card"
                                    key={review.id}
                                >

                                    <div className="review-top">

                                        <div className="review-avatar">
                                            {(review.customer?.fullName || "Customer")
                                                .charAt(0)
                                                .toUpperCase()}
                                        </div>

                                        <div>
                                            <strong>
                                                {review.customer?.fullName || "Customer"}
                                            </strong>

                                            <div className="review-stars">
                                                <Stars rating={review.rating} />
                                            </div>
                                        </div>

                                        <span>
                                            {new Date(
                                                review.createdAt
                                            ).toLocaleDateString(
                                                "en-KE",
                                                {
                                                    day: "numeric",
                                                    month: "short",
                                                    year: "numeric"
                                                }
                                            )}
                                        </span>

                                    </div>

                                    <div className="review-content">
                                        <p>
                                            {review.comment ||
                                                "Customer left a rating without a comment."}
                                        </p>
                                    </div>

                                </article>
                            ))
                        )}

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
            {showReviewForm && (
                <div
                    className="review-modal-overlay"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setShowReviewForm(false);
                        }
                    }}
                >
                    <div className="review-modal">

                        <div className="review-modal-header">
                            <div>
                                <span className="section-eyebrow">
                                    YOUR EXPERIENCE
                                </span>

                                <h2>Write a Review</h2>

                                <p>
                                    Share your genuine experience with this product.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="review-modal-close"
                                onClick={() => setShowReviewForm(false)}
                                aria-label="Close review form"
                            >
                                ×
                            </button>
                        </div>

                        <form
                            className="review-form"
                            onSubmit={handleSubmitReview}
                        >
                            <div className="review-form-rating">
                                <label>Your rating</label>

                                <div
                                    className="review-rating-selector"
                                    aria-label="Select product rating"
                                >
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            className={
                                                star <= reviewRating
                                                    ? "active"
                                                    : ""
                                            }
                                            onClick={() =>
                                                setReviewRating(star)
                                            }
                                            aria-label={`${star} star${star > 1 ? "s" : ""}`}
                                        >
                                            ★
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="review-form-field">
                                <label htmlFor="product-review-comment">
                                    Your review
                                </label>

                                <textarea
                                    id="product-review-comment"
                                    value={reviewComment}
                                    onChange={(event) =>
                                        setReviewComment(event.target.value)
                                    }
                                    placeholder="Tell other customers about your experience..."
                                    maxLength={1000}
                                    rows={6}
                                />

                                <span className="review-character-count">
                                    {reviewComment.length}/1000
                                </span>
                            </div>

                            {reviewSubmitError && (
                                <div className="review-form-message error">
                                    {reviewSubmitError}
                                </div>
                            )}

                            {reviewSubmitSuccess && (
                                <div className="review-form-message success">
                                    {reviewSubmitSuccess}
                                </div>
                            )}

                            <div className="review-form-actions">
                                <button
                                    type="button"
                                    className="review-cancel-button"
                                    onClick={() => setShowReviewForm(false)}
                                    disabled={reviewSubmitting}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="review-submit-button"
                                    disabled={reviewSubmitting}
                                >
                                    {reviewSubmitting
                                        ? "Submitting..."
                                        : "Submit Review"}
                                </button>
                            </div>

                            <p className="review-form-note">
                                Reviews are limited to customers who have purchased
                                this product.
                            </p>
                        </form>

                    </div>
                </div>
            )}

            {showCustomerAuth && (
                <CustomerAuth
                    onSuccess={handleCustomerAuthSuccess}
                    onClose={() => setShowCustomerAuth(false)}
                />
            )}

        </main>
    );
}

export default ProductDetails;








