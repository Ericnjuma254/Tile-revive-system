const API_URL = "http://localhost:5000";

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