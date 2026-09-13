const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadDirectory = path.join(
    process.cwd(),
    "uploads",
    "products"
);

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, {
        recursive: true
    });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (_req, file, cb) => {
        const extension = path.extname(file.originalname).toLowerCase();

        const safeBaseName = path
            .basename(file.originalname, extension)
            .replace(/[^a-zA-Z0-9_-]/g, "-")
            .replace(/-+/g, "-")
            .slice(0, 80);

        const uniqueName =
            `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeBaseName || "product"}${extension}`;

        cb(null, uniqueName);
    }
});

const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp"
];

const fileFilter = (_req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(
            new Error(
                "Only JPG, JPEG, PNG and WEBP product images are allowed."
            )
        );
    }

    cb(null, true);
};

const uploadProductImage = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024
    }
});

module.exports = {
    uploadProductImage,
    uploadDirectory
};
