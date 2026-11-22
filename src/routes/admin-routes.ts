
import { Router } from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../config/db.js";
import { verifyToken } from "../middleware/verify-token.js";
import { authorizeRole } from "../middleware/authorize-role.js";

const router = Router();


// Admin: Block a user
router.patch(
    "/admin/users/:id/block",
    verifyToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const id = req.params.id;

            if (typeof id !== "string" || !ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID",
                });
            }

            if (id === req.user?.id) {
                return res.status(403).json({
                    success: false,
                    message: "Admin cannot block their own account",
                });
            }

            const db = await connectDB();

            const result = await db.collection("user").updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        isBlocked: true,
                        updatedAt: new Date(),
                    },
                }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "User blocked successfully",
            });
        } catch (error) {
            console.error("Block user error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to block user",
            });
        }
    }
);


// Admin: Unblock a user
router.patch(
    "/admin/users/:id/unblock",
    verifyToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const id = req.params.id;

            if (typeof id !== "string" || !ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID",
                });
            }

            const db = await connectDB();

            const result = await db.collection("user").updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        isBlocked: false,
                        updatedAt: new Date(),
                    },
                }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "User unblocked successfully",
            });
        } catch (error) {
            console.error("Unblock user error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to unblock user",
            });
        }
    }
);


// Admin: Get all users
router.get(
    "/admin/users",
    verifyToken,
    authorizeRole("admin"),
    async (_req, res) => {
        try {
            const db = await connectDB();

            const users = await db
                .collection("user")
                .find(
                    {},
                    {
                        projection: {
                            name: 1,
                            email: 1,
                            role: 1,
                            image: 1,
                            isPremium: 1,
                            isBlocked: 1,
                            createdAt: 1,
                        },
                    }
                )
                .sort({ createdAt: -1 })
                .toArray();

            return res.status(200).json({
                success: true,
                message: "Users retrieved successfully",
                total: users.length,
                users,
            });
        } catch (error) {
            console.error("Get all users error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to retrieve users",
            });
        }
    }
);

// Admin: Get all pending services
router.get(
    "/admin/services/pending",
    verifyToken,
    authorizeRole("admin"),
    async (_req, res) => {
        try {
            const db = await connectDB();

            const services = await db
                .collection("services")
                .find({ status: "pending" })
                .sort({ createdAt: -1 })
                .toArray();

            return res.status(200).json({
                success: true,
                message: "Pending services retrieved successfully",
                total: services.length,
                services,
            });
        } catch (error) {
            console.error("Get pending services error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to retrieve pending services",
            });
        }
    }
);

// Admin: Approve a pending service
router.patch(
    "/admin/services/:id/approve",
    verifyToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
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
                status: "pending",
            });

            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: "Pending service not found",
                });
            }

            if (
                typeof service.vendorId !== "string" ||
                !ObjectId.isValid(service.vendorId)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid service vendor",
                });
            }

            const vendor = await db.collection("user").findOne({
                _id: new ObjectId(service.vendorId),
            });

            if (!vendor) {
                return res.status(404).json({
                    success: false,
                    message: "Service vendor not found",
                });
            }

            if (vendor.isPremium !== true) {
                const activeServiceCount = await db
                    .collection("services")
                    .countDocuments({
                        vendorId: service.vendorId,
                        status: "active",
                    });

                if (activeServiceCount >= 3) {
                    return res.status(403).json({
                        success: false,
                        message:
                            "This vendor has reached the maximum of 3 active services. Upgrade to Premium to approve more services.",
                    });
                }
            }

            await db.collection("services").updateOne(
                {
                    _id: new ObjectId(id),
                    status: "pending",
                },
                {
                    $set: {
                        status: "active",
                        updatedAt: new Date(),
                    },
                }
            );

            return res.status(200).json({
                success: true,
                message: "Service approved successfully",
            });
        } catch (error) {
            console.error("Approve service error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to approve service",
            });
        }
    }
);

// Admin: Reject a pending service
router.patch(
    "/admin/services/:id/reject",
    verifyToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const id = req.params.id;

            if (typeof id !== "string" || !ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid service ID",
                });
            }

            const db = await connectDB();

            const result = await db.collection("services").updateOne(
                {
                    _id: new ObjectId(id),
                    status: "pending",
                },
                {
                    $set: {
                        status: "rejected",
                        updatedAt: new Date(),
                    },
                }
            );

            if (result.matchedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Pending service not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Service rejected successfully",
            });
        } catch (error) {
            console.error("Reject service error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to reject service",
            });
        }
    }
);



