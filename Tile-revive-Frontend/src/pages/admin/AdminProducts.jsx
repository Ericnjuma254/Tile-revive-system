import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    getProducts,
    getCategories,
    createProduct,
    updateProduct,
    deleteProduct,
    uploadProductImage,
    removeProductImage,
    uploadProductGalleryImage,
    removeProductGalleryImage,
    getProductImages
} from "../../services/api";
import "./AdminProducts.css";

const API_BASE =
    (import.meta.env.VITE_API_URL || "").replace(/\/api\/?$/, "");

const getImageUrl = (image) => {
    if (!image) return "";

    if (
        image.startsWith("http://") ||
        image.startsWith("https://") ||
        image.startsWith("data:")
    ) {
        return image;
    }

    return `${API_BASE}${image.startsWith("/") ? image : `/${image}`}`;
}

const emptyForm = {
    name: "",
    description: "",
    shortDescription: "",
    sku: "",
    barcode: "",
    price: "",
    costPrice: "",
    discountPrice: "",
    stock: "",
    minimumStock: "5",
    category: "",
    brand: "",
    featured: false,
    status: "ACTIVE",
    image: ""
};

export default function AdminProducts() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [search, setSearch] = useState("");
    const [editingProduct, setEditingProduct] = useState(null);
    const [form, setForm] = useState(emptyForm);

    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState("");

    // Ten product image slots.
    // Slot 1 is the primary image; slots 2-10 are gallery images.
    const [galleryImages, setGalleryImages] = useState(
        Array.from({ length: 10 }, (_, index) => ({
            slot: index + 1,
            image: "",
            uploading: false
        }))
    );

    const galleryInputRefs = useRef([]);

    const fileInputRef = useRef(null);

    const loadProducts = async () => {
        try {
            setLoading(true);
            setError("");

            const data = await getProducts();
            setProducts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to load products.");
        } finally {
            setLoading(false);
        }
    }

    const loadCategories = async () => {
        try {
            const data = await getCategories();

            if (Array.isArray(data)) {
                setCategories(data);
            } else if (Array.isArray(data?.categories)) {
                setCategories(data.categories);
            } else {
                setCategories([]);
            }
        } catch (err) {
            console.warn("Categories could not be loaded:", err);
        }
    }

    useEffect(() => {
        loadProducts();
        loadCategories();
    }, []);

    const filteredProducts = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) return products;

        return products.filter((product) =>
            [
                product.name,
                product.sku,
                product.category,
                product.brand
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLowerCase().includes(term)
                )
        );
    }, [products, search]);

    const resetGalleryState = () => {
        setGalleryImages(
            Array.from({ length: 10 }, (_, index) => ({
                slot: index + 1,
                image: "",
                uploading: false
            }))
        );

        if (galleryInputRefs.current) {
            galleryInputRefs.current.forEach((input) => {
                if (input) input.value = "";
            });
        }
    }

    const normaliseGalleryResponse = (response) => {
        const images =
            response?.images ||
            response?.data?.images ||
            response?.product?.images ||
            [];

        const slots = Array.from({ length: 10 }, (_, index) => ({
            slot: index + 1,
            image: "",
            uploading: false
        }));

        if (Array.isArray(images)) {
            images.forEach((item) => {
                const slot = Number(
                    item?.slot ??
                    item?.sortOrder ??
                    item?.position ??
                    0
                );

                if (slot >= 1 && slot <= 10) {
                    slots[slot - 1].image =
                        item?.image ||
                        item?.url ||
                        item?.src ||
                        "";
                }
            });
        }

        return slots;
    }

    const loadProductGallery = async (productId) => {
        if (!productId) {
            resetGalleryState();
            return;
        }

        try {
            const response = await getProductImages(productId);
            setGalleryImages(normaliseGalleryResponse(response));
        } catch (err) {
            console.error("Failed to load product gallery:", err);
            resetGalleryState();
        }
    }

    const handleGalleryUpload = async (slot, file) => {
        console.log("GALLERY UPLOAD START:", {
            slot,
            fileName: file?.name,
            fileSize: file?.size,
            fileType: file?.type,
            productId: editingProduct?.id
        });

        if (!editingProduct?.id || !file) {
            console.warn("GALLERY UPLOAD BLOCKED:", {
                editingProductId: editingProduct?.id,
                hasFile: !!file
            });
            return;
        }

        if (!file.type.startsWith("image/")) {
            setError("Please select a JPG, PNG or WEBP image.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError("Each product image must be 5MB or smaller.");
            return;
        }

        setError("");
        setSuccess("");

        setGalleryImages((current) =>
            current.map((item) =>
                item.slot === slot
                    ? { ...item, uploading: true }
                    : item
            )
        );

        try {
            console.log("GALLERY API CALL:", {
                productId: editingProduct.id,
                slot,
                fileName: file.name
            });

            const response = await uploadProductGalleryImage(
                editingProduct.id,
                file,
                slot
            );

            console.log("GALLERY API RESPONSE:", response);

            const uploadedImage =
                response?.image ||
                response?.data?.image ||
                response?.product?.image ||
                response?.images?.find(
                    (item) =>
                        Number(item?.slot ?? item?.sortOrder) === slot
                )?.image ||
                "";

            if (uploadedImage) {
                setGalleryImages((current) =>
                    current.map((item) =>
                        item.slot === slot
                            ? {
                                  ...item,
                                  image: uploadedImage,
                                  uploading: false
                              }
                            : item
                    )
                );
            } else {
                await loadProductGallery(editingProduct.id);
            }

            // Refresh the product list so the primary thumbnail updates
            // immediately when Slot 1 is changed.
            await loadProducts();

            setSuccess(`Image ${slot} uploaded successfully.`);
        } catch (err) {
            console.error(err);

            setGalleryImages((current) =>
                current.map((item) =>
                    item.slot === slot
                        ? { ...item, uploading: false }
                        : item
                )
            );

            setError(
                err.message ||
                `Unable to upload image ${slot}.`
            );
        } finally {
            if (galleryInputRefs.current[slot - 1]) {
                galleryInputRefs.current[slot - 1].value = "";
            }
        }
    }

    const handleGalleryRemove = async (slot) => {
        if (!editingProduct?.id) {
            return;
        }

        const image = galleryImages.find(
            (item) => item.slot === slot
        )?.image;

        if (!image) {
            return;
        }

        const confirmed = window.confirm(
            `Remove image ${slot} from "${editingProduct.name}"?`
        );

        if (!confirmed) {
            return;
        }

        try {
            setError("");
            setSuccess("");

            await removeProductGalleryImage(
                editingProduct.id,
                slot
            );

            setGalleryImages((current) =>
                current.map((item) =>
                    item.slot === slot
                        ? {
                              ...item,
                              image: "",
                              uploading: false
                          }
                        : item
                )
            );

            await loadProducts();

            setSuccess(`Image ${slot} removed successfully.`);
        } catch (err) {
            console.error(err);
            setError(
                err.message ||
                `Unable to remove image ${slot}.`
            );
        }
    }
    const resetForm = () => {
        setEditingProduct(null);
        resetGalleryState();
        setForm(emptyForm);
        setSelectedFile(null);
        setPreview("");
        resetGalleryState();

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    const startCreate = () => {
        setSuccess("");
        setError("");
        resetForm();
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    const startEdit = (product) => {
        setSuccess("");
        setError("");

        setEditingProduct(product);

        loadProductGallery(product.id);

        setForm({
            name: product.name || "",
            description: product.description || "",
            shortDescription: product.shortDescription || "",
            sku: product.sku || "",
            barcode: product.barcode || "",
            price: product.price ?? "",
            costPrice: product.costPrice ?? "",
            discountPrice: product.discountPrice ?? "",
            stock: product.stock ?? "",
            minimumStock: product.minimumStock ?? "5",
            category: product.category || "",
            brand: product.brand || "",
            featured: Boolean(product.featured),
            status: product.status || "ACTIVE",
            image: product.image || ""
        });

        setSelectedFile(null);
        setPreview("");

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;

        setForm((current) => ({
            ...current,
            [name]: type === "checkbox" ? checked : value
        }));
    }

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            setSelectedFile(null);
            setPreview("");
            return;
        }

        if (!file.type.startsWith("image/")) {
            setError("Please select an image file.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError("Product images must be 5MB or smaller.");
            return;
        }

        setError("");
        setSelectedFile(file);

        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
    }

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.name.trim()) {
            setError("Product name is required.");
            return;
        }

        if (!form.price) {
            setError("Product price is required.");
            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const payload = {
                ...form,
                price: Number(form.price),
                costPrice:
                    form.costPrice === ""
                        ? null
                        : Number(form.costPrice),
                discountPrice:
                    form.discountPrice === ""
                        ? null
                        : Number(form.discountPrice),
                stock:
                    form.stock === ""
                        ? 0
                        : Number(form.stock),
                minimumStock:
                    form.minimumStock === ""
                        ? 5
                        : Number(form.minimumStock)
            };

            delete payload.image;

            let savedProduct;

            if (editingProduct) {
                savedProduct = await updateProduct(
                    editingProduct.id,
                    payload
                );
            } else {
                savedProduct = await createProduct(payload);
            }

            const product =
                savedProduct?.product ||
                savedProduct;

            setSuccess(
                editingProduct
                    ? "Product updated successfully."
                    : "Product created successfully."
            );

            resetForm();
            await loadProducts();
        } catch (err) {
            console.error(err);
            setImageUploading(false);
            setError(
                err.message ||
                "Unable to save product."
            );
        } finally {
            setSaving(false);
        }
    }

    const handleReplaceImage = async (product) => {
        const fileInput = document.createElement("input");

        fileInput.type = "file";
        fileInput.accept =
            "image/jpeg,image/jpg,image/png,image/webp";

        fileInput.onchange = async (event) => {
            const file = event.target.files?.[0];

            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                setError("Image must be 5MB or smaller.");
                return;
            }

            try {
                setImageUploading(true);
                setError("");
                setSuccess("");

                await uploadProductImage(
                    product.id,
                    file
                );

                setSuccess(
                    `"${product.name}" image updated successfully.`
                );

                await loadProducts();
            } catch (err) {
                console.error(err);
                setError(
                    err.message ||
                    "Failed to replace product image."
                );
            } finally {
                setImageUploading(false);
            }
        };

        fileInput.click();
    }

    const handleRemoveImage = async (product) => {
        const confirmed = window.confirm(
            `Remove the image for "${product.name}"?`
        );

        if (!confirmed) return;

        try {
            setImageUploading(true);
            setError("");
            setSuccess("");

            await removeProductImage(product.id);

            setSuccess(
                `"${product.name}" image removed successfully.`
            );

            await loadProducts();
        } catch (err) {
            console.error(err);
            setError(
                err.message ||
                "Failed to remove product image."
            );
        } finally {
            setImageUploading(false);
        }
    }

    const handleDelete = async (product) => {
        const confirmed = window.confirm(
            `Delete "${product.name}" permanently?`
        );

        if (!confirmed) return;

        try {
            setError("");
            setSuccess("");

            await deleteProduct(product.id);

            setSuccess(
                `"${product.name}" deleted successfully.`
            );

            if (editingProduct?.id === product.id) {
                resetForm();
            }

            await loadProducts();
        } catch (err) {
            console.error(err);
            setError(
                err.message ||
                "Failed to delete product."
            );
        }
    }

    return (
        <div className="admin-products-page">

            <div className="admin-products-header">
                <div>
                    <span className="admin-products-eyebrow">
                        INVENTORY MANAGEMENT
                    </span>

                    <h1>Products</h1>

                    <p>
                        Manage your products, pricing,
                        stock and product imagery.
                    </p>
                </div>

                <button
                    type="button"
                    className="admin-products-primary-btn"
                    onClick={startCreate}
                >
                    + Add Product
                </button>
            </div>

            {error && (
                <div className="admin-products-alert error">
                    {error}
                </div>
            )}

            {success && (
                <div className="admin-products-alert success">
                    {success}
                </div>
            )}

            <section className="admin-products-editor">

                <div className="admin-products-editor-title">
                    <div>
                        <span>
                            {editingProduct
                                ? "EDIT PRODUCT"
                                : "NEW PRODUCT"}
                        </span>

                        <h2>
                            {editingProduct
                                ? editingProduct.name
                                : "Create a product"}
                        </h2>
                    </div>

                    {editingProduct && (
                        <button
                            type="button"
                            className="admin-products-secondary-btn"
                            onClick={resetForm}
                        >
                            Cancel
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit}>

                    <div className="admin-products-form-grid">

                        <label>
                            Product Name
                            <input
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Tile Revive Lavenda"
                                required
                            />
                        </label>

                        <label>
                            SKU
                            <input
                                name="sku"
                                value={form.sku}
                                onChange={handleChange}
                                placeholder="TR-LAV-5L"
                            />
                        </label>

                        <label>
                            Price
                            <input
                                type="number"
                                name="price"
                                min="0"
                                step="0.01"
                                value={form.price}
                                onChange={handleChange}
                                placeholder="2350"
                                required
                            />
                        </label>

                        <label>
                            Discount Price
                            <input
                                type="number"
                                name="discountPrice"
                                min="0"
                                step="0.01"
                                value={form.discountPrice}
                                onChange={handleChange}
                                placeholder="1999"
                            />
                        </label>

                        <label>
                            Cost Price
                            <input
                                type="number"
                                name="costPrice"
                                min="0"
                                step="0.01"
                                value={form.costPrice}
                                onChange={handleChange}
                                placeholder="1500"
                            />
                        </label>

                        <label>
                            Stock
                            <input
                                type="number"
                                name="stock"
                                min="0"
                                value={form.stock}
                                onChange={handleChange}
                                placeholder="50"
                            />
                        </label>

                        <label>
                            Minimum Stock
                            <input
                                type="number"
                                name="minimumStock"
                                min="0"
                                value={form.minimumStock}
                                onChange={handleChange}
                            />
                        </label>

                        <label>
                            Category
                            <select
                                name="category"
                                value={form.category}
                                onChange={handleChange}
                            >
                                <option value="">
                                    Select category
                                </option>

                                {categories.map((category, index) => {
                                    const value =
                                        typeof category === "string"
                                            ? category
                                            : category.name ||
                                              category.category ||
                                              "";

                                    return (
                                        <option
                                            key={`${value}-${index}`}
                                            value={value}
                                        >
                                            {value}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>

                        <label>
                            Brand
                            <input
                                name="brand"
                                value={form.brand}
                                onChange={handleChange}
                                placeholder="Tile Revive"
                            />
                        </label>

                        <label>
                            Status
                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                            >
                                <option value="ACTIVE">
                                    ACTIVE
                                </option>
                                <option value="INACTIVE">
                                    INACTIVE
                                </option>
                            </select>
                        </label>

                        <label className="admin-products-full-field">
                            Short Description
                            <input
                                name="shortDescription"
                                value={form.shortDescription}
                                onChange={handleChange}
                                placeholder="Professional tile cleaner..."
                            />
                        </label>

                        <label className="admin-products-full-field">
                            Description
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                rows="5"
                                placeholder="Describe the product..."
                            />
                        </label>

                        <label className="admin-products-checkbox">
                            <input
                                type="checkbox"
                                name="featured"
                                checked={form.featured}
                                onChange={handleChange}
                            />
                            Featured product
                        </label>

                    </div>

                    <div className="admin-products-image-editor admin-products-gallery-editor">
                        <div className="admin-products-gallery-heading">
                            <div>
                                <span className="admin-products-section-label">
                                    PRODUCT IMAGE GALLERY
                                </span>

                                <h3>
                                    Manage product images
                                </h3>

                                <p>
                                    Upload up to 10 images · Slot 1 is the
                                    primary image · JPG, PNG or WEBP · Maximum
                                    5MB each
                                </p>
                            </div>

                            <div className="admin-products-gallery-count">
                                <strong>
                                    {
                                        galleryImages.filter(
                                            (item) => item.image
                                        ).length
                                    }
                                </strong>
                                <span>/10 images</span>
                            </div>
                        </div>

                        <div className="admin-products-gallery-grid">
                            {galleryImages.map((item) => (
                                <div
                                    key={item.slot}
                                    className={
                                        `admin-products-gallery-slot ${
                                            item.slot === 1
                                                ? "is-primary"
                                                : ""
                                        } ${
                                            item.image
                                                ? "has-image"
                                                : "is-empty"
                                        }`
                                    }
                                >
                                    <div className="admin-products-gallery-slot-header">
                                        <span>
                                            SLOT {item.slot}
                                        </span>

                                        {item.slot === 1 && (
                                            <span className="admin-products-primary-badge">
                                                PRIMARY
                                            </span>
                                        )}
                                    </div>

                                    <div className="admin-products-gallery-preview">
                                        {item.uploading ? (
                                            <div className="admin-products-gallery-loading">
                                                <span className="admin-products-spinner" />
                                                <small>
                                                    Uploading...
                                                </small>
                                            </div>
                                        ) : item.image ? (
                                            <img
                                                src={getImageUrl(item.image)}
                                                alt={`${form.name || "Product"} image ${item.slot}`}
                                            />
                                        ) : (
                                            <div className="admin-products-gallery-empty">
                                                <span>+</span>
                                                <small>
                                                    Add image
                                                </small>
                                            </div>
                                        )}
                                    </div>

                                    <div className="admin-products-gallery-actions">
                                        <input
                                            id={`gallery-upload-${item.slot}`}
                                            ref={(element) => {
                                                galleryInputRefs.current[
                                                    item.slot - 1
                                                ] = element;
                                            }}
                                            type="file"
                                            accept="image/jpeg,image/jpg,image/png,image/webp"
                                            className="admin-products-gallery-file-input"
                                            onChange={(event) => {
                                                const file =
                                                    event.target.files?.[0];

                                                if (file) {
                                                    handleGalleryUpload(
                                                        item.slot,
                                                        file
                                                    );
                                                }

                                                event.target.value = "";
                                            }}
                                            disabled={
                                                !editingProduct ||
                                                item.uploading
                                            }
                                        />

                                        {editingProduct ? (
                                            <label
                                                htmlFor={`gallery-upload-${item.slot}`}
                                                className="admin-products-gallery-upload-btn"
                                                aria-disabled={item.uploading}
                                            >
                                                {item.uploading
                                                    ? "Uploading..."
                                                    : item.image
                                                        ? "Replace"
                                                        : "Upload"}
                                            </label>
                                        ) : (
                                            <button
                                                type="button"
                                                className="admin-products-gallery-upload-btn"
                                                onClick={() =>
                                                    setError(
                                                        "Save the product first before uploading gallery images."
                                                    )
                                                }
                                            >
                                                Upload
                                            </button>
                                        )}

                                        {item.image && (
                                            <button
                                                type="button"
                                                className="admin-products-gallery-remove-btn"
                                                onClick={() =>
                                                    handleGalleryRemove(
                                                        item.slot
                                                    )
                                                }
                                                disabled={
                                                    item.uploading
                                                }
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!editingProduct && (
                            <div className="admin-products-gallery-notice">
                                <span>i</span>
                                <div>
                                    <strong>
                                        Save the product first
                                    </strong>
                                    <p>
                                        After creating the product, you can
                                        upload and manage all 10 image slots
                                        individually.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="admin-products-form-actions">

                        <button
                            type="button"
                            className="admin-products-secondary-btn"
                            onClick={resetForm}
                        >
                            Clear
                        </button>

                        <button
                            type="submit"
                            className="admin-products-primary-btn"
                            disabled={saving}
                        >
                            {saving
                                ? imageUploading
                                    ? "Uploading image..."
                                    : "Saving..."
                                : editingProduct
                                    ? "Save Changes"
                                    : "Create Product"}
                        </button>

                    </div>

                </form>

            </section>

            <section className="admin-products-list">

                <div className="admin-products-list-header">

                    <div>
                        <span className="admin-products-eyebrow">
                            CATALOG
                        </span>

                        <h2>
                            Product Inventory
                        </h2>
                    </div>

                    <div className="admin-products-search">
                        

                    </div>

                </div>

                {loading ? (
                    <div className="admin-products-empty">
                        Loading products...
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="admin-products-empty">
                        No products found.
                    </div>
                ) : (
                    <div className="admin-products-table-wrap">

                        <table className="admin-products-table">

                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Price</th>
                                    <th>Stock</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>

                                {filteredProducts.map((product) => (

                                    <tr key={product.id}>

                                        <td>
                                            <div className="admin-products-product-cell">

                                                <div className="admin-products-thumb">

                                                    {product.image ? (
                                                        <img
                                                            src={getImageUrl(
                                                                product.image
                                                            )}
                                                            alt={
                                                                product.name
                                                            }
                                                        />
                                                    ) : (
                                                        <span>
                                                            +
                                                        </span>
                                                    )}

                                                </div>

                                                <div>
                                                    <strong>
                                                        {product.name}
                                                    </strong>

                                                    <small>
                                                        {product.category ||
                                                            "Uncategorized"}
                                                    </small>
                                                </div>

                                            </div>
                                        </td>

                                        <td>
                                            {product.sku || "—"}
                                        </td>

                                        <td>
                                            KES{" "}
                                            {Number(
                                                product.discountPrice ||
                                                    product.price ||
                                                    0
                                            ).toLocaleString()}
                                        </td>

                                        <td>
                                            <span
                                                className={
                                                    Number(product.stock) <=
                                                    Number(
                                                        product.minimumStock ||
                                                            5
                                                    )
                                                        ? "stock-low"
                                                        : "stock-good"
                                                }
                                            >
                                                {product.stock ?? 0}
                                            </span>
                                        </td>

                                        <td>
                                            <span
                                                className={`status-badge ${
                                                    String(
                                                        product.status ||
                                                            "ACTIVE"
                                                    ).toLowerCase()
                                                }`}
                                            >
                                                {product.status ||
                                                    "ACTIVE"}
                                            </span>
                                        </td>

                                        <td>

                                            <div className="admin-products-actions">

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        startEdit(
                                                            product
                                                        )
                                                    }
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleReplaceImage(
                                                            product
                                                        )
                                                    }
                                                    disabled={
                                                        imageUploading
                                                    }
                                                >
                                                    Image
                                                </button>

                                                {product.image && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleRemoveImage(
                                                                product
                                                            )
                                                        }
                                                        disabled={
                                                            imageUploading
                                                        }
                                                    >
                                                        Remove
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="delete"
                                                    onClick={() =>
                                                        handleDelete(
                                                            product
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </button>

                                            </div>

                                        </td>

                                    </tr>

                                ))}

                            </tbody>

                        </table>

                    </div>
                )}

            </section>

        </div>
    );
}













