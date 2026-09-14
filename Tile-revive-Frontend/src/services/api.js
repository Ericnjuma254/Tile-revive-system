const API_BASE_URL = import.meta.env.VITE_API_URL || "";
// ======================================================
// PRODUCT IMAGE URL HELPER
// Converts backend-relative uploaded image paths into
// browser-accessible backend URLs.
// ======================================================

export function getProductImageUrl(image) {
    if (!image) {
        return "";
    }

    const value = String(image).trim();

    if (!value) {
        return "";
    }

    // Already a complete URL
    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    // Uploaded images are served by the backend
    if (value.startsWith("/uploads/") || value.startsWith("uploads/")) {
        /*
         * API_BASE_URL points to /api, while uploaded images
         * are served from the backend root at /uploads.
         *
         * Example:
         * API_BASE_URL = http://192.168.0.100:5000/api
         * Image        = /uploads/products/example.jpg
         *
         * Result:
         * http://192.168.0.100:5000/uploads/products/example.jpg
         */

        const backendOrigin = (API_BASE_URL || "http://localhost:5000")
            .replace(/\/api\/?$/i, "")
            .replace(/\/$/, "");

        return `${backendOrigin}/${value.replace(/^\/+/, "")}`;
    }

    // Preserve normal frontend/public images
    return value;
}


// ======================================================
// AUTH HELPERS
// ======================================================

function getAccessToken() {
    return localStorage.getItem("accessToken");
}

function getRefreshToken() {
    return localStorage.getItem("refreshToken");
}

function clearAuth() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
}

function redirectToLogin() {
    clearAuth();

    if (window.location.pathname.startsWith("/admin")) {
        window.location.href = "/admin/login";
    }
}

// ======================================================
// REFRESH TOKEN
// ======================================================

let refreshPromise = null;

async function refreshAccessToken() {
    if (refreshPromise) {
        return refreshPromise;
    }

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
        throw new Error("No refresh token available.");
    }

    refreshPromise = (async () => {
        try {
            const response = await fetch(
                `${API_BASE_URL}/auth/refresh`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        refreshToken,
                    }),
                }
            );

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    data.error ||
                    "Unable to refresh session."
                );
            }

            const newAccessToken =
                data.accessToken ||
                data.token;

            if (!newAccessToken) {
                throw new Error(
                    "Server did not return a new access token."
                );
            }

            localStorage.setItem(
                "accessToken",
                newAccessToken
            );

            console.log(
                "AUTH: Access token refreshed successfully."
            );

            return newAccessToken;

        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}


// ======================================================
// REQUEST
// ======================================================

