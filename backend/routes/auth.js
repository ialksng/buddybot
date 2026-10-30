import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { signup, login, forgotPassword } from "../controllers/authController.js";

const router = express.Router();

// ----------------------
// 🧩 Normal Auth Routes
// ----------------------
router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);

// Verify current session / token
router.get("/me", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({ authenticated: false });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "buddybot_jwt_secret");
    return res.json({ authenticated: true, user: decoded });
  } catch (err) {
    return res.status(401).json({ authenticated: false });
  }
});

// ----------------------
// 🌐 Google OAuth Routes
// ----------------------

// Step 1: Redirect to Google login
router.get("/google", (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      error: "Google OAuth is not configured on this server.",
    });
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

// Step 2: Handle Google callback
router.get("/google/callback", (req, res, next) => {
  const frontendURL =
    process.env.CLIENT_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://ialksng.me/work/projects/buddybot/app"
      : "http://localhost:5173/work/projects/buddybot/app");
  const failureURL = `${frontendURL}/login`;

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.redirect(`${failureURL}?error=google_not_configured`);
  }
  passport.authenticate("google", { failureRedirect: failureURL, session: false })(req, res, () => {
    try {
      // Generate JWT
      const token = jwt.sign(
        { id: req.user._id, email: req.user.email },
        process.env.JWT_SECRET || "buddybot_jwt_secret",
        { expiresIn: "7d" }
      );

      // Redirect to frontend chat page with token
      res.redirect(`${frontendURL}?token=${token}`);
    } catch (err) {
      console.error("❌ Google OAuth callback error:", err);
      res.redirect(`${failureURL}?error=google`);
    }
  });
});

export default router;
