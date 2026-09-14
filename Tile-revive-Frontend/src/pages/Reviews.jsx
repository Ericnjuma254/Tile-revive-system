import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CustomerAuth from "../components/customer/CustomerAuth";

import {
    getAllReviews,
    getMyReviewProducts
} from "../services/api";

import {
    createProductReview
} from "../services/customerAuth";

import "./Reviews.css";


function Stars({ rating = 0 }) {
    const value = Math.round(Number(rating) || 0);

    return (
        <span
            className="reviews-stars"
            aria-label={`${value} out of 5 stars`}
        >
            {[1, 2, 3, 4, 5].map((star) => (
                <span
                    key={star}
                    className={
                        star <= value
                            ? "review-star active"
                            : "review-star"
                    }
                >
                    ★
                </span>
            ))}
        </span>
    );
}


function formatDate(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString("en-KE", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}


function Reviews() {

    const navigate = useNavigate();

    const [reviews, setReviews] = useState([]);
    const [summary, setSummary] = useState({
        averageRating: 0,
        reviewCount: 0
    });

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [showCustomerAuth, setShowCustomerAuth] =
        useState(false);

    const [showReviewForm, setShowReviewForm] =
        useState(false);

    const [reviewProducts, setReviewProducts] =
        useState([]);

    const [productsLoading, setProductsLoading] =
        useState(false);

    const [selectedProduct, setSelectedProduct] =
        useState("");

    const [reviewRating, setReviewRating] =
        useState(0);

    const [reviewComment, setReviewComment] =
        useState("");

    const [reviewSubmitting, setReviewSubmitting] =
        useState(false);

    const [reviewSubmitError, setReviewSubmitError] =
        useState("");

    const [reviewSubmitSuccess, setReviewSubmitSuccess] =
        useState("");


    const loadReviews = async () => {

        try {

            setLoading(true);
            setError("");

            const result =
                await getAllReviews();

            setReviews(
                Array.isArray(result.reviews)
                    ? result.reviews
                    : []
            );

            setSummary(
                result.summary || {
                    averageRating: 0,
                    reviewCount: 0
                }
            );

        } catch (err) {

            console.error(
                "REVIEWS PAGE LOAD ERROR:",
                err
            );

            setError(
                err?.message ||
                "We couldn't load reviews right now."
            );

        } finally {

            setLoading(false);
        }
    };


    useEffect(() => {
        loadReviews();
    }, []);


    const openReviewFlow = async () => {

        const token =
            localStorage.getItem(
                "customerAccessToken"
            );

        setReviewSubmitError("");
        setReviewSubmitSuccess("");

        if (!token) {
            setShowCustomerAuth(true);
            return;
        }

        await openReviewForm();
    };


    const openReviewForm = async () => {

        try {

            setProductsLoading(true);
            setReviewSubmitError("");

            const products =
                await getMyReviewProducts();

            setReviewProducts(products);

            if (!products.length) {

                setShowReviewForm(true);

                setReviewSubmitError(
                    "You don't currently have a purchased product available for review."
                );

                return;
            }

            setSelectedProduct(
                String(products[0].id)
            );

            setReviewRating(0);
            setReviewComment("");

            setShowReviewForm(true);

        } catch (err) {

            console.error(
                "REVIEW PRODUCTS ERROR:",
                err
            );

            const message =
                err?.message ||
                "Unable to load your eligible products.";

            if (
                message.toLowerCase().includes("expired") ||
                message.toLowerCase().includes("authentication") ||
                message.toLowerCase().includes("sign in")
            ) {
                setShowReviewForm(false);
                setShowCustomerAuth(true);
                return;
            }

            setReviewSubmitError(message);

        } finally {

            setProductsLoading(false);
        }
    };


    const handleCustomerAuthSuccess = async () => {

        setShowCustomerAuth(false);

        await openReviewForm();
    };


    const handleSubmitReview = async (event) => {

        event.preventDefault();

        setReviewSubmitError("");
        setReviewSubmitSuccess("");

        if (!selectedProduct) {
            setReviewSubmitError(
                "Please select a product."
            );
            return;
        }

        if (!reviewRating) {
            setReviewSubmitError(
                "Please select a star rating."
            );
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

            const result =
                await createProductReview({
                    productId:
                        Number(selectedProduct),

                    rating:
                        reviewRating,

                    comment:
                        reviewComment.trim()
                });

            setReviewSubmitSuccess(
                result?.message ||
                "Review submitted successfully."
            );

            if (result?.review) {
                setReviews((current) => [
                    result.review,
                    ...current
                ]);
            }

            if (result?.summary) {

                /*
                 * Refresh the global summary from the
                 * database after the new review.
                 */
                await loadReviews();
            }

            /*
             * Remove the reviewed product from the
             * eligible product list.
             */
            setReviewProducts((current) =>
                current.filter(
                    (product) =>
                        Number(product.id) !==
                        Number(selectedProduct)
                )
            );

            setSelectedProduct("");
            setReviewRating(0);
            setReviewComment("");

            setTimeout(() => {

                setShowReviewForm(false);
                setReviewSubmitSuccess("");

            }, 1200);

        } catch (err) {

            console.error(
                "REVIEW SUBMISSION ERROR:",
                err
            );

            setReviewSubmitError(
                err?.message ||
                "Unable to submit your review."
            );

        } finally {

            setReviewSubmitting(false);
        }
    };


    const closeReviewForm = () => {

        if (reviewSubmitting) {
            return;
        }

        setShowReviewForm(false);
        setReviewSubmitError("");
        setReviewSubmitSuccess("");
    };


    return (
        <main className="reviews-page">

            <section className="reviews-hero">

                <div className="reviews-hero-inner">

                    <span className="reviews-eyebrow">
                        TILE REVIVE CUSTOMER REVIEWS
                    </span>

                    <h1>
                        Real results.
                        <br />
                        Real customers.
                    </h1>

                    <p>
                        See what customers are saying about
                        their Tile Revive experience.
                    </p>

                    <div className="reviews-summary">

                        <div className="reviews-summary-rating">

                            <strong>
                                {Number(
                                    summary.averageRating || 0
                                ).toFixed(1)}
                            </strong>

                            <Stars
                                rating={
                                    summary.averageRating
                                }
                            />

                            <span>
                                {summary.reviewCount}{" "}
                                {summary.reviewCount === 1
                                    ? "review"
                                    : "reviews"}
                            </span>

                        </div>

                        <button
                            type="button"
                            className="reviews-write-button"
                            onClick={openReviewFlow}
                        >
                            Leave a Review
                            <span>→</span>
                        </button>

                    </div>

                </div>

            </section>


            <section className="reviews-content">

                <div className="reviews-content-header">

                    <div>
                        <span className="reviews-section-eyebrow">
                            CUSTOMER VOICES
                        </span>

                        <h2>
                            What our customers say
                        </h2>
                    </div>

                    <button
                        type="button"
                        className="reviews-mobile-write"
                        onClick={openReviewFlow}
                    >
                        Leave a Review
                    </button>

                </div>


                {loading && (
                    <div className="reviews-state">
                        <div className="reviews-spinner"></div>
                        <p>Loading customer reviews...</p>
                    </div>
                )}


                {!loading && error && (
                    <div className="reviews-state reviews-error">
                        <h3>
                            Reviews unavailable
                        </h3>

                        <p>
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={loadReviews}
                        >
                            Try Again
                        </button>
                    </div>
                )}


                {!loading &&
                    !error &&
                    reviews.length === 0 && (

                    <div className="reviews-state">

                        <div className="reviews-empty-icon">
                            ★
                        </div>

                        <h3>
                            Be the first to review
                        </h3>

                        <p>
                            Your experience could help
                            another Tile Revive customer.
                        </p>

                        <button
                            type="button"
                            onClick={openReviewFlow}
                        >
                            Leave the First Review →
                        </button>

                    </div>
                )}


                {!loading &&
                    !error &&
                    reviews.length > 0 && (

                    <div className="reviews-grid">

                        {reviews.map((review) => {

                            const customerName =
                                review?.customer?.fullName ||
                                "Tile Revive Customer";

                            const initials =
                                customerName
                                    .split(" ")
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map(
                                        (part) =>
                                            part[0]
                                    )
                                    .join("")
                                    .toUpperCase();

                            return (
                                <article
                                    className="review-card"
                                    key={review.id}
                                >

                                    <div className="review-card-top">

                                        <div className="review-avatar">
                                            {initials || "TR"}
                                        </div>

                                        <div className="review-customer">

                                            <strong>
                                                {customerName}
                                            </strong>

                                            <span>
                                                {formatDate(
                                                    review.createdAt
                                                )}
                                            </span>

                                        </div>

                                        <span className="review-verified">
                                            ✓
                                        </span>

                                    </div>


                                    <div className="review-rating-row">

                                        <Stars
                                            rating={
                                                review.rating
                                            }
                                        />

                                    </div>


                                    {review.product?.name && (
                                        <div className="review-product">
                                            {review.product.name}
                                        </div>
                                    )}


                                    <p className="review-comment">
                                        {review.comment ||
                                            "Great Tile Revive experience."}
                                    </p>

                                </article>
                            );
                        })}

                    </div>
                )}

            </section>


            {showCustomerAuth && (
                <CustomerAuth
                    onClose={() =>
                        setShowCustomerAuth(false)
                    }
                    onSuccess={
                        handleCustomerAuthSuccess
                    }
                />
            )}


            {showReviewForm && (
                <div
                    className="review-modal-backdrop"
                    onMouseDown={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeReviewForm();
                        }

                    }}
                >

                    <div className="review-modal">

                        <button
                            type="button"
                            className="review-modal-close"
                            onClick={closeReviewForm}
                            aria-label="Close review form"
                        >
                            ×
                        </button>

                        <span className="reviews-section-eyebrow">
                            YOUR EXPERIENCE
                        </span>

                        <h2>
                            Leave a Review
                        </h2>

                        <p className="review-modal-subtitle">
                            Reviews are available to customers
                            who have purchased from Tile Revive.
                        </p>


                        {productsLoading ? (

                            <div className="review-form-loading">
                                Loading your purchased
                                products...
                            </div>

                        ) : (

                            <form
                                onSubmit={
                                    handleSubmitReview
                                }
                                className="review-form"
                            >

                                <label>
                                    Product
                                </label>

                                <select
                                    value={
                                        selectedProduct
                                    }
                                    onChange={(event) =>
                                        setSelectedProduct(
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        reviewSubmitting ||
                                        !reviewProducts.length
                                    }
                                >

                                    <option value="">
                                        Select a purchased product
                                    </option>

                                    {reviewProducts.map(
                                        (product) => (
                                            <option
                                                key={
                                                    product.id
                                                }
                                                value={
                                                    product.id
                                                }
                                            >
                                                {product.name}
                                            </option>
                                        )
                                    )}

                                </select>


                                <label>
                                    Your rating
                                </label>

                                <div
                                    className="review-rating-picker"
                                    role="radiogroup"
                                    aria-label="Choose your rating"
                                >

                                    {[1, 2, 3, 4, 5].map(
                                        (star) => (

                                            <button
                                                key={star}
                                                type="button"
                                                className={
                                                    star <=
                                                    reviewRating
                                                        ? "selected"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    setReviewRating(
                                                        star
                                                    )
                                                }
                                                aria-label={`${star} star`}
                                            >
                                                ★
                                            </button>

                                        )
                                    )}

                                </div>


                                <label>
                                    Your review
                                </label>

                                <textarea
                                    value={
                                        reviewComment
                                    }
                                    onChange={(event) =>
                                        setReviewComment(
                                            event.target.value
                                        )
                                    }
                                    maxLength={1000}
                                    rows={5}
                                    placeholder="Tell us about your Tile Revive experience..."
                                    disabled={
                                        reviewSubmitting
                                    }
                                />

                                <div className="review-character-count">
                                    {reviewComment.length}/1000
                                </div>


                                {reviewSubmitError && (
                                    <div className="review-submit-error">
                                        {reviewSubmitError}
                                    </div>
                                )}


                                {reviewSubmitSuccess && (
                                    <div className="review-submit-success">
                                        {reviewSubmitSuccess}
                                    </div>
                                )}


                                <button
                                    type="submit"
                                    className="review-submit-button"
                                    disabled={
                                        reviewSubmitting ||
                                        !reviewProducts.length
                                    }
                                >
                                    {reviewSubmitting
                                        ? "Submitting..."
                                        : "Submit Review →"}
                                </button>

                            </form>

                        )}

                    </div>

                </div>
            )}

        </main>
    );
}


export default Reviews;



