import "./Auth.css";
import axios from "axios";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_URL, GOOGLE_AUTH_URL } from "../apiConfig.js";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API_URL}/api/auth/signup`, {
        username,
        email,
        password,
      });
      localStorage.setItem("token", data.token);
      localStorage.removeItem("guest_msg_count");

      // Claim guest thread if exists
      const guestThreadId = localStorage.getItem("guest_thread_id");
      if (guestThreadId) {
        axios.post(`${API_URL}/api/claim-thread`, { threadId: guestThreadId }, {
          headers: { Authorization: `Bearer ${data.token}` }
        }).catch(() => {});
        localStorage.removeItem("guest_thread_id");
      }

      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
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
        <h2>Create an Account ✨</h2>
        <p className="auth-subtext">Join BuddyBOT and start chatting smarter</p>

        <form onSubmit={handleSignup}>
          <input
            type="text"
            placeholder="Full name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
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
          <button type="submit">Sign Up</button>
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
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
