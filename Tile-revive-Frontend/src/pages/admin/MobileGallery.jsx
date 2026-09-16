import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MobileGallery.css";

const API_URL =
    (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");

function MobileGallery() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        title: "",
        description: "",
        type: "BEFORE_AFTER",
        beforeImage: "",
        afterImage: "",
        imageUrl: "",
        featured: false,
    });

    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

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

    const handleSubmit = async (event) => {
        event.preventDefault();

        setSaving(true);
        setSuccess("");
        setError("");

        try {
            const token =
                localStorage.getItem("accessToken");

            if (!token) {
                setError(
                    "Your admin session has expired. Please log in again."
                );
                return;
            }

            const payload = {
                title: form.title.trim(),

                description:
                    form.description.trim(),

                type: form.type,

                imageUrl:
                    form.type === "PRODUCT" ||
                    form.type === "GENERAL"
                        ? form.imageUrl.trim()
                        : null,

                beforeImage:
                    form.type === "BEFORE_AFTER"
                        ? form.beforeImage.trim()
                        : null,

                afterImage:
                    form.type === "BEFORE_AFTER"
                        ? form.afterImage.trim()
                        : null,

                featured: form.featured,
            };

            if (!payload.title) {
                throw new Error(
                    "Please enter a title."
                );
            }

            if (
                form.type === "BEFORE_AFTER" &&
                (!payload.beforeImage ||
                    !payload.afterImage)
            ) {
                throw new Error(
                    "Please provide both the Before and After image URLs."
                );
            }

            if (
                (form.type === "PRODUCT" ||
                    form.type === "GENERAL") &&
                !payload.imageUrl
            ) {
                throw new Error(
                    "Please provide an image URL."
                );
            }

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
                    "Unable to add gallery item."
                );
            }

            setSuccess(
                "Gallery item added successfully!"
            );

            setForm({
                title: "",
                description: "",
                type: "BEFORE_AFTER",
                beforeImage: "",
                afterImage: "",
                imageUrl: "",
                featured: false,
            });

        } catch (err) {
            console.error(
                "MOBILE GALLERY ERROR:",
                err
            );

            setError(
                err.message ||
                "Something went wrong."
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="mobile-gallery-page">

            <div className="mobile-gallery-container">

                {/* HEADER */}

                <header className="mobile-gallery-header">

                    <div className="mobile-gallery-logo">
                        TR
                    </div>

                    <span>
                        TILE REVIVE
                    </span>

                    <h1>
                        Add Gallery Item
                    </h1>

                    <p>
                        Add a new transformation
                        directly from your phone.
                    </p>

                </header>


                {/* SUCCESS */}

                {success && (
                    <div className="mobile-gallery-message success">
                        <strong>
                            ✓ Added successfully
                        </strong>

                        <span>
                            {success}
                        </span>
                    </div>
                )}


                {/* ERROR */}

                {error && (
                    <div className="mobile-gallery-message error">
                        <strong>
                            Something went wrong
                        </strong>

                        <span>
                            {error}
                        </span>
                    </div>
                )}


                {/* FORM */}

                <form
                    className="mobile-gallery-form"
                    onSubmit={handleSubmit}
                >

                    {/* TITLE */}

                    <div className="mobile-form-group">

                        <label>
                            Title
                        </label>

                        <input
                            type="text"
                            name="title"
                            value={form.title}
                            onChange={
                                handleChange
                            }
                            placeholder="e.g. Bathroom Tile Revival"
                        />

                    </div>


                    {/* TYPE */}

                    <div className="mobile-form-group">

                        <label>
                            Gallery Type
                        </label>

                        <select
                            name="type"
                            value={form.type}
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

                    <div className="mobile-form-group">

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
                            placeholder="Describe the transformation..."
                            rows="4"
                        />

                    </div>


                    {/* BEFORE / AFTER */}

                    {form.type ===
                    "BEFORE_AFTER" ? (
                        <>

                            <div className="mobile-form-group">

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

                            </div>


                            <div className="mobile-form-group">

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

                            </div>

                        </>
                    ) : (

                        <div className="mobile-form-group">

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

                        </div>

                    )}


                    {/* FEATURED */}

                    <label className="mobile-featured">

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
                            Feature this item
                        </span>

                    </label>


                    {/* SUBMIT */}

                    <button
                        type="submit"
                        className="mobile-gallery-submit"
                        disabled={saving}
                    >
                        {saving
                            ? "Adding..."
                            : "Add to Gallery"}
                    </button>


                    {/* BACK */}

                    <button
                        type="button"
                        className="mobile-gallery-back"
                        onClick={() =>
                            navigate(
                                "/admin/gallery"
                            )
                        }
                    >
                        Back to Admin Gallery
                    </button>

                </form>

            </div>

        </main>
    );
}

export default MobileGallery;
