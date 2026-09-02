import { useState } from "react";
import { Link } from "react-router-dom";
import stainedTilesImage from "../../assets/cleaning/stained-tiles-before-after.png";

function StainedTiles() {
    const [showDetails, setShowDetails] = useState(false);

    return (
        <main className="cleaning-detail-page">

            {/* =====================================================
                HERO
            ===================================================== */}

            <section className="cleaning-detail-hero">

                <div className="container">

                    <Link
                        to="/#cleaning-areas"
                        className="cleaning-back-link"
                    >
                        ← Back to cleaning areas
                    </Link>

                    <div className="cleaning-detail-hero-grid">

                        <div className="cleaning-detail-content">

                            <span className="section-eyebrow">
                                TILE REVIVE • TILES
                            </span>

                            <h1>
                                Stained &
                                <span> Discoloured Tiles</span>
                            </h1>

                            <p>
                                Bring tired-looking tile surfaces back to
                                life. Tile Revive helps tackle stubborn dirt,
                                stains and surface buildup affecting suitable
                                tile surfaces.
                            </p>

                            <div className="cleaning-detail-actions">

                                <Link
                                    to="/shop"
                                    className="btn btn-primary"
                                >
                                    Shop Tile Revive →
                                </Link>

                                <a
                                    href="#before-after"
                                    className="cleaning-secondary-button"
                                >
                                    See the transformation
                                </a>

                            </div>

                        </div>

                        <div className="cleaning-detail-visual">

                            <div className="cleaning-detail-image-card">

                                <img
                                    src={stainedTilesImage}
                                    alt="Before and after stained tile cleaning"
                                    className="cleaning-detail-image"
                                />

                                <div className="cleaning-image-label cleaning-label-before">
                                    <span>BEFORE</span>
                                    <strong>Stained</strong>
                                </div>

                                <div className="cleaning-image-label cleaning-label-after">
                                    <span>AFTER</span>
                                    <strong>REVIVED</strong>
                                </div>

                                <div className="cleaning-image-center-line">
                                    <span>↔</span>
                                </div>

                                <div className="cleaning-image-hover-content">

                                    <span>
                                        TILE REVIVE
                                    </span>

                                    <strong>
                                        See the difference
                                    </strong>

                                    <button
                                        type="button"
                                        className="cleaning-image-button"
                                        onClick={() =>
                                            setShowDetails((current) => !current)
                                        }
                                    >
                                        {showDetails
                                            ? "Hide details"
                                            : "Explore result"}
                                        <span>→</span>
                                    </button>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </section>


            {/* =====================================================
                BEFORE / AFTER
            ===================================================== */}

            <section
                id="before-after"
                className="before-after-section"
            >

                <div className="container">

                    <div className="before-after-header">

                        <span className="section-eyebrow">
                            SEE THE DIFFERENCE
                        </span>

                        <h2>
                            From dull to
                            <span> revived.</span>
                        </h2>

                        <p>
                            See how the appearance of a stained surface
                            can be transformed with the right cleaning care.
                        </p>

                    </div>

                    <div className="before-after-wrapper">

                        <div className="before-after-image-real">

                            <img
                                src={stainedTilesImage}
                                alt="Stained tiles before and after cleaning"
                            />

                            <div className="real-before-label">
                                BEFORE
                            </div>

                            <div className="real-after-label">
                                AFTER
                            </div>

                            <div className="real-center-divider">
                                <span>↔</span>
                            </div>

                        </div>

                    </div>

                </div>

            </section>


            {/* =====================================================
                INFORMATION
            ===================================================== */}

            <section
                className="cleaning-information-section"
                id="how-it-works"
            >

                <div className="container">

                    <div className="cleaning-information-grid">

                        <div>

                            <span className="section-eyebrow">
                                THE PROBLEM
                            </span>

                            <h2>
                                Why tiles lose their
                                <span> clean appearance.</span>
                            </h2>

                            <p>
                                Everyday traffic, dirt, stains and surface
                                buildup can gradually make tiled areas appear
                                dull, tired or discoloured.
                            </p>

                            <p>
                                Tile Revive is designed to help tackle suitable
                                surface buildup and improve the appearance of
                                appropriate tile surfaces.
                            </p>

                        </div>

                        <div className="cleaning-benefits">

                            <div className="cleaning-benefit">
                                <span>01</span>

                                <div>
                                    <h3>
                                        Surface buildup
                                    </h3>

                                    <p>
                                        Helps tackle dirt and buildup affecting
                                        suitable tile surfaces.
                                    </p>
                                </div>
                            </div>

                            <div className="cleaning-benefit">
                                <span>02</span>

                                <div>
                                    <h3>
                                        Stains & discolouration
                                    </h3>

                                    <p>
                                        Designed for suitable cleaning
                                        applications where stains affect
                                        the appearance of the surface.
                                    </p>
                                </div>
                            </div>

                            <div className="cleaning-benefit">
                                <span>03</span>

                                <div>
                                    <h3>
                                        Refreshed appearance
                                    </h3>

                                    <p>
                                        Helps surfaces look cleaner, fresher
                                        and better maintained.
                                    </p>
                                </div>
                            </div>

                        </div>

                    </div>

                </div>

            </section>


            {/* =====================================================
                HOW TO USE
            ===================================================== */}

            <section className="cleaning-process-section">

                <div className="container">

                    <div className="cleaning-process-header">

                        <span className="section-eyebrow">
                            SIMPLE PROCESS
                        </span>

                        <h2>
                            How to clean
                            <span> suitable tiles.</span>
                        </h2>

                    </div>

                    <div className="cleaning-process-grid">

                        <div className="cleaning-process-card">
                            <span>01</span>

                            <h3>
                                Prepare
                            </h3>

                            <p>
                                Remove loose dirt and prepare the surface
                                before cleaning.
                            </p>
                        </div>

                        <div className="cleaning-process-card">
                            <span>02</span>

                            <h3>
                                Apply
                            </h3>

                            <p>
                                Apply Tile Revive according to the recommended
                                product instructions.
                            </p>
                        </div>

                        <div className="cleaning-process-card">
                            <span>03</span>

                            <h3>
                                Agitate
                            </h3>

                            <p>
                                Where appropriate, agitate stubborn areas to
                                help loosen buildup.
                            </p>
                        </div>

                        <div className="cleaning-process-card">
                            <span>04</span>

                            <h3>
                                Rinse & reveal
                            </h3>

                            <p>
                                Rinse or wipe the surface thoroughly and
                                inspect the result.
                            </p>
                        </div>

                    </div>

                </div>

            </section>


            {/* =====================================================
                SAFETY
            ===================================================== */}

            <section className="cleaning-safety-section">

                <div className="container">

                    <div className="cleaning-safety-box">

                        <div className="cleaning-safety-icon">
                            !
                        </div>

                        <div>

                            <strong>
                                Important surface information
                            </strong>

                            <p>
                                Always test Tile Revive on a small,
                                inconspicuous area first. Do not use on
                                polished marble, granite, sandstone or wood.
                            </p>

                        </div>

                    </div>

                </div>

            </section>


            {/* =====================================================
                FINAL CTA
            ===================================================== */}

            <section className="cleaning-detail-cta">

                <div className="container">

                    <div className="cleaning-detail-cta-box">

                        <div>

                            <span className="section-eyebrow">
                                READY TO REVIVE?
                            </span>

                            <h2>
                                Bring your tiles
                                <span> back to life.</span>
                            </h2>

                            <p>
                                Find the right Tile Revive solution
                                for your cleaning needs.
                            </p>

                        </div>

                        <Link
                            to="/shop"
                            className="btn btn-primary"
                        >
                            Shop Tile Revive →
                        </Link>

                    </div>

                </div>

            </section>

        </main>
    );
}

export default StainedTiles;