import "./Auth.css";
import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_URL, GOOGLE_AUTH_URL } from "../apiConfig.js";
import { setStoredToken, setStoredUser } from "../storage.js";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get("error");
    if (err) {
      setError(`Authentication error: ${decodeURIComponent(err)}`);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password,
      });
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

      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  const handleGoogle = () => {
    window.location.href = GOOGLE_AUTH_URL;
  };

  return (
    <div className="auth-container">
      <nav className="auth-navbar">
        <Link to="/" className="dashboard-logo" style={{ textDecoration: "none", color: "inherit" }}>BuddyBOT</Link>
        <div className="nav-actions">
          <Link to="/" className="nav-btn">Chat</Link>
        </div>
      </nav>

      <div className="auth-card">
        <h2>Welcome Back 👋</h2>
        <p className="auth-subtext">Login to continue chatting with BuddyBOT</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="auth-error">{error}</p>}
          <button type="submit">Login</button>
        </form>

        <div className="divider">OR</div>

        <button className="google-btn" onClick={handleGoogle}>
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google"
          />
          Continue with Google
        </button>

        <p className="auth-footer">
          Don’t have an account? <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
