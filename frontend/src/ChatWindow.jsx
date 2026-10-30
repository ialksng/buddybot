import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import AuthModal from "./AuthModal.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState, useEffect } from "react";
import { ScaleLoader } from "react-spinners";

function ChatWindow() {
    const {
        prompt, setPrompt,
        reply, setReply,
        currThreadId,
        prevChats, setPrevChats,
        setNewChat,
        isAuthenticated, setIsAuthenticated,
        guestCount, setGuestCount,
        showAuthModal, setShowAuthModal,
    } = useContext(MyContext);

    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const isGuestLimitReached = !isAuthenticated && guestCount >= 1;

    const handleLogout = () => {
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        setGuestCount(0);
        localStorage.removeItem("guest_msg_count");
        localStorage.removeItem("guest_thread_id");
        setAllThreads([]);
        setPrevChats([]);
        setNewChat(true);
        setPrompt("");
        setReply(null);
        setIsOpen(false);
    };

    const getReply = async () => {
        if (!prompt.trim()) return;

        // If guest already used their free message, prompt signup
        if (!isAuthenticated && guestCount >= 1) {
            setShowAuthModal(true);
            return;
        }

        setLoading(true);
        setNewChat(false);
        console.log("message", prompt, "threadId", currThreadId);
        const API_URL = import.meta.env.VITE_API_URL || "";
        const token = localStorage.getItem("token");
        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                message: prompt,
                threadId: currThreadId
            })
        };

        try {
            const response = await fetch(`${API_URL}/api/chat`, options);
            const res = await response.json();
            console.log(res);
            setReply(res.reply || "Something went wrong.");

            // If guest user just used their free message
            if (!isAuthenticated && guestCount === 0) {
                const nextCount = 1;
                setGuestCount(nextCount);
                localStorage.setItem("guest_msg_count", "1");
                localStorage.setItem("guest_thread_id", currThreadId);
                // Prompt sign up after user reads the reply
                setTimeout(() => {
                    setShowAuthModal(true);
                }, 1000);
            }
        } catch(err) {
            console.log(err);
        }
        setLoading(false);
    };

    // Append new chat to prevChats
    useEffect(() => {
        if(prompt && reply) {
            setPrevChats(prevChats => (
                [...prevChats, {
                    role: "user",
                    content: prompt
                },{
                    role: "assistant",
                    content: reply
                }]
            ));
        }

        setPrompt("");
    }, [reply]);

    const handleProfileClick = () => {
        setIsOpen(!isOpen);
    };

    return (
        <div className="chatWindow">
            <div className="navbar">
                <span>BuddyBOT &nbsp; <i className="fa-solid fa-chevron-down"></i></span>
                {isAuthenticated ? (
                    <div className="userIconDiv" onClick={handleProfileClick}>
                        <span className="userIcon"><i className="fa-solid fa-user"></i></span>
                    </div>
                ) : (
                    <div className="nav-auth-actions">
                        <button className="nav-auth-btn login" onClick={() => setShowAuthModal(true)}>Log in</button>
                        <button className="nav-auth-btn signup" onClick={() => setShowAuthModal(true)}>Sign up</button>
                    </div>
                )}
            </div>

            {isOpen && isAuthenticated && (
                <div className="dropDown">
                    <div className="dropDownItem"><i className="fa-solid fa-gear"></i> Settings</div>
                    <div className="dropDownItem" onClick={handleLogout} style={{ cursor: "pointer" }}>
                        <i className="fa-solid fa-arrow-right-from-bracket"></i> Log out
                    </div>
                </div>
            )}

            <Chat />

            <ScaleLoader color="#fff" loading={loading} />

            <div className="chatInput">
                {isGuestLimitReached && (
                    <div className="guest-limit-banner" onClick={() => setShowAuthModal(true)}>
                        <span>🔒 1 free message used. <strong>Sign up</strong> or <strong>Log in</strong> to continue and save history.</span>
                    </div>
                )}
                <div className="inputBox">
                    <input
                        placeholder={isGuestLimitReached ? "Sign up or log in to continue chatting..." : "Ask anything"}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                if (isGuestLimitReached) {
                                    setShowAuthModal(true);
                                } else {
                                    getReply();
                                }
                            }
                        }}
                        onClick={() => {
                            if (isGuestLimitReached) setShowAuthModal(true);
                        }}
                    />
                    <div id="submit" onClick={() => isGuestLimitReached ? setShowAuthModal(true) : getReply()}>
                        <i className={isGuestLimitReached ? "fa-solid fa-lock" : "fa-solid fa-paper-plane"}></i>
                    </div>
                </div>
                <p className="info">
                    BuddyBOT can make mistakes. Check important info.
                </p>
            </div>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onAuthSuccess={() => {
                    setIsAuthenticated(true);
                    setGuestCount(0);
                }}
            />
        </div>
    );
}

export default ChatWindow;