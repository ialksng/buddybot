import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import session from "express-session";
import passport from "./config/passport.js";
import chatRoutes from "./routes/chat.js";
import authRoutes from "./routes/auth.js";

// Load environment variables
dotenv.config();

// Create express app
const app = express();

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow any origin or requests without origin (like mobile/curl/server-to-server)
      callback(null, true);
    },
    credentials: true,
  })
);

// Session and Passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || "buddybot_secret_session_key",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

// Connect to MongoDB (optimized & cached for serverless + standalone)
export const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is not defined");
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected with Database");
  } catch (err) {
    console.error("❌ Failed to connect with Database:", err.message);
    throw err;
  }
};

// Ensure database is connected before handling API requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Database connection middleware error:", err.message);
    res.status(500).json({ error: "Database connection failed", details: err.message });
  }
});

// JWT verification middleware (attaches user if valid, non-blocking if token omitted)
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token || token === "null" || token === "undefined") {
    req.user = null;
    return next();
  }

  try {
    const secret = process.env.JWT_SECRET || "buddybot_jwt_secret";
    const decoded = jwt.verify(token, secret);
    req.user = {
      ...decoded,
      id: decoded.id || decoded._id || decoded.userId || decoded.sub,
    };
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

// Routes (supports both direct API routes and subpath routes)
// Auth routes
app.use(["/work/projects/buddybot/app/api/auth", "/api/auth", "/auth"], authRoutes);

// Chat & Thread routes
app.use(["/work/projects/buddybot/app/api", "/api"], verifyToken, chatRoutes);
app.use("/api/chat", verifyToken, chatRoutes);

// Serve frontend when running as standalone Node server (Render / Docker / local)
if (!process.env.VERCEL && process.env.NODE_ENV === "production") {
  const frontendPath = path.join(__dirname, "../frontend/dist");
  app.use(express.static(frontendPath));

  // Universal fallback for SPA
  app.all(/(.*)/, (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

// Start server when run directly (not inside Vercel serverless functions)
if (!process.env.VERCEL && process.env.NODE_ENV !== "test") {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, async () => {
    try {
      await connectDB();
    } catch (e) {
      // logged inside connectDB
    }
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

export default app;
