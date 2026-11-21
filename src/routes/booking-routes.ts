
import { Router } from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../config/db.js";
import { verifyToken } from "../middleware/verify-token.js";
import { authorizeRole } from "../middleware/authorize-role.js";

const router = Router();

// Customer: Create a booking request
router.post(
    "/bookings",
    verifyToken,
    authorizeRole("customer"),
    async (req, res) => {
        try {
            const user = req.user;

            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: "Authentication required",
                });
            }

            const { serviceId, eventDate, eventLocation, message } = req.body;

            if (
                typeof serviceId !== "string" ||
                !ObjectId.isValid(serviceId) ||
                typeof eventDate !== "string" ||
                !eventDate.trim() ||
                typeof eventLocation !== "string" ||
                !eventLocation.trim() ||
                typeof message !== "string"
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide valid booking information",
                });
            }

            const parsedEventDate = new Date(eventDate);

            if (
                Number.isNaN(parsedEventDate.getTime()) ||
                parsedEventDate <= new Date()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Event date must be a valid future date",
                });
            }

            const db = await connectDB();

            const service = await db.collection("services").findOne({
                _id: new ObjectId(serviceId),
                status: "active",
            });

            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: "Active service not found",
                });
            }

            if (service.vendorId === user.id) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot book your own service",
                });
            }

            const duplicateBooking = await db.collection("bookings").findOne({
                serviceId,
                customerId: user.id,
                eventDate: parsedEventDate,
                status: { $in: ["pending", "accepted"] },
            });

            if (duplicateBooking) {
                return res.status(409).json({
                    success: false,
                    message: "You already have an active booking for this service and date",
                });
            }

            const newBooking = {
                serviceId,
                vendorId: service.vendorId,
                customerId: user.id,
                eventDate: parsedEventDate,
                eventLocation: eventLocation.trim(),
                message: message.trim(),
                status: "pending",
                createdAt: new Date(),
            };

            const result = await db.collection("bookings").insertOne(newBooking);

            return res.status(201).json({
                success: true,
                message: "Booking request submitted successfully",
                booking: {
                    _id: result.insertedId,
                    ...newBooking,
                },
            });
        } catch (error) {
            console.error("Create booking error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to create booking",
            });
        }
    }
);


// Customer: Get all personal bookings
router.get(
    "/bookings/my-bookings",
    verifyToken,
    authorizeRole("customer"),
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

            const bookings = await db.collection("bookings")
                .find({ customerId: user.id })
                .sort({ createdAt: -1 })
                .toArray();

            return res.status(200).json({
                success: true,
                message: "My bookings retrieved successfully",
                total: bookings.length,
                bookings,
            });
        } catch (error) {
            console.error("Get my bookings error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to retrieve bookings",
            });
        }
    }
);


// Vendor: Get booking requests for own services
router.get(
    "/bookings/vendor-requests",
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

            const bookings = await db.collection("bookings")
                .find({ vendorId: user.id })
                .sort({ createdAt: -1 })
                .toArray();

            return res.status(200).json({
                success: true,
                message: "Booking requests retrieved successfully",
                total: bookings.length,
                bookings,
            });
        } catch (error) {
            console.error("Get vendor booking requests error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to retrieve booking requests",
            });
        }
    }
);


// Vendor: Accept or reject a booking request
router.patch(
    "/bookings/:id/status",
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
            const { status } = req.body;

            if (typeof id !== "string" || !ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid booking ID",
                });
            }

            if (status !== "accepted" && status !== "rejected") {
                return res.status(400).json({
                    success: false,
                    message: "Status must be accepted or rejected",
                });
            }

            const db = await connectDB();

            const booking = await db.collection("bookings").findOne({
                _id: new ObjectId(id),
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found",
                });
            }

            if (booking.vendorId !== user.id) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot manage another vendor's booking",
                });
            }

            if (booking.status !== "pending") {
                return res.status(400).json({
                    success: false,
                    message: "Only pending bookings can be updated",
                });
            }

            const result = await db.collection("bookings").updateOne(
                {
                    _id: new ObjectId(id),
                    vendorId: user.id,
                    status: "pending",
                },
                {
                    $set: { status },
                }
            );

            if (result.modifiedCount === 0) {
                return res.status(409).json({
                    success: false,
                    message: "Booking is no longer pending",
                });
            }

            return res.status(200).json({
                success: true,
                message: `Booking ${status} successfully`,
            });
        } catch (error) {
            console.error("Update booking status error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to update booking status",
            });
        }
    }
);



// Customer: Cancel own pending booking
router.patch(
    "/bookings/:id/cancel",
    verifyToken,
    authorizeRole("customer"),
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
                    message: "Invalid booking ID",
                });
            }

            const db = await connectDB();

            const booking = await db.collection("bookings").findOne({
                _id: new ObjectId(id),
            });

            if (!booking) {
                return res.status(404).json({
                    success: false,
                    message: "Booking not found",
                });
            }

            if (booking.customerId !== user.id) {
                return res.status(403).json({
                    success: false,
                    message: "You cannot cancel another customer's booking",
                });
            }

            if (booking.status !== "pending") {
                return res.status(400).json({
                    success: false,
                    message: "Only pending bookings can be cancelled",
                });
            }

            const result = await db.collection("bookings").updateOne(
                {
                    _id: new ObjectId(id),
                    customerId: user.id,
                    status: "pending",
                },
                {
                    $set: { status: "cancelled" },
                }
            );

            if (result.modifiedCount === 0) {
                return res.status(409).json({
                    success: false,
                    message: "Booking is no longer pending",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Booking cancelled successfully",
            });
        } catch (error) {
            console.error("Cancel booking error:", error);

            return res.status(500).json({
                success: false,
                message: "Failed to cancel booking",
            });
        }
    }
);



export default router;
