const API_URL = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, "") || "";

/*
 * Request customer verification code
 */
export const requestCustomerOtp = async ({
    email,
    fullName
}) => {
    const response = await fetch(
        `${API_URL}/api/auth/customer/request-otp`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                fullName
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Unable to send verification code."
        );
    }

    return data;
};


/*
 * Verify customer verification code
 */
export const verifyCustomerOtp = async ({
    email,
    code
}) => {
    const response = await fetch(
        `${API_URL}/api/auth/customer/verify-otp`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                code
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Incorrect verification code."
        );
    }

    return data;
};

/*
 * Submit a product review
 */
export const createProductReview = async ({
    productId,
    rating,
    comment
}) => {
    const token = localStorage.getItem("customerAccessToken");

    if (!token) {
        throw new Error(
            "Please sign in to submit a review."
        );
    }

    const response = await fetch(
        `${API_URL}/api/reviews/product/${productId}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                rating,
                comment
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message ||
            "Unable to submit your review."
        );
    }

    return data;
};
