import { Link } from "react-router-dom";

function Hero() {
    return (
        <section className="premium-hero">

            {/* Luxury architectural background */}
            <div className="premium-hero-background">
                <div className="premium-hero-glow"></div>
                <div className="premium-hero-line"></div>

                <div className="premium-hero-texture"></div>
                <div className="premium-hero-purple-glow"></div>
            </div>

            <div className="premium-hero-container">

                {/* CONTENT */}
                <div className="premium-hero-content">

                    <div className="premium-hero-eyebrow">
                        <span></span>
                        PREMIUM SURFACE CARE
                        <span></span>
                    </div>

                    <h1>
                        Bring Back
                        <em>the Original Shine.</em>
                    </h1>

                    <p className="premium-hero-description">
                        Powerful cleaning solutions designed to help
                        restore the appearance of tiles, grout and
                        everyday surfaces without replacing them.
                    </p>

                    <div className="premium-hero-actions">

                        <Link
                            to="/shop"
                            className="premium-primary-button"
                        >
                            Shop Tile Revive
                            <span>→</span>
                        </Link>

                        <a
                            href="#results"
                            className="premium-secondary-button"
                        >
                            See the Results
                            <span>↓</span>
                        </a>

                    </div>

                    <div className="premium-hero-trust">

                        <div className="premium-trust-item">
                            <strong>15,000+</strong>
                            <small>Customers</small>
                        </div>

                        <div className="premium-trust-divider"></div>

                        <div className="premium-trust-item">
                            <strong>M-Pesa</strong>
                            <small>Secure payment</small>
                        </div>

                        <div className="premium-trust-divider"></div>

                        <div className="premium-trust-item">
                            <strong>COD</strong>
                            <small>Available</small>
                        </div>

                    </div>

                </div>

                {/* LUXURY VISUAL */}
                <div className="premium-hero-product">

                    <div className="premium-product-backdrop"></div>

                    <div className="premium-product-ring"></div>

                    <div className="premium-product-image-wrap">

                        <div className="premium-product-placeholder">

                            <div className="premium-product-monogram">
                                TR
                            </div>

                            <div className="premium-product-placeholder-copy">
                                <strong>TILE REVIVE</strong>
                                <span>PREMIUM SURFACE CARE</span>
                            </div>

                        </div>

                    </div>

                    <div className="premium-product-label">
                        <span>01</span>
                        SURFACE
                        <strong>REVIVAL</strong>
                    </div>

                    <div className="premium-product-note">
                        <span>✦</span>
                        <div>
                            <strong>Revive.</strong>
                            <small>Don't replace.</small>
                        </div>
                    </div>

                </div>

            </div>

            <div className="premium-hero-bottom">
                <div className="premium-hero-bottom-inner">
                    <span>DEEP CLEANING SOLUTIONS</span>

                    <div className="premium-bottom-line"></div>

                    <span>
                        NAIROBI · KENYA
                    </span>
                </div>
            </div>

        </section>
    );
}

export default Hero;
