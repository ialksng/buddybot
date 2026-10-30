import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET || "buddybot_jwt_secret";

// Helper: Generate JWT
const generateToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      email: user.email,
      username: user.username || user.email?.split("@")[0] || "User",
    },
    JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );

// =============================
// SIGNUP
// =============================
export const signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    let user = await User.findOne({ email });

    // If user exists but has no password (Google login before)
    if (user && !user.password) {
      user.username = username || user.username;
      user.password = password;
      await user.save();

      const token = generateToken(user);
      return res.status(200).json({ token, user });
    }

    // If user already exists with a password
    if (user) return res.status(400).json({ message: "User already exists" });

    // Create new user
    const role = (await User.countDocuments()) === 0 ? "admin" : "student";
    user = await User.create({ username, email, password, role });

    const token = generateToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: "Server error during signup" });
  }
};

// =============================
// LOGIN
// =============================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // If user was created via Google and has no password
    if (!user.password)
      return res
        .status(400)
        .json({ message: "This account is linked with Google. Please login with Google." });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = generateToken(user);
    res.status(200).json({ token, user });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error during login" });
  }
};

// =============================
// FORGOT PASSWORD
// =============================
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user)
      return res.status(200).json({ message: "If user exists, an email has been sent" });

    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetUrl = `${process.env.CLIENT_URL}/reset/${resetToken}`;

    await sendEmail(email, "Password Reset", `Reset your password: ${resetUrl}`);
    res.status(200).json({ message: "Email sent successfully" });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Server error during password reset" });
  }
};

// =============================
// GOOGLE LOGIN (API-based)
// =============================
export const googleLogin = async (req, res) => {
  try {
    const { id, email, name } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        googleId: id,
        username: name,
        email,
        password: "",
        role: "student",
      });
    }

    const token = generateToken(user);
    res.status(200).json({ token, user });
  } catch (err) {
    console.error("Google Login Error:", err);
    res.status(500).json({ message: "Google login failed" });
  }
};
