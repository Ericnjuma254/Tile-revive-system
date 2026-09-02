import heroImage from "../../assets/hero.png";
import { Link } from "react-router-dom";

function Hero() {
    return (
        <section className="hero-section">

            <div className="container hero-container">

                {/* =========================
                    HERO CONTENT
                ========================= */}

                <div className="hero-content">

                    <div className="hero-eyebrow">
                        <span className="hero-eyebrow-dot"></span>
                        PROFESSIONAL CLEANING SOLUTIONS
                    </div>

                    <h1 className="hero-title">
                        Bring Back
                        <span>the Original Shine.</span>
                    </h1>

                    <p className="hero-description">
                        Give tired, stained and dull surfaces a fresh start.
                        Tile Revive is made to help restore the clean,
                        refreshed look your home deserves.
                    </p>

                    <div className="hero-actions">

                        <Link
                            to="/shop"
                            className="btn btn-primary hero-button"
                        >
                            Shop Tile Revive
                            <span>→</span>
                        </Link>

                        <a
                            href="#cleaning-areas"
                            className="hero-secondary-button"
                        >
                            Explore what it cleans
                            <span>↓</span>
                        </a>

                    </div>

                    {/* TRUST POINTS */}

                    <div className="hero-trust">

                        <div className="hero-trust-item">
                            <span className="hero-trust-icon">✓</span>
                            <div>
                                <strong>Powerful Cleaning</strong>
                                <small>Made for suitable surfaces</small>
                            </div>
                        </div>

                        <div className="hero-trust-item">
                            <span className="hero-trust-icon">✓</span>
                            <div>
                                <strong>Easy to Use</strong>
                                <small>Simple cleaning process</small>
                            </div>
                        </div>

                        <div className="hero-trust-item">
                            <span className="hero-trust-icon">✓</span>
                            <div>
                                <strong>Nairobi Delivery</strong>
                                <small>Convenient delivery options</small>
                            </div>
                        </div>

                    </div>

                </div>


                {/* =========================
                    HERO PRODUCT VISUAL
                ========================= */}

                <div className="hero-visual">

                    <div className="hero-product-scene">

                        <div className="hero-product-glow"></div>

                        <div className="hero-product-ring ring-one"></div>
                        <div className="hero-product-ring ring-two"></div>

                        <div className="hero-product-card">

                            <div className="hero-product-badge">
                                TILE REVIVE
                            </div>

                            <img
                                src={heroImage}
                                alt="Tile Revive cleaning solution"
                                className="hero-image"
                            />

                        </div>

                        {/* FLOATING VALUE CARD */}

                        <div className="hero-floating-card hero-floating-top">

                            <span className="floating-icon">
                                ✦
                            </span>

                            <div>
                                <strong>Revive the Look</strong>
                                <span>Fresh-looking surfaces</span>
                            </div>

                        </div>


                        {/* FLOATING TRUST CARD */}

                        <div className="hero-floating-card hero-floating-bottom">

                            <span className="floating-check">
                                ✓
                            </span>

                            <div>
                                <strong>Shop With Confidence</strong>
                                <span>M-Pesa • Cash on Delivery</span>
                            </div>

                        </div>

                    </div>

                </div>

            </div>

        </section>
    );
}

export default Hero;