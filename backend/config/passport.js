import "dotenv/config";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  // Use production domain callback authorized in Google Cloud Console
  const defaultCallback =
    process.env.GOOGLE_CALLBACK_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://ialksng.me/work/projects/buddybot/app/api/auth/google/callback"
      : "/api/auth/google/callback");

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: defaultCallback,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase().trim() || "";
          
          // Find user by either Google ID or Email
          let user = await User.findOne({
            $or: [
              { googleId: profile.id },
              ...(email ? [{ email }] : [])
            ]
          });

          if (user) {
            // If user already existed by email, link Google ID and update name if missing
            if (!user.googleId) {
              user.googleId = profile.id;
            }
            if (!user.username && profile.displayName) {
              user.username = profile.displayName;
            }
            await user.save();
          } else {
            // Create brand new user
            user = await User.create({
              googleId: profile.id,
              username: profile.displayName || (email ? email.split("@")[0] : "User"),
              email: email,
              password: "",
              role: "student",
            });
          }
          return done(null, user);
        } catch (err) {
          console.error("Passport Google Strategy error:", err);
          return done(err, null);
        }
      }
    )
  );
} else {
  console.warn("⚠️ Google OAuth credentials not found in env. Google login disabled until configured.");
}

export default passport;
