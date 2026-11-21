
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import userRoutes from "./routes/user-routes.js";



dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", userRoutes);

app.get("/", (_req, res) => {
  res.send("WedPlan Server is running!");
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`WedPlan server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
