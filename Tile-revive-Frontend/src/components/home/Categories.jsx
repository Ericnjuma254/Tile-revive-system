import { useEffect, useState } from "react";
import { getCategories } from "../../services/api";

function Categories() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let mounted = true;

        const loadCategories = async () => {
            try {
                setLoading(true);
                setError("");

                const data = await getCategories();

                console.log("Categories API data:", data);

                if (!mounted) return;

                const safeCategories = Array.isArray(data)
                    ? data
                        .filter((category) => category != null)
                        .map((category, index) => ({
                            id:
                                category.id ??
                                category.categoryId ??
                                index,
                            name:
                                String(
                                    category.name ??
                                    category.title ??
                                    category.categoryName ??
                                    ""
                                ).trim()
                        }))
                        .filter((category) => category.name.length > 0)
                    : [];

                console.log("Safe categories:", safeCategories);

                setCategories(safeCategories);

            } catch (err) {
                console.error("Failed to load categories:", err);

                if (mounted) {
                    setError("Unable to load categories.");
                }

            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadCategories();

        return () => {
            mounted = false;
        };
    }, []);

    const getCategoryIcon = (name) => {
        const categoryName =
            String(name ?? "").trim().toLowerCase();

        if (categoryName.includes("drain")) {
            return "🚿";
        }

        if (categoryName.includes("access")) {
            return "🧽";
        }

        if (categoryName.includes("wholesale")) {
            return "📦";
        }

        if (categoryName.includes("tile")) {
            return "✨";
        }

        return "🧹";
    };

    return (
        <section
            id="categories"
            className="categories-section"
        >
            <div className="container">

                <div className="section-heading">

                    <span className="section-eyebrow">
                        SHOP BY CATEGORY
                    </span>

                    <h2 className="section-title">
                        Cleaning Solutions for Every Need
                    </h2>

                    <p>
                        Explore Tile Revive products designed
                        for professional and everyday cleaning.
                    </p>

                </div>

                {loading && (
                    <p className="category-status">
                        Loading categories...
                    </p>
                )}

                {error && (
                    <p className="category-status">
                        {error}
                    </p>
                )}

                {!loading &&
                    !error &&
                    categories.length > 0 && (

                    <div className="category-grid">

                        {categories.map((category) => {

                            const categoryName =
                                String(
                                    category.name ?? ""
                                ).trim();

                            return (
                                <a
                                    key={category.id}
                                    href={`/shop?category=${encodeURIComponent(
                                        categoryName
                                    )}`}
                                    className="category-card"
                                >

                                    <div className="category-icon">
                                        {getCategoryIcon(
                                            categoryName
                                        )}
                                    </div>

                                    <div>

                                        <h3>
                                            {categoryName}
                                        </h3>

                                        <span>
                                            Shop category →
                                        </span>

                                    </div>

                                </a>
                            );
                        })}

                    </div>
                )}

                {!loading &&
                    !error &&
                    categories.length === 0 && (

                    <p className="category-status">
                        No categories available.
                    </p>
                )}

            </div>
        </section>
    );
}

export default Categories;
