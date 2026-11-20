import { Router } from "express";
import { verifyToken } from "../middleware/verify-token.js";
import { authorizeRole } from "../middleware/authorize-role.js";

const router = Router();

router.get("/me", verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authenticated user",
    user: req.user,
  });
});

// Vendor only
router.get(
  "/vendor-test",
  verifyToken,
  authorizeRole("vendor"),
  (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Vendor access granted",
    });
  }
);

// Admin only
router.get(
  "/admin-test",
  verifyToken,
  authorizeRole("admin"),
  (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Admin access granted",
    });
  }
);

export default router;