import "./App.css";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import { MyContext } from "./MyContext.jsx";
import { useState, useEffect } from "react";
import { v1 as uuidv1 } from "uuid";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { API_URL, BASE_PATH } from "./apiConfig.js";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";

function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [guestCount, setGuestCount] = useState(() => {
    return parseInt(localStorage.getItem("guest_msg_count") || "0", 10);
  });
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Validate authentication state on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    if (tokenFromUrl) {
      localStorage.setItem("token", tokenFromUrl);
      localStorage.removeItem("guest_msg_count");
      setGuestCount(0);
      window.history.replaceState({}, "", window.location.pathname);
    }

    const token = tokenFromUrl || localStorage.getItem("token");

    // If no token, cleanly start as a guest user
    if (!token || token === "undefined" || token === "null" || token.trim() === "") {
      localStorage.removeItem("token");
      setIsAuthenticated(false);
      setIsAuthReady(true);
      return;
    }

    // Verify token with backend
    fetch(`${API_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setIsAuthenticated(true);
          localStorage.removeItem("guest_msg_count");
          setGuestCount(0);

          // Claim guest thread if exists
          const guestThreadId = localStorage.getItem("guest_thread_id");
          if (guestThreadId) {
            fetch(`${API_URL}/api/claim-thread`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ threadId: guestThreadId })
            }).catch(e => console.log(e));
            localStorage.removeItem("guest_thread_id");
          }
        } else {
          // Token expired or invalid: reset cleanly to guest!
          localStorage.removeItem("token");
          setIsAuthenticated(false);
        }
      })
      .catch(() => {
        // If server fails or offline, fall back to guest
        localStorage.removeItem("token");
        setIsAuthenticated(false);
      })
      .finally(() => {
        setIsAuthReady(true);
      });
  }, []);

  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(null);
  const [currThreadId, setCurrThreadId] = useState(uuidv1());
  const [prevChats, setPrevChats] = useState([]);
  const [newChat, setNewChat] = useState(true);
  const [allThreads, setAllThreads] = useState([]);

  const providerValues = {
    prompt,
    setPrompt,
    reply,
    setReply,
    currThreadId,
    setCurrThreadId,
    newChat,
    setNewChat,
    prevChats,
    setPrevChats,
    allThreads,
    setAllThreads,
    isAuthenticated,
    setIsAuthenticated,
    guestCount,
    setGuestCount,
    showAuthModal,
    setShowAuthModal,
  };

  if (!isAuthReady) return null; // wait until we check token

  const baseUrl = BASE_PATH;

  const chatApp = (
    <div className="app">
      <MyContext.Provider value={providerValues}>
        <Sidebar />
        <ChatWindow />
      </MyContext.Provider>
    </div>
  );

  return (
    <BrowserRouter basename={baseUrl}>
      <Routes>
        {/* Direct chat on root */}
        <Route path="/" element={chatApp} />
        <Route path="/chat" element={chatApp} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />

        {/* default redirect to chat */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
