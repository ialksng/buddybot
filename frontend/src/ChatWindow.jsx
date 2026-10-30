import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import AuthModal from "./AuthModal.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState, useEffect, useRef } from "react";
import { ScaleLoader } from "react-spinners";
import { API_URL } from "./apiConfig.js";
import { DEFAULT_MODELS } from "./models.js";

function ChatWindow() {
    const {
        prompt, setPrompt,
        reply, setReply,
        currThreadId,
        prevChats, setPrevChats,
        setNewChat,
        setAllThreads,
        isAuthenticated, setIsAuthenticated,
        guestCount, setGuestCount,
        showAuthModal, setShowAuthModal,
        selectedModel, setSelectedModel,
    } = useContext(MyContext);

    const [loading, setLoading] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [modelMenuOpen, setModelMenuOpen] = useState(false);
    const [models, setModels] = useState(DEFAULT_MODELS);

    const modelMenuRef = useRef(null);
    const profileMenuRef = useRef(null);

    const isGuestLimitReached = !isAuthenticated && guestCount >= 1;

    // Fetch models list from backend, fallback to DEFAULT_MODELS
    useEffect(() => {
        fetch(`${API_URL}/api/models`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                    setModels(data);
                }
            })
            .catch(() => {});
    }, []);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modelMenuRef.current && !modelMenuRef.current.contains(e.target)) {
                setModelMenuOpen(false);
            }
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
                setIsProfileOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const activeModelObj = models.find(m => m.id === selectedModel) || models[0] || DEFAULT_MODELS[0];

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
        setIsProfileOpen(false);
    };

    const getReply = async () => {
        const userPrompt = prompt.trim();
        if (!userPrompt || loading) return;

        // If guest already used their free message, prompt signup
        if (!isAuthenticated && guestCount >= 1) {
            setShowAuthModal(true);
            return;
        }

        // Add user prompt to chat UI immediately and clear input
        setPrevChats(prev => [...prev, { role: "user", content: userPrompt }]);
        setPrompt("");
        setLoading(true);
        setNewChat(false);

        const token = localStorage.getItem("token");
        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
                message: userPrompt,
                threadId: currThreadId,
                model: selectedModel,
            })
        };

        try {
            const response = await fetch(`${API_URL}/api/chat`, options);
            const res = await response.json();
            const assistantReply = res.reply || "Something went wrong. Please try again.";

            setPrevChats(prev => [...prev, { role: "assistant", content: assistantReply }]);
            setReply(assistantReply);

            // If guest user just used their free message
            if (!isAuthenticated && guestCount === 0) {
                const nextCount = 1;
                setGuestCount(nextCount);
                localStorage.setItem("guest_msg_count", "1");
                localStorage.setItem("guest_thread_id", currThreadId);

                // Prompt sign up after user reads the reply
                setTimeout(() => {
                    setShowAuthModal(true);
                }, 1500);
            }
        } catch (err) {
            console.error("Chat error:", err);
            setPrevChats(prev => [
                ...prev,
                { role: "assistant", content: "⚠️ Could not connect to server. Please try again." }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chatWindow">
            <div className="navbar">
                {/* Model Selector Dropdown */}
                <div className="model-selector-wrapper" ref={modelMenuRef}>
                    <button
                        type="button"
                        className={`model-selector-btn ${modelMenuOpen ? "active" : ""}`}
                        onClick={() => setModelMenuOpen(!modelMenuOpen)}
                        aria-label="Select AI Model"
                    >
                        <span className="brand-name">BuddyBOT</span>
                        <span className="active-model-pill">
                            <i className="fa-solid fa-bolt"></i>
                            <span>{activeModelObj.name}</span>
                        </span>
                        <i className={`fa-solid fa-chevron-down chevron-icon ${modelMenuOpen ? "open" : ""}`}></i>
                    </button>

                    {modelMenuOpen && (
                        <div className="model-menu-dropdown">
                            <div className="model-menu-header">
                                <span className="header-title">Select Model</span>
                                <span className="header-subtitle">Groq LPU Inference</span>
                            </div>
                            <div className="model-menu-list">
                                {models.map((m) => {
                                    const isSelected = selectedModel === m.id;
                                    return (
                                        <div
                                            key={m.id}
                                            className={`model-option ${isSelected ? "selected" : ""}`}
                                            onClick={() => {
                                                setSelectedModel(m.id);
                                                setModelMenuOpen(false);
                                            }}
                                        >
                                            <div className="model-option-info">
                                                <div className="model-option-title-row">
                                                    <span className="model-option-name">{m.name}</span>
                                                    {m.badge && (
                                                        <span className="model-option-badge">{m.badge}</span>
                                                    )}
                                                </div>
                                                <span className="model-option-desc">{m.description}</span>
                                            </div>
                                            {isSelected && (
                                                <i className="fa-solid fa-check check-icon"></i>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* User Auth actions or Profile Icon */}
                {isAuthenticated ? (
                    <div className="userIconDiv" ref={profileMenuRef}>
                        <span
                            className="userIcon"
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            title="Profile & Settings"
                        >
                            <i className="fa-solid fa-user"></i>
                        </span>
                        {isProfileOpen && (
                            <div className="dropDown">
                                <div className="dropDownItem" style={{ opacity: 0.7, cursor: "default" }}>
                                    <i className="fa-solid fa-shield-halved"></i> Signed in
                                </div>
                                <div className="dropDownItem" onClick={handleLogout} style={{ cursor: "pointer", color: "#fca5a5" }}>
                                    <i className="fa-solid fa-arrow-right-from-bracket"></i> Log out
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="nav-auth-actions">
                        <button className="nav-auth-btn login" onClick={() => setShowAuthModal(true)}>Log in</button>
                        <button className="nav-auth-btn signup" onClick={() => setShowAuthModal(true)}>Sign up</button>
                    </div>
                )}
            </div>

            <Chat />

            {loading && (
                <div className="loader-container">
                    <ScaleLoader color="#ffffff" height={22} width={3} radius={2} margin={2} />
                    <span className="loader-text">Generating response...</span>
                </div>
            )}

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
                    <div
                        id="submit"
                        onClick={() => isGuestLimitReached ? setShowAuthModal(true) : getReply()}
                        title={isGuestLimitReached ? "Sign up to send" : "Send message"}
                    >
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