async function request(
    endpoint,
    options = {},
    allowRefresh = true
) {
    if (allowRefresh && refreshPromise) {
        await refreshPromise;
    }

    const token = getAccessToken();

    const isFormData =
        typeof FormData !== "undefined" &&
        options.body instanceof FormData;

    const headers = {
        Accept: "application/json",
        ...(isFormData
            ? {}
            : {
                "Content-Type": "application/json"
            }),
        ...(options.headers || {}),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response;

    try {
        console.log("API REQUEST:", `${API_BASE_URL}${endpoint}`);
        response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,
                headers,
            }
        );
    } catch (error) {
        console.error(
            "API NETWORK ERROR:",
            error
        );

        throw new Error(
            "Unable to connect to the server. Make sure the backend is running."
        );
    }

    // ==================================================
    // HANDLE EXPIRED ACCESS TOKEN
    // ==================================================

    if (
        response.status === 401 &&
        allowRefresh
    ) {
        try {
            const freshToken =
                await refreshAccessToken();

            if (!freshToken) {
                throw new Error(
                    "Unable to obtain a new access token."
                );
            }

            const retryHeaders = {
                Accept: "application/json",
                ...(isFormData
                    ? {}
                    : {
                        "Content-Type":
                            "application/json"
                    }),
                ...(options.headers || {}),
                Authorization:
                    `Bearer ${freshToken}`,
            };

            let retryResponse;

            try {
                retryResponse = await fetch(
                    `${API_BASE_URL}${endpoint}`,
                    {
                        ...options,
                        headers: retryHeaders,
                    }
                );
            } catch (error) {
                console.error(
                    "API RETRY NETWORK ERROR:",
                    error
                );

                throw new Error(
                    "Unable to connect to the server. Make sure the backend is running."
                );
            }

            let retryData = {};

            try {
                retryData =
                    await retryResponse.json();
            } catch {
                retryData = {};
            }

            if (retryResponse.status === 401) {
                console.error(
                    `API AUTH FAILURE AFTER TOKEN REFRESH: ${endpoint}`
                );

                clearAuth();

                if (
                    window.location.pathname.startsWith(
                        "/admin"
                    )
                ) {
                    window.location.href =
                        "/admin/login";
                }

                throw new Error(
                    retryData.message ||
                    retryData.error ||
                    "Your session has expired. Please login again."
                );
            }

            if (retryResponse.status === 403) {
                throw new Error(
                    retryData.message ||
                    retryData.error ||
                    "Administrator access required."
                );
            }

            if (!retryResponse.ok) {
                throw new Error(
                    retryData.message ||
                    retryData.error ||
                    `API request failed: ${retryResponse.status}`
                );
            }

            return retryData;

        } catch (refreshError) {
            console.error(
                "ACCESS TOKEN REFRESH FAILED:",
                refreshError
            );

            clearAuth();

            if (
                window.location.pathname.startsWith(
                    "/admin"
                )
            ) {
                window.location.href =
                    "/admin/login";
            }

            throw new Error(
                refreshError.message ||
                "Your session has expired. Please login again."
            );
        }
    }

    // ==================================================
    // RESPONSE BODY
    // ==================================================

    let data = {};

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    // ==================================================
    // FINAL 401
    // ==================================================

    if (response.status === 401) {
        throw new Error(
            data.message ||
            data.error ||
            "Your session has expired. Please login again."
        );
    }

    // ==================================================
    // FORBIDDEN
    // ==================================================

    if (response.status === 403) {
        throw new Error(
            data.message ||
            data.error ||
            "Administrator access required."
        );
    }

    // ==================================================
    // OTHER API ERRORS
    // ==================================================

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `API request failed: ${response.status}`
        );
    }

    return data;
}
// ======================================================
// ORDER ID VALIDATION
// ======================================================

function validateOrderId(orderId) {
    if (
        orderId === undefined ||
        orderId === null
    ) {
        throw new Error("Invalid order ID.");
    }

    const id = String(orderId).trim();

    if (
        !id ||
        id === "undefined" ||
        id === "null" ||
        id === "NaN"
    ) {
        throw new Error("Invalid order ID.");
    }

    return encodeURIComponent(id);
}

// ======================================================
// PRODUCTS
// ======================================================

export async function getProducts() {
    const data = await request(
        "/products"
    );

    return data.products || [];
}

// ======================================================
// CATEGORIES
// ======================================================

export async function getCategories() {
    const data = await request(
        "/categories"
    );

    return data.categories || [];
}

// ======================================================
// CREATE ORDER
// ======================================================

export async function createOrder(orderData) {
    return request(
        "/orders",
        {
            method: "POST",
            body: JSON.stringify(orderData),
        }
    );
}

// ======================================================
// M-PESA STK PUSH
// ======================================================

export async function initiateMpesaPayment(
    paymentData
) {
    return request(
        "/stkpush",
        {
            method: "POST",
            body: JSON.stringify(paymentData),
        }
    );
}

// ======================================================
// ADMIN DASHBOARD
// ======================================================

export async function getAdminDashboard() {
    return request(
        "/dashboard/dashboard",
        {
            method: "GET",
        }
    );
}

// ======================================================
// ADMIN ORDERS
// ======================================================

export async function getAdminCustomers() {
    return request(
        "/customers",
        {
            method: "GET",
        }
    );
}

