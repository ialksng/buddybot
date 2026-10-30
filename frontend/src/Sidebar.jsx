import "./Sidebar.css";
import { useContext, useEffect } from "react";
import {MyContext} from "./MyContext.jsx";
import {v1 as uuidv1} from "uuid";
import buddyBotLogo from "./assets/buddy-bot.png";

function Sidebar() {
  const {allThreads, setAllThreads, currThreadId, setNewChat, setPrompt, setReply, setCurrThreadId, setPrevChats} = useContext(MyContext);
  const API_URL = import.meta.env.VITE_API_URL || "";

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getAllThreads = async () => {
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
    getAllThreads();
  }, [currThreadId])

  const createNewChat = () => {
    setNewChat(true);
    setPrompt("");
    setReply(null);
    setCurrThreadId(uuidv1());
    setPrevChats([]);
  }

  const changeThread = async (newThreadId) => {
    setCurrThreadId(newThreadId);

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
  }

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
    <section className="sidebar">
      {/* new chat button */}
      <button onClick={createNewChat}>
        <img src={buddyBotLogo} alt="buddy-bot" className="logo"></img>
        <span><i className="fa-solid fa-pen-to-square"></i></span>
      </button>

      {/* history */}
      <ul className="history">
            {
              allThreads?.map((thread, idx) => (
                <li key={idx}
                    onClick={() => changeThread(thread.threadId)}
                            className={thread.threadId === currThreadId ? "highlighted": " "}
                >
                  {thread.title}
                  <i className="fa-solid fa-trash"
                    onClick={(e) => {
                      e.stopPropagation(); // stop event bubbling
                      deleteThread(thread.threadId);
                    }}
                  ></i>
                </li>
              ))
            }
      </ul>

      {/* signup */}
      <div className="sign">
        <p>By <a href="https://linktr.ee/ialksng">ialksng</a><span> &hearts;</span></p>
      </div>
    </section>
  );
}

export default Sidebar;
