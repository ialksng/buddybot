import "./AuthModal.css";
import { Link } from "react-router-dom";
import buddyBotLogo from "./assets/buddy-bot.png";

export default function AuthModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const API_URL = import.meta.env.VITE_API_URL || "";

  const handleGoogle = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className="auth-modal-header">
          <img src={buddyBotLogo} alt="BuddyBOT" className="auth-modal-logo" />
          <h2>Welcome to BuddyBOT</h2>
          <p>Log in or sign up to continue chatting and start saving your conversation history.</p>
        </div>

        <div className="auth-modal-actions">
          <Link to="/signup" className="auth-modal-btn signup-btn" onClick={onClose}>
            Sign up
          </Link>
          <Link to="/login" className="auth-modal-btn login-btn" onClick={onClose}>
            Log in
          </Link>

          <div className="auth-modal-divider">
            <span>OR</span>
          </div>

          <button className="auth-modal-google" onClick={handleGoogle}>
            <img
              src="https://developers.google.com/identity/images/g-logo.png"
              alt="Google"
            />
            Continue with Google
          </button>
        </div>

        <p className="auth-modal-footer">
          Free account • No credit card required • Instant access
        </p>
      </div>
    </div>
  );
}

