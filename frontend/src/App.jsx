import "./App.css";
import Sidebar from "./Sidebar.jsx";
import ChatWindow from "./ChatWindow.jsx";
import { MyContext } from "./MyContext.jsx";
import { useState, useEffect } from "react";
import { v1 as uuidv1 } from "uuid";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";

function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );
  const [guestCount, setGuestCount] = useState(() => {
    return parseInt(localStorage.getItem("guest_msg_count") || "0", 10);
  });
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ✅ Capture Google token early
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      setIsAuthenticated(true);
      localStorage.removeItem("guest_msg_count");
      setGuestCount(0);
      window.history.replaceState({}, "", window.location.pathname); // clean URL without stripping subpath

      // Claim guest thread if exists
      const guestThreadId = localStorage.getItem("guest_thread_id");
      if (guestThreadId) {
        const API_URL = import.meta.env.VITE_API_URL || "";
        fetch(`${API_URL}/api/claim-thread`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ threadId: guestThreadId })
        }).catch(err => console.log(err));
        localStorage.removeItem("guest_thread_id");
      }
    }

    setIsAuthReady(true);
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

  const baseUrl = (import.meta.env.BASE_URL || "/work/projects/buddybot/app").replace(/\/$/, "");

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
