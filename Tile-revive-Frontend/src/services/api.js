const API_BASE_URL = import.meta.env.VITE_API_URL || "";


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
    let token = getAccessToken();

    const headers = {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(options.headers || {}),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response;

    try {
        response = await fetch(
            `${API_BASE_URL}${endpoint}`,
            {
                ...options,
                headers,
            }
        );
    } catch (error) {
        console.error("API NETWORK ERROR:", error);

        throw new Error(
            "Unable to connect to the server. Make sure the backend is running."
        );
    }

    // ==================================================
    // HANDLE 401
    // ==================================================

    if (response.status === 401 && allowRefresh) {
        try {
            /*
             * All simultaneous 401 requests share the same
             * refreshPromise. Only one refresh request is sent.
             */
            const freshToken = await refreshAccessToken();

            if (!freshToken) {
                throw new Error("Unable to obtain a new access token.");
            }

            /*
             * Retry directly with the freshly issued token.
             *
             * This avoids recursively entering request() with
             * stale authorization state.
             */
            const retryHeaders = {
                Accept: "application/json",
                "Content-Type": "application/json",
                ...(options.headers || {}),
                Authorization: `Bearer ${freshToken}`,
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
                retryData = await retryResponse.json();
            } catch {
                retryData = {};
            }

            /*
             * The newly refreshed token itself was rejected.
             * This is a genuine authentication failure.
             */
            if (retryResponse.status === 401) {
                console.error(
                    `API AUTH FAILURE AFTER TOKEN REFRESH: ${endpoint}`
                );

                /*
                 * Before logging out, check whether another
                 * request has already installed a newer token.
                 */
                const currentToken = getAccessToken();

                if (
                    currentToken &&
                    currentToken !== freshToken
                ) {
                    console.warn(
                        "AUTH: A newer access token exists. Retrying request once more."
                    );

                    return request(
                        endpoint,
                        {
                            ...options,
                            headers: {
                                ...(options.headers || {}),
                                Authorization: `Bearer ${currentToken}`,
                            },
                        },
                        false
                    );
                }

                redirectToLogin();

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

            /*
             * Only redirect when the refresh operation itself
             * failed or the newly refreshed token was rejected.
             */
            redirectToLogin();

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
        console.error(
            `API AUTH FAILURE AFTER REFRESH: ${endpoint}`
        );

        /*
         * If another request has already replaced the token,
         * use that newer token instead of logging the user out.
         */
        const currentToken = getAccessToken();

        if (
            currentToken &&
            currentToken !== token
        ) {
            console.warn(
                "AUTH: Detected newer access token. Retrying request."
            );

            return request(
                endpoint,
                {
                    ...options,
                    headers: {
                        ...(options.headers || {}),
                        Authorization: `Bearer ${currentToken}`,
                    },
                },
                false
            );
        }

        redirectToLogin();

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

export async function getAdminOrders() {
    return request(
        "/admin/orders",
        {
            method: "GET",
        }
    );
}

// ======================================================
// ADMIN ORDER DETAILS
// ======================================================

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
// DEFAULT EXPORT
// ======================================================

export default {
    getProducts,
    getCategories,
    createOrder,
    initiateMpesaPayment,

    getAdminDashboard,
    getAdminOrders,
    getAdminOrder,

    updateAdminOrderStatus,
    updateAdminPaymentStatus,

    getPendingUsers,
    approveUser,

    getAdminReports,
};




