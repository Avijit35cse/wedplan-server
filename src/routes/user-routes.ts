import { Router } from "express";
import { verifyToken } from "../middleware/verify-token.js";

const router = Router();

router.get("/me", verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authenticated user",
    user: req.user,
  });
});

export default router;