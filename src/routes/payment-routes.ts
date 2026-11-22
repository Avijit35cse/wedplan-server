import express, { Router } from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import { ObjectId } from "mongodb";
import { connectDB } from "../config/db.js";
import { verifyToken } from "../middleware/verify-token.js";
import { authorizeRole } from "../middleware/authorize-role.js";

dotenv.config();

const router = Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Create Stripe subscription checkout session
router.post(
  "/payments/create-checkout-session",
  verifyToken,
  authorizeRole("vendor"),
  async (req, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({
          success: false,
          message: "Stripe is not configured.",
        });
      }

      const priceId = process.env.STRIPE_PRICE_ID;
      const clientUrl = process.env.CLIENT_URL;

      if (!priceId || !clientUrl) {
        return res.status(500).json({
          success: false,
          message: "Stripe price or client URL is missing.",
        });
      }

      const userId = req.user?.id;
      const email = req.user?.email;

      if (!userId || !ObjectId.isValid(userId)) {
        return res.status(401).json({
          success: false,
          message: "Invalid user.",
        });
      }

      const db = await connectDB();
      const user = await db.collection("user").findOne({
        _id: new ObjectId(userId),
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Vendor not found.",
        });
      }

      if (user.isPremium === true) {
        return res.status(400).json({
          success: false,
          message: "You already have a Premium subscription.",
        });
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: email || user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        metadata: { userId },
        subscription_data: {
          metadata: { userId },
        },
        success_url: `${clientUrl}/vendor/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/vendor/subscription/cancel`,
      });

      return res.status(200).json({
        success: true,
        url: session.url,
      });
    } catch (error) {
      console.error("Create checkout session error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to create checkout session.",
      });
    }
  }
);

// Stripe webhook - this route must receive the raw request body
router.post(
  "/payments/webhook",
  async (req, res) => {
    if (!stripe) {
      return res.status(500).send("Stripe is not configured.");
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const signature = req.headers["stripe-signature"];

    if (!webhookSecret || !signature || typeof signature !== "string") {
      return res.status(400).send("Missing webhook signature or secret.");
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        webhookSecret
      );
    } catch (error) {
      console.error("Stripe webhook signature error:", error);
      return res.status(400).send("Invalid webhook signature.");
    }

    try {
      const db = await connectDB();

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId && ObjectId.isValid(userId)) {
          await db.collection("user").updateOne(
            { _id: new ObjectId(userId), role: "vendor" },
            {
              $set: {
                isPremium: true,
                stripeCustomerId: String(session.customer || ""),
                stripeSubscriptionId: String(session.subscription || ""),
                updatedAt: new Date(),
              },
            }
          );

          await db.collection("transactions").updateOne(
            { stripeSessionId: session.id },
            {
              $setOnInsert: {
                userId,
                vendorEmail: session.customer_details?.email || "",
                amount: (session.amount_total || 0) / 100,
                currency: (session.currency || "usd").toUpperCase(),
                status: "paid",
                paymentMethod: "Stripe",
                stripeSessionId: session.id,
                stripeSubscriptionId: String(session.subscription || ""),
                createdAt: new Date(),
              },
            },
            { upsert: true }
          );
        }
      }

      if (event.type === "customer.subscription.deleted") {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId && ObjectId.isValid(userId)) {
          await db.collection("user").updateOne(
            { _id: new ObjectId(userId), role: "vendor" },
            {
              $set: {
                isPremium: false,
                updatedAt: new Date(),
              },
              $unset: {
                stripeSubscriptionId: "",
              },
            }
          );
        }
      }

      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("Stripe webhook processing error:", error);
      return res.status(500).send("Webhook processing failed.");
    }
  }
);

export default router;





