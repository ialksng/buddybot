import express from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { signup, login, forgotPassword } from "../controllers/authController.js";

const router = express.Router();

const getJwtSecret = () => process.env.JWT_SECRET || "buddybot_jwt_secret";

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
    return res.status(200).json({ authenticated: false });
  }
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    return res.status(200).json({ authenticated: true, user: decoded });
  } catch (err) {
    return res.status(200).json({ authenticated: false });
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
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })(req, res, next);
});

// Step 2: Handle Google callback
router.get("/google/callback", (req, res, next) => {
  const clientBase = (
    process.env.CLIENT_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://ialksng.me/work/projects/buddybot/app"
      : "http://localhost:5173/work/projects/buddybot/app")
  ).replace(/\/+$/, "");

  const frontendURL = `${clientBase}/`;
  const failureURL = `${clientBase}/login`;

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Auth Error</title></head>
      <body>
        <script>
          window.location.replace("${failureURL}?error=google_not_configured");
        </script>
      </body>
      </html>
    `);
  }

  passport.authenticate("google", { session: false }, (err, user, info) => {
    if (err) {
      console.error("Passport Google Callback Error:", err);
      const msg = err.message || "Google authentication failed";
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Authentication Error</title>
        </head>
        <body style="background:#0f172a;color:#ffffff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui,-apple-system,sans-serif;">
          <div style="text-align:center;background:#1e293b;padding:32px 40px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            <div style="font-size:24px;margin-bottom:8px;">⚠️</div>
            <h3 style="margin:0 0 8px;color:#ef4444;font-size:18px;">Sign In Failed</h3>
            <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;">${msg}</p>
            <p style="margin:0;color:#64748b;font-size:12px;">Redirecting back to login...</p>
          </div>
          <script>
            setTimeout(function() {
              window.location.replace("${failureURL}?error=${encodeURIComponent(msg)}");
            }, 1200);
          </script>
        </body>
        </html>
      `);
    }

    if (!user) {
      console.error("Passport Google No User:", info);
      const msg = info?.message || "User authentication failed";
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Authentication Error</title>
        </head>
        <body style="background:#0f172a;color:#ffffff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:system-ui,-apple-system,sans-serif;">
          <div style="text-align:center;background:#1e293b;padding:32px 40px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            <div style="font-size:24px;margin-bottom:8px;">⚠️</div>
            <h3 style="margin:0 0 8px;color:#ef4444;font-size:18px;">Authentication Incomplete</h3>
            <p style="margin:0 0 16px;color:#94a3b8;font-size:14px;">${msg}</p>
            <p style="margin:0;color:#64748b;font-size:12px;">Redirecting back to login...</p>
          </div>
          <script>
            setTimeout(function() {
              window.location.replace("${failureURL}?error=${encodeURIComponent(msg)}");
            }, 1200);
          </script>
        </body>
        </html>
      `);
    }

    try {
      const userPayload = {
        id: user._id,
        email: user.email,
        username: user.username || user.email?.split("@")[0] || "User",
      };

      // Generate JWT with user info
      const token = jwt.sign(
        userPayload,
        getJwtSecret(),
        { expiresIn: "7d" }
      );

      // Return a 200 HTML page that directly saves the token to localStorage and redirects.
      // Returning 200 OK prevents reverse proxy layers from swallowing 302 redirects!
      return res.status(200).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta http-equiv="refresh" content="0;url=${frontendURL}?token=${token}">
          <title>Signing in to BuddyBOT...</title>
          <style>
            body {
              background-color: #0f172a;
              color: #f8fafc;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            }
            .auth-card {
              text-align: center;
              background: #1e293b;
              padding: 36px 44px;
              border-radius: 18px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.4);
              border: 1px solid rgba(255,255,255,0.08);
              max-width: 360px;
              width: 90%;
            }
            .spinner {
              width: 38px;
              height: 38px;
              border: 3px solid rgba(255,255,255,0.12);
              border-top-color: #ef7722;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
              margin: 0 auto 16px;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
            h3 {
              margin: 0 0 6px;
              font-size: 19px;
              font-weight: 600;
              color: #ffffff;
            }
            p {
              margin: 0;
              color: #94a3b8;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="auth-card">
            <div class="spinner"></div>
            <h3>Signed in successfully!</h3>
            <p>Loading your chat history...</p>
          </div>
          <script>
            try {
              localStorage.setItem("token", "${token}");
              localStorage.setItem("user", JSON.stringify(${JSON.stringify(userPayload)}));
              localStorage.removeItem("guest_msg_count");
            } catch (storageErr) {
              console.error("Storage error:", storageErr);
            }
            window.location.replace("${frontendURL}?token=${token}");
          </script>
        </body>
        </html>
      `);
    } catch (tokenErr) {
      console.error("JWT sign error in Google callback:", tokenErr);
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Error</title></head>
        <body>
          <script>
            window.location.replace("${failureURL}?error=${encodeURIComponent(tokenErr.message)}");
          </script>
        </body>
        </html>
      `);
    }
  })(req, res, next);
});

export default router;