export async function createCustomer(customerData) {
    if (!customerData?.fullName?.trim()) {
        throw new Error("Full name is required.");
    }

    if (!customerData?.phoneNumber?.trim()) {
        throw new Error("Phone number is required.");
    }

    return request("/customers", {
        method: "POST",
        body: JSON.stringify({
            fullName: customerData.fullName.trim(),
            phoneNumber: customerData.phoneNumber.trim(),
            email: customerData.email?.trim() || null,
            county: customerData.county?.trim() || null,
            location: customerData.location?.trim() || null,
        }),
    });
}
export async function getAdminCustomer360(customerId) {
    return request(
        `/customers/${customerId}/360`,
        {
            method: "GET",
        }
    );
}
export async function getAdminOrders() {
    return request(
        "/admin/orders",
        {
            method: "GET",
        }
    );
}
/* ============================================================
   ADMIN OFFER LIBRARY
   ============================================================ */

export async function getAdminOffers() {
    return request(
        "/admin/offers",
        {
            method: "GET",
        }
    );
}

export async function createAdminOffer(offerData) {
    if (!offerData?.name?.trim()) {
        throw new Error("Offer name is required.");
    }

    if (!offerData?.type) {
        throw new Error("Offer type is required.");
    }

    return request(
        "/admin/offers",
        {
            method: "POST",
            body: JSON.stringify({
                name: offerData.name.trim(),
                description:
                    offerData.description?.trim() || null,
                type: offerData.type,
                productId:
                    offerData.productId
                        ? Number(offerData.productId)
                        : null,
                quantity:
                    Number(offerData.quantity || 1),
                discountValue:
                    Number(offerData.discountValue || 0),
                status:
                    offerData.status || "ACTIVE",
            }),
        }
    );
}

export async function updateAdminOffer(
    offerId,
    offerData
) {
    if (!offerId) {
        throw new Error("Offer ID is required.");
    }

    return request(
        `/admin/offers/${encodeURIComponent(
            String(offerId)
        )}`,
        {
            method: "PATCH",
            body: JSON.stringify(offerData),
        }
    );
}

export async function deleteAdminOffer(offerId) {
    if (!offerId) {
        throw new Error("Offer ID is required.");
    }

    return request(
        `/admin/offers/${encodeURIComponent(
            String(offerId)
        )}`,
        {
            method: "DELETE",
        }
    );
}


// ======================================================
// CREATE ADMIN ORDER
// ======================================================

export async function createAdminOrder(orderData) {
    if (!orderData) {
        throw new Error("Order data is required.");
    }

    if (!orderData.customerId) {
        throw new Error("Customer is required.");
    }

    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
        throw new Error("At least one order item is required.");
    }

    return request("/admin/orders/create", {
        method: "POST",
        body: JSON.stringify({
            customerId: Number(orderData.customerId),
            paymentMethod: orderData.paymentMethod || "COD",
            offer: orderData.offer || null,
            items: orderData.items.map((item) => ({
                productId: Number(item.productId),
                quantity: Number(item.quantity || 1),
                unitPrice: Number(item.unitPrice || 0),
                isFreeItem: Boolean(item.isFreeItem),
                offerName: item.offerName || null,
            })),
        }),
    });
}

export async function getAdminOrder(orderId) {
    const id = validateOrderId(orderId);

    return request(
        `/admin/orders/${id}`,
        {
            method: "GET",
        }
    );
}

// ======================================================
// UPDATE ADMIN ORDER STATUS
// ======================================================

export async function updateAdminOrderStatus(
    orderId,
    orderStatus
) {
    const id = validateOrderId(orderId);

    if (!orderStatus) {
        throw new Error(
            "Order status is required."
        );
    }

    return request(
        `/admin/orders/${id}/status`,
        {
            method: "PATCH",
            body: JSON.stringify({
                orderStatus,
            }),
        }
    );
}

// ======================================================
// UPDATE PAYMENT STATUS
// ======================================================

