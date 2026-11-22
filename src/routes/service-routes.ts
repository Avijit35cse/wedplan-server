
import { Router } from "express";
import { connectDB } from "../config/db.js";
import { verifyToken } from "../middleware/verify-token.js";
import { authorizeRole } from "../middleware/authorize-role.js";
import { ObjectId } from "mongodb";

const router = Router();

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

      // New services are submitted as pending for admin approval.
      // Free vendor's active-service limit is checked during admin approval.

      const newService = {
        vendorId: user.id,
        serviceName: serviceName.trim(),
        category: category.trim(),
        description: description.trim(),
        price,
        location: location.trim(),
        images: images.map((image: string) => image.trim()),
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

// Vendor: Update own service
router.put(
  "/services/:id",
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

      const id = req.params.id;

      if (typeof id !== "string" || !ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid service ID",
        });
      }

      const {
        serviceName,
        category,
        description,
        price,
        location,
        images,
      } = req.body;

      if (
        typeof serviceName !== "string" ||
        !serviceName.trim() ||
        typeof category !== "string" ||
        !category.trim() ||
        typeof description !== "string" ||
        !description.trim() ||
        typeof location !== "string" ||
        !location.trim() ||
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

      const db = await connectDB();

      const service = await db.collection("services").findOne({
        _id: new ObjectId(id),
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      if (service.vendorId !== user.id) {
        return res.status(403).json({
          success: false,
          message: "You can only update your own services",
        });
      }

      const updatedService = {
        serviceName: serviceName.trim(),
        category: category.trim(),
        description: description.trim(),
        price,
        location: location.trim(),
        images: images.map((image: string) => image.trim()),
        status: "pending",
        updatedAt: new Date(),
      };

      await db.collection("services").updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedService }
      );

      return res.status(200).json({
        success: true,
        message: "Service updated successfully. Waiting for admin approval.",
        service: {
          ...service,
          ...updatedService,
        },
      });
    } catch (error) {
      console.error("Update service error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to update service",
      });
    }
  }
);

// Vendor: Delete own service
router.delete(
  "/services/:id",
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

      const id = req.params.id;

      if (typeof id !== "string" || !ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid service ID",
        });
      }

      const db = await connectDB();

      const service = await db.collection("services").findOne({
        _id: new ObjectId(id),
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Service not found",
        });
      }

      if (service.vendorId !== user.id) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own services",
        });
      }

      await db.collection("services").deleteOne({
        _id: new ObjectId(id),
        vendorId: user.id,
      });

      return res.status(200).json({
        success: true,
        message: "Service deleted successfully",
      });
    } catch (error) {
      console.error("Delete service error:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to delete service",
      });
    }
  }
);

// Public: Get active services with search, filter and sorting
router.get("/services", async (req, res) => {
  try {
    const { search, category, location, sort } = req.query;

    const filter: {
      status: string;
      serviceName?: { $regex: string; $options: string };
      category?: { $regex: string; $options: string };
      location?: { $regex: string; $options: string };
    } = {
      status: "active",
    };

    if (typeof search === "string" && search.trim()) {
      filter.serviceName = {
        $regex: search.trim(),
        $options: "i",
      };
    }

    if (typeof category === "string" && category.trim()) {
      filter.category = {
        $regex: category.trim(),
        $options: "i",
      };
    }

    if (typeof location === "string" && location.trim()) {
      filter.location = {
        $regex: location.trim(),
        $options: "i",
      };
    }

    const sortOption: { price?: 1 | -1; createdAt?: 1 | -1 } =
      sort === "price_asc"
        ? { price: 1 }
        : sort === "price_desc"
          ? { price: -1 }
          : { createdAt: -1 };

    const db = await connectDB();

    const services = await db
      .collection("services")
      .find(filter)
      .sort(sortOption)
      .toArray();

    return res.status(200).json({
      success: true,
      message: "Services retrieved successfully",
      total: services.length,
      services,
    });
  } catch (error) {
    console.error("Get public services error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve services",
    });
  }
});

export default router;
