import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
const mobileGalleryUrl =
    `${window.location.origin}/admin/gallery/mobile`;
import { QRCodeSVG } from "qrcode.react";
import "./AdminGallery.css";

const API_URL =
    (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");

function AdminGallery() {
    const navigate = useNavigate();

    const [gallery, setGallery] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [form, setForm] = useState({
        title: "",
        description: "",
        type: "BEFORE_AFTER",
        imageUrl: "",
        beforeImage: "",
        afterImage: "",
        featured: false,
    });

    // =========================================================
    // AUTHENTICATION
    // =========================================================

    const getToken = () => {
        return localStorage.getItem("accessToken");
    };

    const requireAuth = () => {
        const token = getToken();

        if (!token) {
            navigate("/admin/login", {
                replace: true,
            });

            return null;
        }

        return token;
    };

    // =========================================================
    // LOAD GALLERY
    // =========================================================

    const loadGallery = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                `${API_URL}/api/gallery/public`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to load gallery."
                );
            }

            setGallery(
                Array.isArray(data.gallery)
                    ? data.gallery
                    : []
            );
        } catch (err) {
            console.error(
                "ADMIN GALLERY ERROR:",
                err
            );

            setError(
                err.message ||
                "Unable to load gallery."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGallery();
    }, []);

    // =========================================================
    // FORM CHANGE
    // =========================================================

    const handleChange = (event) => {
        const {
            name,
            value,
            type,
            checked,
        } = event.target;

        setForm((current) => ({
            ...current,

            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        }));
    };

    // =========================================================
    // RESET FORM
    // =========================================================

    const resetForm = () => {
        setForm({
            title: "",
            description: "",
            type: "BEFORE_AFTER",
            imageUrl: "",
            beforeImage: "",
            afterImage: "",
            featured: false,
        });

        setError("");
        setSuccess("");
    };

    // =========================================================
    // ADD GALLERY ITEM
    // =========================================================

    const handleSubmit = async (event) => {
        event.preventDefault();

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const token = requireAuth();

            if (!token) {
                return;
            }

            const title = form.title.trim();
            const description =
                form.description.trim();

            const beforeImage =
                form.beforeImage.trim();

            const afterImage =
                form.afterImage.trim();

            const imageUrl =
                form.imageUrl.trim();

            if (!title) {
                throw new Error(
                    "Please enter a gallery title."
                );
            }

            if (
                form.type === "BEFORE_AFTER" &&
                (!beforeImage || !afterImage)
            ) {
                throw new Error(
                    "Please provide both the Before and After image URLs."
                );
            }

            if (
                (form.type === "PRODUCT" ||
                    form.type === "GENERAL") &&
                !imageUrl
            ) {
                throw new Error(
                    "Please provide an image URL."
                );
            }

            const payload = {
                title,
                description,
                type: form.type,

                imageUrl:
                    form.type === "PRODUCT" ||
                    form.type === "GENERAL"
                        ? imageUrl
                        : null,

                beforeImage:
                    form.type === "BEFORE_AFTER"
                        ? beforeImage
                        : null,

                afterImage:
                    form.type === "BEFORE_AFTER"
                        ? afterImage
                        : null,

                featured: Boolean(
                    form.featured
                ),
            };

            const response = await fetch(
                `${API_URL}/api/gallery`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`,
                    },

                    body: JSON.stringify(
                        payload
                    ),
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to create gallery item."
                );
            }

            setSuccess(
                "Gallery item added successfully."
            );

            resetForm();

            await loadGallery();

        } catch (err) {
            console.error(
                "CREATE GALLERY ERROR:",
                err
            );

            setError(
                err.message ||
                "Unable to add gallery item."
            );
        } finally {
            setSaving(false);
        }
    };

    // =========================================================
    // DELETE
    // =========================================================

    const handleDelete = async (id) => {
        const confirmed =
            window.confirm(
                "Are you sure you want to delete this gallery item?"
            );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setSuccess("");

            const token = requireAuth();

            if (!token) {
                return;
            }

            const response = await fetch(
                `${API_URL}/api/gallery/${id}`,
                {
                    method: "DELETE",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to delete gallery item."
                );
            }

            setSuccess(
                "Gallery item deleted successfully."
            );

            await loadGallery();

        } catch (err) {
            console.error(
                "DELETE GALLERY ERROR:",
                err
            );

            setError(
                err.message ||
                "Unable to delete gallery item."
            );
        }
    };

    // =========================================================
    // LOGOUT
    // =========================================================

    const handleLogout = () => {
        localStorage.removeItem(
            "accessToken"
        );

        localStorage.removeItem(
            "refreshToken"
        );

        navigate(
            "/admin/login",
            {
                replace: true,
            }
        );
    };

    // =========================================================
    // NAVIGATION
    // =========================================================

    const goTo = (path) => {
        navigate(path);
    };

    // =========================================================
    // PAGE
    // =========================================================

    return (
        <div className="admin-gallery-page">

            {/* =====================================================
                SIDEBAR
            ===================================================== */}

            <aside className="admin-gallery-sidebar">

                <div className="admin-gallery-brand">

                    <div className="admin-gallery-logo">
                        TR
                    </div>

                    <div>
                        <strong>
                            TILE REVIVE
                        </strong>

                        <span>
                            ADMIN PANEL
                        </span>
                    </div>

                </div>


                <nav className="admin-gallery-nav">

                    <button
                        onClick={() =>
                            goTo(
                                "/admin/dashboard"
                            )
                        }
                    >
                        <span>Dashboard</span>
                    </button>


                    <button
                        onClick={() =>
                            goTo(
                                "/admin/orders"
                            )
                        }
                    >
                        <span>Orders</span>
                    </button>


                    <button>
                        <span>Products</span>
                    </button>


                    <button>
                        <span>Inventory</span>
                    </button>


                    <button>
                        <span>Customers</span>
                    </button>


                    <button>
                        <span>Promotions</span>
                    </button>


                    <button>
                        <span>Carousel</span>
                    </button>


                    <button
                        className="active"
                    >
                        <span>Gallery</span>
                    </button>

                </nav>


                <div className="admin-gallery-sidebar-bottom">

                    <button>
                        Settings
                    </button>


                    <button
                        className="logout-button"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>

                </div>

            </aside>


            {/* =====================================================
                MAIN
            ===================================================== */}

            <main className="admin-gallery-main">

                {/* HEADER */}

                <header className="admin-gallery-header">

                    <div>

                        <p className="gallery-admin-eyebrow">
                            CONTENT MANAGEMENT
                        </p>

                        <h1>
                            Gallery
                        </h1>

                        <p>
                            Manage the transformations,
                            products and work displayed
                            on your public gallery.
                        </p>

                    </div>


                    <button
                        className="gallery-refresh-button"
                        onClick={loadGallery}
                        disabled={loading}
                    >
                        {loading
                            ? "Refreshing..."
                            : "Refresh Gallery"}
                    </button>

                </header>


                {/* =================================================
                    MESSAGES
                ================================================= */}

                {error && (
                    <div className="gallery-admin-message error">
                        <strong>
                            Something went wrong
                        </strong>

                        <span>
                            {error}
                        </span>
                    </div>
                )}


                {success && (
                    <div className="gallery-admin-message success">
                        <strong>
                            Success
                        </strong>

                        <span>
                            {success}
                        </span>
                    </div>
                )}

                {/* =================================================
                    MOBILE GALLERY UPLOAD
                ================================================= */}

                <section className="gallery-mobile-upload-card">

                    <div className="gallery-mobile-upload-content">

                        <div className="gallery-mobile-upload-text">

                            <span className="gallery-mobile-eyebrow">
                                MOBILE UPLOAD
                            </span>

                            <h2>
                                Add Gallery Photos From Your Phone
                            </h2>

                            <p>
                                Scan this QR code with your phone
                                to open the mobile gallery uploader.
                                You can then add your latest
                                transformations directly from the job site.
                            </p>

                            <div className="gallery-mobile-url">
                                <span>
                                    Mobile upload:
                                </span>

                                <strong>
                                    {mobileGalleryUrl}
                                </strong>
                            </div>

                        </div>


                        <div className="gallery-qr-wrapper">

                            <div className="gallery-qr-code">

                                <QRCodeSVG
                                    value={mobileGalleryUrl}
                                    size={190}
                                    level="H"
                                    includeMargin={true}
                                />

                            </div>

                            <span className="gallery-qr-label">
                                SCAN TO ADD GALLERY ITEM
                            </span>

                        </div>

                    </div>

                </section>

                {/* =================================================
                    CREATE FORM
                ================================================= */}

                <section className="gallery-admin-card">

                    <div className="gallery-admin-card-heading">

                        <div>

                            <span>
                                ADD NEW
                            </span>

                            <h2>
                                Gallery Item
                            </h2>

                        </div>

                        <div className="gallery-heading-icon">
                            +
                        </div>

                    </div>


                    <form
                        className="gallery-admin-form"
                        onSubmit={handleSubmit}
                    >

                        {/* TITLE */}

                        <div className="form-group">

                            <label>
                                Title
                            </label>

                            <input
                                type="text"
                                name="title"
                                value={
                                    form.title
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="e.g. Bathroom Tile Revival"
                            />

                        </div>


                        {/* TYPE */}

                        <div className="form-group">

                            <label>
                                Content Type
                            </label>

                            <select
                                name="type"
                                value={
                                    form.type
                                }
                                onChange={
                                    handleChange
                                }
                            >

                                <option value="BEFORE_AFTER">
                                    Before & After
                                </option>

                                <option value="PRODUCT">
                                    Product
                                </option>

                                <option value="GENERAL">
                                    Our Work
                                </option>

                            </select>

                        </div>


                        {/* DESCRIPTION */}

                        <div className="form-group full">

                            <label>
                                Description
                            </label>

                            <textarea
                                name="description"
                                value={
                                    form.description
                                }
                                onChange={
                                    handleChange
                                }
                                placeholder="Describe the transformation or project..."
                                rows="4"
                            />

                        </div>


                        {/* BEFORE / AFTER */}

                        {form.type ===
                        "BEFORE_AFTER" ? (
                            <>

                                <div className="form-group">

                                    <label>
                                        Before Image URL
                                    </label>

                                    <input
                                        type="url"
                                        name="beforeImage"
                                        value={
                                            form.beforeImage
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="https://..."
                                    />

                                    {form.beforeImage && (
                                        <div className="gallery-image-preview">
                                            <img
                                                src={
                                                    form.beforeImage
                                                }
                                                alt="Before preview"
                                                onError={(
                                                    event
                                                ) => {
                                                    event.currentTarget.style.display =
                                                        "none";
                                                }}
                                            />
                                        </div>
                                    )}

                                </div>


                                <div className="form-group">

                                    <label>
                                        After Image URL
                                    </label>

                                    <input
                                        type="url"
                                        name="afterImage"
                                        value={
                                            form.afterImage
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="https://..."
                                    />

                                    {form.afterImage && (
                                        <div className="gallery-image-preview">
                                            <img
                                                src={
                                                    form.afterImage
                                                }
                                                alt="After preview"
                                                onError={(
                                                    event
                                                ) => {
                                                    event.currentTarget.style.display =
                                                        "none";
                                                }}
                                            />
                                        </div>
                                    )}

                                </div>

                            </>
                        ) : (

                            <div className="form-group full">

                                <label>
                                    Image URL
                                </label>

                                <input
                                    type="url"
                                    name="imageUrl"
                                    value={
                                        form.imageUrl
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="https://..."
                                />

                                {form.imageUrl && (
                                    <div className="gallery-image-preview gallery-single-preview">
                                        <img
                                            src={
                                                form.imageUrl
                                            }
                                            alt="Gallery preview"
                                            onError={(
                                                event
                                            ) => {
                                                event.currentTarget.style.display =
                                                    "none";
                                            }}
                                        />
                                    </div>
                                )}

                            </div>

                        )}


                        {/* FEATURED */}

                        <label className="featured-checkbox">

                            <input
                                type="checkbox"
                                name="featured"
                                checked={
                                    form.featured
                                }
                                onChange={
                                    handleChange
                                }
                            />

                            <span>
                                Feature this item on the public gallery
                            </span>

                        </label>


                        {/* ACTIONS */}

                        <div className="gallery-form-actions">

                            <button
                                type="button"
                                className="gallery-secondary-button"
                                onClick={
                                    resetForm
                                }
                                disabled={saving}
                            >
                                Clear
                            </button>


                            <button
                                type="submit"
                                className="gallery-primary-button"
                                disabled={saving}
                            >
                                {saving
                                    ? "Adding..."
                                    : "Add to Gallery"}
                            </button>

                        </div>

                    </form>

                </section>


                {/* =================================================
                    EXISTING GALLERY
                ================================================= */}

                <section className="gallery-admin-card">

                    <div className="gallery-admin-card-heading">

                        <div>

                            <span>
                                PUBLISHED CONTENT
                            </span>

                            <h2>
                                Gallery Items
                            </h2>

                        </div>


                        <strong className="gallery-count">
                            {gallery.length}
                        </strong>

                    </div>


                    {loading ? (

                        <div className="gallery-admin-loading">

                            <div className="gallery-admin-spinner" />

                            <p>
                                Loading gallery...
                            </p>

                        </div>

                    ) : gallery.length === 0 ? (

                        <div className="gallery-admin-empty">

                            <div className="gallery-empty-icon">
                                ✦
                            </div>

                            <h3>
                                No gallery items yet
                            </h3>

                            <p>
                                Add your first transformation
                                using the form above.
                            </p>

                        </div>

                    ) : (

                        <div className="gallery-admin-grid">

                            {gallery.map(
                                (item) => (

                                    <article
                                        className="gallery-admin-item"
                                        key={
                                            item.id
                                        }
                                    >

                                        {/* IMAGE */}

                                        <div className="gallery-admin-image">

                                            {item.type ===
                                            "BEFORE_AFTER" ? (

                                                <div className="admin-before-after">

                                                    <div>
                                                        <img
                                                            src={
                                                                item.beforeImage
                                                            }
                                                            alt={`${item.title} before`}
                                                        />

                                                        <span>
                                                            BEFORE
                                                        </span>
                                                    </div>


                                                    <div>
                                                        <img
                                                            src={
                                                                item.afterImage
                                                            }
                                                            alt={`${item.title} after`}
                                                        />

                                                        <span>
                                                            AFTER
                                                        </span>
                                                    </div>

                                                </div>

                                            ) : (

                                                <img
                                                    src={
                                                        item.imageUrl
                                                    }
                                                    alt={
                                                        item.title
                                                    }
                                                />

                                            )}


                                            {item.featured && (
                                                <span className="admin-featured">
                                                    FEATURED
                                                </span>
                                            )}

                                        </div>


                                        {/* CONTENT */}

                                        <div className="gallery-admin-item-content">

                                            <span className="admin-gallery-type">
                                                {item.type ===
                                                "BEFORE_AFTER"
                                                    ? "TRANSFORMATION"
                                                    : item.type}
                                            </span>


                                            <h3>
                                                {
                                                    item.title
                                                }
                                            </h3>


                                            {item.description && (
                                                <p>
                                                    {
                                                        item.description
                                                    }
                                                </p>
                                            )}


                                            <button
                                                className="gallery-delete-button"
                                                onClick={() =>
                                                    handleDelete(
                                                        item.id
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>

                                        </div>

                                    </article>

                                )
                            )}

                        </div>

                    )}

                </section>

            </main>

        </div>
    );
}

export default AdminGallery;
