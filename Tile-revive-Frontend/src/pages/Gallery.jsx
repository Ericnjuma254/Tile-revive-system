import { useEffect, useMemo, useState } from "react";
import "./Gallery.css";

const API_URL = "http://192.168.0.101:5000";

function Gallery() {
    const [gallery, setGallery] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState("ALL");

    useEffect(() => {
        const fetchGallery = async () => {
            try {
                const response = await fetch(
                    `${API_URL}/api/gallery/public`
                );

                const data = await response.json();

                if (data.success) {
                    setGallery(data.gallery || []);
                }
            } catch (error) {
                console.error(
                    "Gallery fetch error:",
                    error
                );
            } finally {
                setLoading(false);
            }
        };

        fetchGallery();
    }, []);

    const filteredGallery = useMemo(() => {
        if (activeFilter === "ALL") {
            return gallery;
        }

        return gallery.filter(
            item => item.type === activeFilter
        );
    }, [gallery, activeFilter]);

    return (
        <main className="gallery-page">

            {/* =====================================================
                HERO
            ===================================================== */}

            <section className="gallery-hero">

                <div className="gallery-hero-background" />

                <div className="gallery-hero-overlay" />

                <div className="gallery-hero-content">

                    <span className="gallery-eyebrow">
                        TILE REVIVE SOLUTIONS
                    </span>

                    <h1>
                        See the
                        <span> Difference.</span>
                    </h1>

                    <p>
                        Real transformations. Real results.
                        Discover how Tile Revive brings
                        stained, dull and discoloured surfaces
                        back to life.
                    </p>

                    <a
                        href="/shop"
                        className="gallery-hero-button"
                    >
                        Restore Your Tiles
                        <span>→</span>
                    </a>

                </div>

                <div className="gallery-hero-bottom">
                    <span>REAL RESULTS</span>
                    <span className="hero-line" />
                    <span>REAL REVIVAL</span>
                </div>

            </section>


            {/* =====================================================
                INTRO
            ===================================================== */}

            <section className="gallery-intro">

                <div>

                    <span className="section-kicker">
                        OUR WORK
                    </span>

                    <h2>
                        From dull to
                        <span> revived.</span>
                    </h2>

                </div>

                <p>
                    Browse some of our featured cleaning
                    transformations and see what Tile Revive
                    can do for your surfaces.
                </p>

            </section>


            {/* =====================================================
                FILTERS
            ===================================================== */}

            <section className="gallery-controls">

                <button
                    className={
                        activeFilter === "ALL"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveFilter("ALL")
                    }
                >
                    All
                </button>

                <button
                    className={
                        activeFilter === "BEFORE_AFTER"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveFilter(
                            "BEFORE_AFTER"
                        )
                    }
                >
                    Before & After
                </button>

                <button
                    className={
                        activeFilter === "PRODUCT"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveFilter("PRODUCT")
                    }
                >
                    Products
                </button>

                <button
                    className={
                        activeFilter === "GENERAL"
                            ? "active"
                            : ""
                    }
                    onClick={() =>
                        setActiveFilter("GENERAL")
                    }
                >
                    Our Work
                </button>

            </section>


            {/* =====================================================
                GALLERY
            ===================================================== */}

            <section className="gallery-grid">

                {loading ? (

                    <div className="gallery-loading">
                        <div className="gallery-spinner" />
                        <p>
                            Loading transformations...
                        </p>
                    </div>

                ) : filteredGallery.length === 0 ? (

                    <div className="gallery-empty">

                        <div className="empty-icon">
                            ✦
                        </div>

                        <h3>
                            Transformations coming soon
                        </h3>

                        <p>
                            We're preparing our latest
                            Tile Revive transformations.
                        </p>

                    </div>

                ) : (

                    filteredGallery.map(item => (

                        <article
                            className={`gallery-card ${
                                item.type ===
                                "BEFORE_AFTER"
                                    ? "before-after-card"
                                    : ""
                            }`}
                            key={item.id}
                        >

                            {/* =================================================
                                BEFORE / AFTER
                            ================================================= */}

                            {item.type ===
                            "BEFORE_AFTER" ? (

                                <div className="before-after-wrapper">

                                    <div className="before-image">

                                        <img
                                            src={
                                                item.beforeImage
                                            }
                                            alt={`${item.title} before`}
                                        />

                                        <span className="image-label">
                                            BEFORE
                                        </span>

                                    </div>

                                    <div className="after-image">

                                        <img
                                            src={
                                                item.afterImage
                                            }
                                            alt={`${item.title} after`}
                                        />

                                        <span className="image-label after-label">
                                            AFTER
                                        </span>

                                    </div>

                                    <div className="transformation-divider">
                                        <span>↔</span>
                                    </div>

                                </div>

                            ) : (

                                <div className="gallery-image">

                                    <img
                                        src={item.imageUrl}
                                        alt={item.title}
                                    />

                                </div>

                            )}


                            {/* =================================================
                                CARD CONTENT
                            ================================================= */}

                            <div className="gallery-card-content">

                                <div className="gallery-card-top">

                                    <div>

                                        <span className="gallery-type">
                                            {item.type ===
                                            "BEFORE_AFTER"
                                                ? "TRANSFORMATION"
                                                : item.type}
                                        </span>

                                        <h3>
                                            {item.title}
                                        </h3>

                                    </div>

                                    {item.featured && (
                                        <span className="featured-badge">
                                            FEATURED
                                        </span>
                                    )}

                                </div>

                                {item.description && (
                                    <p>
                                        {item.description}
                                    </p>
                                )}

                            </div>

                        </article>

                    ))

                )}

            </section>


            {/* =====================================================
                CTA
            ===================================================== */}

            <section className="gallery-cta">

                <div className="gallery-cta-content">

                    <span className="section-kicker">
                        READY FOR YOURS?
                    </span>

                    <h2>
                        Your tiles deserve
                        <span> a revival.</span>
                    </h2>

                    <p>
                        Bring back the original shine,
                        freshness and beauty of your
                        surfaces with Tile Revive.
                    </p>

                    <a
                        href="/shop"
                        className="gallery-cta-button"
                    >
                        Shop Tile Revive
                        <span>→</span>
                    </a>

                </div>

            </section>

        </main>
    );
}

export default Gallery;