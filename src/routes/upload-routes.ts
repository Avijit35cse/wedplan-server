import { Router } from "express";
import multer from "multer";
import { verifyToken } from "../middleware/verify-token.js";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed"));
        }
    },
});
router.post(
    "/upload/image",
    verifyToken,
    upload.single("image"),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: "Image file is required",
                });
            }

            const apiKey = process.env.IMGBB_API_KEY;

            if (!apiKey) {
                return res.status(500).json({
                    success: false,
                    message: "ImgBB API key is not configured",
                });
            }

            const formData = new FormData();

            const imageBlob = new Blob([new Uint8Array(req.file.buffer)], {
                type: req.file.mimetype,
            });

            formData.append("image", imageBlob, req.file.originalname);

            const response = await fetch(
                `https://api.imgbb.com/1/upload?key=${apiKey}`,
                {
                    method: "POST",
                    body: formData,
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                return res.status(502).json({
                    success: false,
                    message: "Image upload to ImgBB failed",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Image uploaded successfully",
                imageUrl: result.data.url,
                displayUrl: result.data.display_url,
                deleteUrl: result.data.delete_url,
            });
        } catch (error) {
            console.error("Image upload error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to upload image",
            });
        }
    }
);

export default router;