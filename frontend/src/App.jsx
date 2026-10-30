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
import {
  getStoredToken,
  setStoredToken,
  getStoredUser,
  setStoredUser,
  getCachedThreads,
  setCachedThreads,
  getActiveThreadId,
  setActiveThreadId,
  getActiveChats,
  setActiveChats,
  clearAllBuddyBotStorage,
} from "./storage.js";

const parseJwt = (token) => {
  try {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    return getStoredUser() || parseJwt(getStoredToken());
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    const token = tokenFromUrl || getStoredToken();
    if (!token || token === "null" || token === "undefined") return false;
    const parsed = parseJwt(token);
    if (!parsed) return false;
    if (parsed.exp && parsed.exp * 1000 < Date.now()) return false;
    return true;
  });

  const [isAuthReady, setIsAuthReady] = useState(true);
  const [guestCount, setGuestCount] = useState(() => {
    return parseInt(localStorage.getItem("buddybot_guest_msg_count") || localStorage.getItem("guest_msg_count") || "0", 10);
  });
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Validate authentication state on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");

    if (tokenFromUrl) {
      setStoredToken(tokenFromUrl);
      localStorage.removeItem("buddybot_guest_msg_count");
      localStorage.removeItem("guest_msg_count");
      setGuestCount(0);
      setIsAuthenticated(true);
      const userObj = parseJwt(tokenFromUrl);
      if (userObj) {
        setCurrentUser(userObj);
        setStoredUser(userObj);
      }
      window.history.replaceState({}, "", window.location.pathname);
    }

    const token = tokenFromUrl || getStoredToken();

    // If no token, cleanly start as a guest user
    if (!token || token === "undefined" || token === "null" || token.trim() === "") {
      setStoredToken(null);
      setStoredUser(null);
      setIsAuthenticated(false);
      setCurrentUser(null);
      setIsAuthReady(true);
      return;
    }

    const parsed = parseJwt(token);
    if (parsed && parsed.exp && parsed.exp * 1000 < Date.now()) {
      setStoredToken(null);
      setStoredUser(null);
      setIsAuthenticated(false);
      setCurrentUser(null);
      setIsAuthReady(true);
      return;
    }

    // Set local authenticated state immediately
    setIsAuthenticated(true);
    if (parsed && !currentUser) {
      setCurrentUser(parsed);
      setStoredUser(parsed);
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
          if (data.user) {
            setCurrentUser(data.user);
            setStoredUser(data.user);
          }
          localStorage.removeItem("buddybot_guest_msg_count");
          localStorage.removeItem("guest_msg_count");
          setGuestCount(0);

          // Claim guest thread if exists
          const guestThreadId = localStorage.getItem("buddybot_guest_thread_id") || localStorage.getItem("guest_thread_id");
          if (guestThreadId) {
            fetch(`${API_URL}/api/claim-thread`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ threadId: guestThreadId })
            }).catch(e => console.log(e));
            localStorage.removeItem("buddybot_guest_thread_id");
            localStorage.removeItem("guest_thread_id");
          }
        } else if (parsed && parsed.exp && parsed.exp * 1000 < Date.now()) {
          // Token genuinely expired: reset cleanly to guest
          setStoredToken(null);
          setStoredUser(null);
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      })
      .catch((err) => {
        console.warn("Could not reach /api/auth/me, keeping local authenticated session:", err);
      })
      .finally(() => {
        setIsAuthReady(true);
      });
  }, []);

  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [stopGenerationTrigger, setStopGenerationTrigger] = useState(0);

  const [currThreadId, setCurrThreadId] = useState(() => {
    return getActiveThreadId() || uuidv1();
  });

  const [prevChats, setPrevChats] = useState(() => {
    return getActiveChats();
  });

  const [newChat, setNewChat] = useState(() => {
    return getActiveChats().length === 0;
  });

  const [allThreads, setAllThreads] = useState(() => {
    return getCachedThreads();
  });

  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem("buddybot_selected_model") || localStorage.getItem("selected_model");
    if (!saved || saved.includes("llama") || saved.includes("gemma") || saved.includes("mixtral")) {
      return "openai/gpt-oss-120b";
    }
    return saved;
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("buddybot_selected_model", selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    if (currThreadId) {
      setActiveThreadId(currThreadId);
    }
  }, [currThreadId]);

  useEffect(() => {
    if (prevChats && prevChats.length > 0) {
      setActiveChats(prevChats);
    }
  }, [prevChats]);

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
    selectedModel,
    setSelectedModel,
    currentUser,
    setCurrentUser,
    isSidebarOpen,
    setIsSidebarOpen,
    isGenerating,
    setIsGenerating,
    stopGenerationTrigger,
    setStopGenerationTrigger,
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
        <Route path="/api/auth/google/callback" element={<Navigate to="/" replace />} />

        {/* default redirect to chat */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
