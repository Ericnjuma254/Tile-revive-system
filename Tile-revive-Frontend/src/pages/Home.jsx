import Hero from "../components/home/Hero";
import Categories from "../components/home/Categories";
import CleaningAreas from "../components/home/CleaningAreas";

function Home() {
    return (
        <main className="modern-home">
            <Hero />
            <Categories />
            <CleaningAreas />

            <section className="home-results-section">
                <div className="container">

                    <div className="home-section-header">
                        <span className="section-eyebrow">
                            SEE THE DIFFERENCE
                        </span>

                        <h2>
                            From Dirty to
                            <span> Revived.</span>
                        </h2>

                        <p>
                            See how Tile Revive helps restore the
                            appearance of everyday surfaces.
                        </p>
                    </div>

                    <div className="results-grid">

                        <article className="result-card result-large">
                            <div className="result-visual result-before">
                                <span>BEFORE</span>
                            </div>

                            <div className="result-info">
                                <strong>Built-up tile dirt</strong>
                                <p>
                                    Stubborn grime and surface buildup
                                    affecting the appearance of the floor.
                                </p>
                            </div>
                        </article>

                        <article className="result-card result-large">
                            <div className="result-visual result-after">
                                <span>AFTER</span>
                            </div>

                            <div className="result-info">
                                <strong>Freshly revived surface</strong>
                                <p>
                                    A cleaner-looking surface with a
                                    refreshed appearance.
                                </p>
                            </div>
                        </article>

                    </div>

                </div>
            </section>

            <section className="home-social-section">
                <div className="container">

                    <div className="social-layout">

                        <div className="social-content">

                            <span className="section-eyebrow">
                                FOLLOW TILE REVIVE
                            </span>

                            <h2>
                                Cleaning results.
                                <span> Real people.</span>
                            </h2>

                            <p>
                                Follow us on social media for cleaning
                                demonstrations, customer results,
                                product tips and satisfying transformations.
                            </p>

                            <div className="social-actions">
                                <a
                                    href="#"
                                    className="social-button"
                                >
                                    TikTok
                                </a>

                                <a
                                    href="#"
                                    className="social-button"
                                >
                                    Instagram
                                </a>

                                <a
                                    href="#"
                                    className="social-button"
                                >
                                    Facebook
                                </a>
                            </div>

                        </div>

                        <div className="social-feed">

                            <div className="social-video-card">
                                <div className="social-video-placeholder">
                                    <span>▶</span>
                                </div>

                                <div className="social-video-info">
                                    <strong>
                                        Watch Tile Revive in action
                                    </strong>

                                    <span>
                                        Cleaning tips & transformations
                                    </span>
                                </div>
                            </div>

                            <div className="social-video-card">
                                <div className="social-video-placeholder">
                                    <span>▶</span>
                                </div>

                                <div className="social-video-info">
                                    <strong>
                                        See customer results
                                    </strong>

                                    <span>
                                        Follow our latest videos
                                    </span>
                                </div>
                            </div>

                        </div>

                    </div>

                </div>
            </section>

            <section className="home-trust-section">
                <div className="container">

                    <div className="trust-grid">

                        <div className="trust-item">
                            <span>01</span>
                            <h3>Powerful Cleaning</h3>
                            <p>
                                Designed for suitable tile and surface
                                cleaning applications.
                            </p>
                        </div>

                        <div className="trust-item">
                            <span>02</span>
                            <h3>Easy to Use</h3>
                            <p>
                                A practical cleaning solution for homes,
                                businesses and professionals.
                            </p>
                        </div>

                        <div className="trust-item">
                            <span>03</span>
                            <h3>Fast Delivery</h3>
                            <p>
                                Get your cleaning products delivered
                                conveniently within Nairobi.
                            </p>
                        </div>

                        <div className="trust-item">
                            <span>04</span>
                            <h3>Shop With Confidence</h3>
                            <p>
                                Secure checkout with M-Pesa and
                                Cash on Delivery options.
                            </p>
                        </div>

                    </div>

                </div>
            </section>

                        <section className="home-cta-section">
                <div className="container">

                    <div className="home-cta">

                        <div>
                            <span className="section-eyebrow">
                                READY TO REVIVE?
                            </span>

                            <h2>
                                Give your surfaces
                                <span> a fresh start.</span>
                            </h2>

                            <p>
                                Find the right Tile Revive solution
                                for your cleaning needs.
                            </p>
                        </div>

                        <a
                            href="/shop"
                            className="btn btn-primary"
                        >
                            Shop Tile Revive →
                        </a>

                    </div>

                </div>
            </section>


            {/* =====================================================
                CUSTOMER REVIEWS
                ===================================================== */}

            <section
                id="results"
                className="home-results-section"
            >

                <div className="container">

                    <div className="home-reviews-header">

                        <span className="section-eyebrow">
                            CUSTOMER LOVE
                        </span>

                        <h2>
                            What Our Customers
                            <span> Say.</span>
                        </h2>

                        <p>
                            Real experiences from customers who
                            chose Tile Revive for their cleaning needs.
                        </p>

                    </div>

                </div>


                <div className="reviews-marquee">

                    <div className="reviews-track">

                        <article className="review-card">
                            <div className="review-stars">
                                ★★★★★
                            </div>

                            <p>
                                "Tile Revive made my floor look
                                completely different. The results
                                were amazing."
                            </p>

                            <strong>
                                Mary W.
                            </strong>

                            <span>
                                Nairobi
                            </span>
                        </article>


                        <article className="review-card">
                            <div className="review-stars">
                                ★★★★★
                            </div>

                            <p>
                                "Very impressed with the cleaning
                                results. I will definitely order
                                again."
                            </p>

                            <strong>
                                Brian K.
                            </strong>

                            <span>
                                Nairobi
                            </span>
                        </article>


                        <article className="review-card">
                            <div className="review-stars">
                                ★★★★★
                            </div>

                            <p>
                                "Easy to use and the tiles looked
                                noticeably cleaner after cleaning."
                            </p>

                            <strong>
                                Grace M.
                            </strong>

                            <span>
                                Kiambu
                            </span>
                        </article>


                        <article className="review-card">
                            <div className="review-stars">
                                ★★★★★
                            </div>

                            <p>
                                "Great product and very convenient
                                delivery. Highly recommended."
                            </p>

                            <strong>
                                David N.
                            </strong>

                            <span>
                                Nairobi
                            </span>
                        </article>


                        <article className="review-card">
                            <div className="review-stars">
                                ★★★★★
                            </div>

                            <p>
                                "I love how easy the product is to
                                use. My surfaces look much better."
                            </p>

                            <strong>
                                Sarah A.
                            </strong>

                            <span>
                                Nairobi
                            </span>
                        </article>


                        {/* DUPLICATE SET FOR SEAMLESS LOOP */}

                        <article className="review-card">
                            <div className="review-stars">
                                ★★★★★
                            </div>

                            <p>
                                "Tile Revive made my floor look
                                completely different. The results
                                were amazing."
                            </p>

                            <strong>
                                Mary W.
                            </strong>

                            <span>
                                Nairobi
                            </span>
                        </article>


                        <article className="review-card">
                            <div className="review-stars">
                                ★★★★★
                            </div>

                            <p>
                                "Very impressed with the cleaning
                                results. I will definitely order
                                again."
                            </p>

                            <strong>
                                Brian K.
                            </strong>

                            <span>
                                Nairobi
                            </span>
                        </article>


                        <article className="review-card">
                            <div className="review-stars">
                                ★★★★★
                            </div>

                            <p>
                                "Easy to use and the tiles looked
                                noticeably cleaner after cleaning."
                            </p>

                            <strong>
                                Grace M.
                            </strong>

                            <span>
                                Kiambu
                            </span>
                        </article>


                        <article className="review-card">
                            <div className="review-stars">
                                ★★★★★
                            </div>

                            <p>
                                "Great product and very convenient
                                delivery. Highly recommended."
                            </p>

                            <strong>
                                David N.
                            </strong>

                            <span>
                                Nairobi
                            </span>
                        </article>


                        <article className="review-card">
                            <div className="review-stars">
                                ★★★★★
                            </div>

                            <p>
                                "I love how easy the product is to
                                use. My surfaces look much better."
                            </p>

                            <strong>
                                Sarah A.
                            </strong>

                            <span>
                                Nairobi
                            </span>
                        </article>

                    </div>

                </div>

            </section>

        </main>
    );
}

export default Home;
