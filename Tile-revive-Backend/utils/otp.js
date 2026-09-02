const crypto = require("crypto");

function generateOtp() {
    return crypto
        .randomInt(100000, 1000000)
        .toString();
}

function hashOtp(otp) {
    return crypto
        .createHash("sha256")
        .update(otp)
        .digest("hex");
}

function verifyOtp(otp, hashedOtp) {
    return hashOtp(otp) === hashedOtp;
}

module.exports = {
    generateOtp,
    hashOtp,
    verifyOtp
};