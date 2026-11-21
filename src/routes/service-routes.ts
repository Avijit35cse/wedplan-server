
import { Router } from "express";
import { connectDB } from "../config/db.js";
import { verifyToken } from "../middleware/verify-token.js";
import { authorizeRole } from "../middleware/authorize-role.js";

const router = Router();

// Vendor: Get all own services
router.get(
  "/services/my-services",
  verifyToken,
  authorizeRole("vendor"),
  async (req, res) => {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const db = await connectDB();

      const services = await db
        .collection("services")
        .find({ vendorId: user.id })
        .sort({ createdAt: -1 })
        .toArray();

      return res.status(200).json({
        success: true,
        message: "Your services retrieved successfully",
        services,
      });
    } catch (error) {
      console.error("Get my services error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to retrieve your services",
      });
    }
  }
);
// Vendor: Create a new service
router.post(
  "/services",
  verifyToken,
  authorizeRole("vendor"),
  async (req, res) => {
    try {
      const {
        serviceName,
        category,
        description,
        price,
        location,
        images,
      } = req.body;

      if (
        !serviceName?.trim() ||
        !category?.trim() ||
        !description?.trim() ||
        !location?.trim() ||
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        price <= 0 ||
        !Array.isArray(images) ||
        images.length === 0 ||
        !images.every(
          (image: unknown) =>
            typeof image === "string" && image.trim().length > 0
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide valid service information",
        });
      }

      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      const db = await connectDB();

      const newService = {
        vendorId: user.id,
        serviceName: serviceName.trim(),
        category: category.trim(),
        description: description.trim(),
        price,
        location: location.trim(),
        images,
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db
        .collection("services")
        .insertOne(newService);

      return res.status(201).json({
        success: true,
        message: "Service submitted for admin approval",
        service: {
          _id: result.insertedId,
          ...newService,
        },
      });
    } catch (error) {
      console.error("Create service error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to create service",
      });
    }
  }
);

export default router;
