import "./AuthModal.css";
import { useState } from "react";
import axios from "axios";
import buddyBotLogo from "./assets/buddy-bot.png";
import { API_URL, GOOGLE_AUTH_URL } from "./apiConfig.js";
import { setStoredToken, setStoredUser } from "./storage.js";

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = "login" }) {
  if (!isOpen) return null;

  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "signup" ? `${API_URL}/api/auth/signup` : `${API_URL}/api/auth/login`;
      const payload = mode === "signup" ? { username, email, password } : { email, password };

      const { data } = await axios.post(endpoint, payload);
      setStoredToken(data.token);
      if (data.user) {
        setStoredUser(data.user);
      }
      localStorage.removeItem("buddybot_guest_msg_count");
      localStorage.removeItem("guest_msg_count");

      // Claim guest thread if exists
      const guestThreadId = localStorage.getItem("buddybot_guest_thread_id") || localStorage.getItem("guest_thread_id");
      if (guestThreadId) {
        axios.post(`${API_URL}/api/claim-thread`, { threadId: guestThreadId }, {
          headers: { Authorization: `Bearer ${data.token}` }
        }).catch(() => {});
        localStorage.removeItem("buddybot_guest_thread_id");
        localStorage.removeItem("guest_thread_id");
      }

      if (onAuthSuccess) {
        onAuthSuccess(data.token, data.user);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || `${mode === "signup" ? "Signup" : "Login"} failed. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    window.location.href = GOOGLE_AUTH_URL;
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="auth-modal-header">
          <img src={buddyBotLogo} alt="BuddyBOT" className="auth-modal-logo" />
          <h2>{mode === "signup" ? "Create an account" : "Welcome back"}</h2>
          <p>
            {mode === "signup"
              ? "Sign up to continue chatting and start saving your conversation history."
              : "Log in to access your chat history and continue conversations."}
          </p>
        </div>

        {/* Tab switch */}
        <div className="auth-modal-tabs">
          <button
            type="button"
            className={`auth-modal-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => { setMode("signup"); setError(""); }}
          >
            Sign up
          </button>
          <button
            type="button"
            className={`auth-modal-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => { setMode("login"); setError(""); }}
          >
            Log in
          </button>
        </div>

        {error && <div className="auth-modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-modal-form">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Full name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="auth-modal-input"
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="auth-modal-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="auth-modal-input"
          />

          <button type="submit" className="auth-modal-submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "signup" ? "Create Free Account" : "Log In"}
          </button>
        </form>

        <div className="auth-modal-divider">
          <span>OR</span>
        </div>

        <button type="button" className="auth-modal-google" onClick={handleGoogle}>
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google"
          />
          Continue with Google
        </button>

        <p className="auth-modal-footer">
          {mode === "signup" ? (
            <>Already have an account? <span onClick={() => { setMode("login"); setError(""); }} className="auth-modal-link">Log in</span></>
          ) : (
            <>Don't have an account? <span onClick={() => { setMode("signup"); setError(""); }} className="auth-modal-link">Sign up</span></>
          )}
        </p>
      </div>
    </div>
  );
}
