import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { UserRole } from "../types/express.js";
import { connectDB } from "../config/db.js";
import { ObjectId } from "mongodb";

const authUrl = process.env.BETTER_AUTH_URL;

if (!authUrl) {
    throw new Error("BETTER_AUTH_URL is missing from environment variables");
}

const baseUrl = authUrl.replace(/\/$/, "");

const JWKS = createRemoteJWKSet(
    new URL(`${baseUrl}/api/auth/jwks`)
);

const allowedRoles: UserRole[] = ["customer", "vendor", "admin"];

const verifyToken = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is required",
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is missing",
            });
        }

        const { payload } = await jwtVerify(token, JWKS, {
            issuer: baseUrl,
            audience: baseUrl,
        });

        const { id, email, role } = payload;

        if (
            typeof id !== "string" ||
            typeof email !== "string" ||
            typeof role !== "string" ||
            !allowedRoles.includes(role as UserRole)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token",
            });
        }

        // Check current user status from database
        const db = await connectDB();

        const user = await db.collection("user").findOne({
            _id: new ObjectId(id),
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found",
            });
        }

        if (user.isBlocked === true) {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked",
            });
        }

        req.user = {
            id,
            email,
            role: role as UserRole,
        };

        next();
    } catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token",
        });
    }
};

export { verifyToken };