export async function updateAdminPaymentStatus(
    orderId,
    paymentStatus
) {
    const id = validateOrderId(orderId);

    if (!paymentStatus) {
        throw new Error(
            "Payment status is required."
        );
    }

    return request(
        `/admin/orders/${id}/payment-status`,
        {
            method: "PATCH",
            body: JSON.stringify({
                paymentStatus,
            }),
        }
    );
}

// ======================================================
// PENDING USERS
// ======================================================

export async function getPendingUsers() {
    return request(
        "/admin/users/pending",
        {
            method: "GET",
        }
    );
}

// ======================================================
// APPROVE USER
// ======================================================

export async function approveUser(userId) {
    if (
        userId === undefined ||
        userId === null ||
        String(userId).trim() === ""
    ) {
        throw new Error(
            "Invalid user ID."
        );
    }

    return request(
        `/admin/users/${encodeURIComponent(
            String(userId).trim()
        )}/approve`,
        {
            method: "PATCH",
        }
    );
}

// ======================================================
// ADMIN REPORTS
// ======================================================

export async function getAdminReports(period = "30D") {
    const query = new URLSearchParams({
        period,
    });

    return request(
        `/admin/reports?${query.toString()}`,
        {
            method: "GET",
        }
    );
}


// ======================================================
// EXPENSES
// ======================================================

export async function getExpenses(params = {}) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            query.set(key, value);
        }
    });

    const suffix = query.toString()
        ? `?${query.toString()}`
        : "";

    return request(`/expenses${suffix}`);
}

export async function getExpenseSummary(params = {}) {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            query.set(key, value);
        }
    });

    const suffix = query.toString()
        ? `?${query.toString()}`
        : "";

    return request(`/expenses/summary${suffix}`);
}

export async function getExpense(expenseId) {
    return request(`/expenses/${expenseId}`);
}

export async function createExpense(expenseData) {
    return request(
        "/expenses",
        {
            method: "POST",
            body: JSON.stringify(expenseData)
        }
    );
}

export async function updateExpense(expenseId, expenseData) {
    return request(
        `/expenses/${expenseId}`,
        {
            method: "PUT",
            body: JSON.stringify(expenseData)
        }
    );
}

export async function deleteExpense(expenseId) {
    return request(
        `/expenses/${expenseId}`,
        {
            method: "DELETE"
        }
    );
}

// ======================================================
// DEFAULT EXPORT
// ======================================================


/* ============================================================
   ADMIN PRODUCT MANAGEMENT
   ============================================================ */

export async function createProduct(productData) {
    return await request(
        "/products",
        {
            method: "POST",
            body: JSON.stringify(productData)
        }
    );
}

export async function updateProduct(productId, productData) {
    return await request(
        `/products/${productId}`,
        {
            method: "PUT",
            body: JSON.stringify(productData)
        }
    );
}

export async function deleteProduct(productId) {
    return await request(
        `/products/${productId}`,
        {
            method: "DELETE"
        }
    );
}

export async function uploadProductImage(productId, file) {
    const formData = new FormData();

    formData.append("image", file);

    return await request(
        `/products/${productId}/image`,
        {
            method: "POST",
            body: formData
        }
    );
}

export async function removeProductImage(productId) {
    return await request(
        `/products/${productId}/image`,
        {
            method: "DELETE"
        }
    );
}

export default {
    getProducts,
    getCategories,
    createOrder,
    initiateMpesaPayment,

    getAdminDashboard,
    getAdminCustomers,
    getAdminCustomer360,
    getAdminOrders,
    createAdminOrder,
    getAdminOrder,

    updateAdminOrderStatus,
    updateAdminPaymentStatus,

    getPendingUsers,
    approveUser,

    getAdminReports,
};









export async function uploadProductGalleryImage(
    productId,
    file,
    slot
) {
    const formData = new FormData();

    formData.append("image", file);
    formData.append("slot", String(slot));

    return await request(
        `/products/${productId}/images`,
        {
            method: "POST",
            body: formData
        }
    );
}