// Admin: Get dashboard statistics
router.get(
    "/admin/stats",
    verifyToken,
    authorizeRole("admin"),
    async (_req, res) => {
        try {
            const db = await connectDB();

            const [
                totalUsers,
                totalCustomers,
                totalVendors,
                totalServices,
                activeServices,
                pendingServices,
                rejectedServices,
                totalBookings,
                totalTransactions,
            ] = await Promise.all([
                db.collection("user").countDocuments(),
                db.collection("user").countDocuments({ role: "customer" }),
                db.collection("user").countDocuments({ role: "vendor" }),
                db.collection("services").countDocuments(),
                db.collection("services").countDocuments({ status: "active" }),
                db.collection("services").countDocuments({ status: "pending" }),
                db.collection("services").countDocuments({ status: "rejected" }),
                db.collection("bookings").countDocuments(),
                db.collection("transactions").countDocuments(),
            ]);

            return res.status(200).json({
                success: true,
                message: "Dashboard statistics retrieved successfully",
                stats: {
                    totalUsers,
                    totalCustomers,
                    totalVendors,
                    totalServices,
                    activeServices,
                    pendingServices,
                    rejectedServices,
                    totalBookings,
                    totalTransactions,
                },
            });
        } catch (error) {
            console.error("Get dashboard statistics error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to retrieve dashboard statistics",
            });
        }
    }
);



// Admin: Get all transactions
router.get(
    "/admin/transactions",
    verifyToken,
    authorizeRole("admin"),
    async (_req, res) => {
        try {
            const db = await connectDB();

            const transactions = await db
                .collection("transactions")
                .find({})
                .sort({ createdAt: -1 })
                .toArray();

            return res.status(200).json({
                success: true,
                message: "Transactions retrieved successfully",
                transactions,
            });
        } catch (error) {
            console.error("Get admin transactions error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to retrieve transactions",
            });
        }
    }
);


// Admin: Get all services with search and filters
router.get(
    "/admin/services",
    verifyToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const { search, category, status } = req.query;

            const filter: {
                serviceName?: { $regex: string; $options: string };
                category?: { $regex: string; $options: string };
                status?: string;
            } = {};

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

            if (
                typeof status === "string" &&
                ["pending", "active", "rejected"].includes(status)
            ) {
                filter.status = status;
            }

            const db = await connectDB();

            const services = await db
                .collection("services")
                .find(filter)
                .sort({ createdAt: -1 })
                .toArray();

            return res.status(200).json({
                success: true,
                message: "All services retrieved successfully",
                total: services.length,
                services,
            });
        } catch (error) {
            console.error("Get all admin services error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to retrieve services",
            });
        }
    }
);


// Admin: Update service status
router.patch(
    "/admin/services/:id/status",
    verifyToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const id = req.params.id;
            const { status } = req.body;

            if (typeof id !== "string" || !ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid service ID",
                });
            }

            if (!["pending", "active", "rejected"].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid service status",
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

            if (status === "active" && service.status !== "active") {
                if (
                    typeof service.vendorId !== "string" ||
                    !ObjectId.isValid(service.vendorId)
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid service vendor",
                    });
                }

                const vendor = await db.collection("user").findOne({
                    _id: new ObjectId(service.vendorId),
                });

                if (!vendor) {
                    return res.status(404).json({
                        success: false,
                        message: "Service vendor not found",
                    });
                }

                if (vendor.isPremium !== true) {
                    const activeCount = await db.collection("services").countDocuments({
                        vendorId: service.vendorId,
                        status: "active",
                    });

                    if (activeCount >= 3) {
                        return res.status(403).json({
                            success: false,
                            message: "This vendor has reached the maximum of 3 active services. Upgrade to Premium.",
                        });
                    }
                }
            }

            await db.collection("services").updateOne(
                { _id: new ObjectId(id) },
                {
                    $set: {
                        status,
                        updatedAt: new Date(),
                    },
                }
            );

            return res.status(200).json({
                success: true,
                message: `Service status updated to ${status}`,
            });
        } catch (error) {
            console.error("Admin update service status error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to update service status",
            });
        }
    }
);

// Admin: Delete a service
router.delete(
    "/admin/services/:id",
    verifyToken,
    authorizeRole("admin"),
    async (req, res) => {
        try {
            const id = req.params.id;

            if (typeof id !== "string" || !ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid service ID",
                });
            }

            const db = await connectDB();

            const result = await db.collection("services").deleteOne({
                _id: new ObjectId(id),
            });

            if (result.deletedCount === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Service not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Service deleted successfully",
            });
        } catch (error) {
            console.error("Admin delete service error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to delete service",
            });
        }
    }
);


export default router;
