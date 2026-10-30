import "./Sidebar.css";
import { useContext, useEffect } from "react";
import {MyContext} from "./MyContext.jsx";
import {v1 as uuidv1} from "uuid";
import buddyBotLogo from "./assets/buddy-bot.png";
import { API_URL } from "./apiConfig.js";
import {
  getStoredToken,
  setCachedThreads,
  setActiveThreadId,
  setActiveChats,
  clearActiveChats,
} from "./storage.js";

function Sidebar() {
  const {
    allThreads, setAllThreads,
    currThreadId,
    setNewChat, setPrompt, setReply,
    setCurrThreadId, setPrevChats,
    isAuthenticated,
    setShowAuthModal,
    isSidebarOpen, setIsSidebarOpen,
    prevChats,
  } = useContext(MyContext);

  const getAuthHeaders = () => {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getAllThreads = async () => {
    const token = getStoredToken();
    if (!token && !isAuthenticated) {
      setAllThreads([]);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/thread`, {
        headers: getAuthHeaders(),
      });
      const res = await response.json();
      if (Array.isArray(res) && res.length > 0) {
        const filteredData = res.map(thread => ({threadId: thread.threadId, title: thread.title}));
        setAllThreads(filteredData);
        setCachedThreads(filteredData);
      }
    } catch(err) {
      console.log("Failed to fetch threads, keeping cached state:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated || getStoredToken()) {
      getAllThreads();
    }
  }, [isAuthenticated]);

  const createNewChat = () => {
    const newId = uuidv1();
    setNewChat(true);
    setPrompt("");
    setReply(null);
    setCurrThreadId(newId);
    setPrevChats([]);
    setActiveThreadId(newId);
    clearActiveChats();
    if (setIsSidebarOpen) setIsSidebarOpen(false);
  };

  const changeThread = async (newThreadId) => {
    if (newThreadId === currThreadId && prevChats?.length > 0) {
      if (setIsSidebarOpen) setIsSidebarOpen(false);
      return;
    }
    setCurrThreadId(newThreadId);
    setActiveThreadId(newThreadId);
    if (setIsSidebarOpen) setIsSidebarOpen(false);

    try {
      const response = await fetch(`${API_URL}/api/thread/${newThreadId}`, {
        headers: getAuthHeaders(),
      });
      const res = await response.json();
      if (Array.isArray(res)) {
        setPrevChats(res);
        setActiveChats(res);
        setNewChat(res.length === 0);
      }
      setReply(null);
    } catch(err) {
      console.log("Failed to load thread messages:", err);
    }
  };

  const deleteThread = async (threadId) => {
    try {
      const response = await fetch(`${API_URL}/api/thread/${threadId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });      
      await response.json();

      setAllThreads(prev => {
        const updated = prev.filter(thread => thread.threadId !== threadId);
        setCachedThreads(updated);
        return updated;
      });

      if(threadId === currThreadId) {
          createNewChat();
      }
    } catch(err) {
      console.log("Failed to delete thread:", err);
    }
  };

  return (
    <>
      <div
        className={`sidebar-backdrop ${isSidebarOpen ? "visible" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <section className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
        {/* new chat button and mobile close */}
        <div className="sidebar-top-bar">
          <button className="new-chat-btn" onClick={createNewChat}>
            <img src={buddyBotLogo} alt="buddy-bot" className="logo"></img>
            <span><i className="fa-solid fa-pen-to-square"></i></span>
          </button>
          <button
            className="mobile-close-sidebar-btn"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

      {/* history or guest prompt */}
      {isAuthenticated ? (
        <ul className="history">
          {allThreads?.length > 0 ? (
            allThreads.map((thread, idx) => (
              <li
                key={idx}
                onClick={() => changeThread(thread.threadId)}
                className={thread.threadId === currThreadId ? "highlighted" : ""}
                title={thread.title}
              >
                <i className="fa-regular fa-message thread-icon"></i>
                <span className="thread-title">{thread.title}</span>
                <i
                  className="fa-solid fa-trash"
                  title="Delete chat"
                  onClick={(e) => {
                    e.stopPropagation(); // stop event bubbling
                    deleteThread(thread.threadId);
                  }}
                ></i>
              </li>
            ))
          ) : (
            <div className="empty-history-notice">
              <i className="fa-regular fa-comments"></i>
              <span>No chat history yet</span>
            </div>
          )}
        </ul>
      ) : (
        <div className="sidebar-guest-box">
          <p className="sidebar-guest-title">Save your chat history</p>
          <p className="sidebar-guest-desc">Sign up to keep conversations, sync across devices, and pick up where you left off.</p>
          <button className="sidebar-guest-btn" onClick={() => setShowAuthModal(true)}>
            Sign up / Log in
          </button>
        </div>
      )}

      <div className="sign">
        <a
          href="https://ialksng.me"
          target="_blank"
          rel="noopener noreferrer"
          className="ialksng-btn"
        >
          ialksng
        </a>
      </div>
    </section>
  </>
  );
}

export default Sidebar;