export async function removeProductGalleryImage(
    productId,
    slot
) {
    return await request(
        `/products/${productId}/images/${slot}`,
        {
            method: "DELETE"
        }
    );
}

export async function getProductImages(productId) {
    const response = await request(
        `/products/${productId}/images`
    );

    return Array.isArray(response?.images)
        ? response.images
        : [];
}





/* ============================================================
   FINANCIAL REPORT API
   Central financial engine
   ============================================================ */

export const getFinancialSummary = async ({
    startDate,
    endDate,
} = {}) => {

    const params = new URLSearchParams();

    if (startDate) {
        params.set("startDate", startDate);
    }

    if (endDate) {
        params.set("endDate", endDate);
    }

    const query = params.toString();

    console.log("FINANCIAL SUMMARY: request about to fire");

    const response = await request(
        `/reports/financial/financial-summary${query ? `?${query}` : ""}`,
        {
            method: "GET",
        }
    );

    console.log("FINANCIAL SUMMARY RESPONSE:", JSON.stringify(response, null, 2));

    return response?.data || {};
};


export const getFinancialTrend = async ({
    startDate,
    endDate,
} = {}) => {

    const params = new URLSearchParams();

    if (startDate) {
        params.set("startDate", startDate);
    }

    if (endDate) {
        params.set("endDate", endDate);
    }

    const query = params.toString();

    return request(
        `/reports/financial/financial-trend${query ? `?${query}` : ""}`,
        {
            method: "GET",
        }
    );
};


export const getProductProfitability = async ({
    startDate,
    endDate,
} = {}) => {

    const params = new URLSearchParams();

    if (startDate) {
        params.set("startDate", startDate);
    }

    if (endDate) {
        params.set("endDate", endDate);
    }

    const query = params.toString();

    return request(
        `/reports/financial/product-profitability${query ? `?${query}` : ""}`,
        {
            method: "GET",
        }
    );
};


export const getExpenseBreakdown = async ({
    startDate,
    endDate,
} = {}) => {

    const params = new URLSearchParams();

    if (startDate) {
        params.set("startDate", startDate);
    }

    if (endDate) {
        params.set("endDate", endDate);
    }

    const query = params.toString();

    return request(
        `/reports/financial/expense-breakdown${query ? `?${query}` : ""}`,
        {
            method: "GET",
        }
    );
};


export const getCashFlow = async ({
    startDate,
    endDate,
} = {}) => {

    const params = new URLSearchParams();

    if (startDate) {
        params.set("startDate", startDate);
    }

    if (endDate) {
        params.set("endDate", endDate);
    }

    const query = params.toString();

    return request(
        `/reports/financial/cash-flow${query ? `?${query}` : ""}`,
        {
            method: "GET",
        }
    );
};











export async function getProductReviews(productId) {
    const response = await request(
        `/reviews/product/${productId}`
    );

    return {
        reviews: Array.isArray(response?.reviews)
            ? response.reviews
            : [],
        summary: response?.summary || {
            averageRating: 0,
            reviewCount: 0
        }
    };
}

/*
 * =====================================================
 * CUSTOMER REVIEWS
 * =====================================================
 */

/**
 * Get all public product reviews.
 */
export async function getAllReviews() {
    const response = await request("/reviews");

    return {
        reviews: Array.isArray(response?.reviews)
            ? response.reviews
            : [],
        summary: response?.summary || {
            averageRating: 0,
            reviewCount: 0
        }
    };
}


/**
 * Get products that the signed-in customer can review.
 *
 * The backend determines eligibility from real orders.
 */
export async function getMyReviewProducts() {
    const token =
        localStorage.getItem("customerAccessToken");

    if (!token) {
        throw new Error(
            "Please sign in to review a product."
        );
    }

    const response = await fetch(
        `${API_URL}/reviews/my-products`,
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Unable to load products available for review."
        );
    }

    return Array.isArray(data?.products)
        ? data.products
        : [];
}

