import "./Sidebar.css";
import { useContext, useEffect } from "react";
import {MyContext} from "./MyContext.jsx";
import {v1 as uuidv1} from "uuid";
import buddyBotLogo from "./assets/buddy-bot.png";
import { API_URL } from "./apiConfig.js";

function Sidebar() {
  const {
    allThreads, setAllThreads,
    currThreadId,
    setNewChat, setPrompt, setReply,
    setCurrThreadId, setPrevChats,
    isAuthenticated,
    setShowAuthModal,
    isSidebarOpen, setIsSidebarOpen,
  } = useContext(MyContext);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getAllThreads = async () => {
    if (!isAuthenticated) {
      setAllThreads([]);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/thread`, {
        headers: getAuthHeaders(),
      });
      const res = await response.json();
      if (Array.isArray(res)) {
        const filteredData = res.map(thread => ({threadId: thread.threadId, title: thread.title}));
        setAllThreads(filteredData);
      }
    } catch(err) {
      console.log(err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      getAllThreads();
    }
  }, [currThreadId, isAuthenticated]);

  const createNewChat = () => {
    setNewChat(true);
    setPrompt("");
    setReply(null);
    setCurrThreadId(uuidv1());
    setPrevChats([]);
    if (setIsSidebarOpen) setIsSidebarOpen(false);
  };

  const changeThread = async (newThreadId) => {
    setCurrThreadId(newThreadId);
    if (setIsSidebarOpen) setIsSidebarOpen(false);

    try {
      const response = await fetch(`${API_URL}/api/thread/${newThreadId}`, {
        headers: getAuthHeaders(),
      });
      const res = await response.json();
      console.log(res);
      setPrevChats(Array.isArray(res) ? res : []);
      setNewChat(false);
      setReply(null);
    } catch(err) {
      console.log(err);
    }
  };

  const deleteThread = async (threadId) => {
    try {
      const response = await fetch(`${API_URL}/api/thread/${threadId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });      
      const res = await response.json();
      console.log(res);

      //updated threads re-render
      setAllThreads(prev => prev.filter(thread => thread.threadId !== threadId));

      if(threadId === currThreadId) {
          createNewChat();
      }

    } catch(err) {
      console.log(err);
    }
  }

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
