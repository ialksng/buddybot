import "./Dashboard.css";
import { Link } from "react-router-dom";

export default function Dashboard({ isAuthenticated }) {
  return (
    <div className="dashboard-container">
      {/* Navbar */}
      <nav className="dashboard-navbar">
        <Link to="/" className="dashboard-logo" style={{ textDecoration: "none", color: "inherit" }}>BuddyBOT</Link>
        <div className="nav-actions">
          {isAuthenticated ? (
            <Link to="/chat" className="nav-btn signup">Go to Chat</Link>
          ) : (
            <>
              <Link to="/login" className="nav-btn">Login</Link>
              <Link to="/signup" className="nav-btn signup">Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div className="dashboard-main">
        <h1>Meet BuddyBOT 🤖</h1>
        <p>
          Your intelligent chatbot companion that helps you with conversations, answers,
          and insights — built with the power of AI and the MERN stack.
        </p>
        <Link to={isAuthenticated ? "/chat" : "/signup"} className="get-started-btn">
          {isAuthenticated ? "Open Chat" : "Get Started"}
        </Link>
      </div>
    </div>
  );
}
