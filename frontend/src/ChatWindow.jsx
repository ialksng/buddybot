import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import AuthModal from "./AuthModal.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState, useEffect, useRef } from "react";
import { ScaleLoader } from "react-spinners";
import { API_URL } from "./apiConfig.js";
import { DEFAULT_MODELS } from "./models.js";
import {
    getStoredToken,
    setStoredToken,
    setStoredUser,
    clearAllBuddyBotStorage,
    setCachedThreads,
    setActiveChats,
    setActiveThreadId,
} from "./storage.js";

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
        currentUser, setCurrentUser,
        isSidebarOpen, setIsSidebarOpen,
        isGenerating, setIsGenerating,
        setStopGenerationTrigger,
    } = useContext(MyContext);

    const [loading, setLoading] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [modelMenuOpen, setModelMenuOpen] = useState(false);
    const [models, setModels] = useState(DEFAULT_MODELS);

    const modelMenuRef = useRef(null);
    const profileMenuRef = useRef(null);
    const abortControllerRef = useRef(null);

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
        clearAllBuddyBotStorage();
        setIsAuthenticated(false);
        setCurrentUser(null);
        setGuestCount(0);
        setAllThreads([]);
        setPrevChats([]);
        setNewChat(true);
        setPrompt("");
        setReply(null);
        setIsProfileOpen(false);
    };

    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setLoading(false);
        setIsGenerating(false);
        setStopGenerationTrigger(Date.now());
    };

    const getReply = async () => {
        const userPrompt = prompt.trim();
        if (!userPrompt || loading || isGenerating) return;

        // If guest already used their free message, prompt signup
        if (!isAuthenticated && guestCount >= 1) {
            setShowAuthModal(true);
            return;
        }

        // Add user prompt to chat UI immediately and clear input
        const updatedUserChats = [...prevChats, { role: "user", content: userPrompt }];
        setPrevChats(updatedUserChats);
        setActiveChats(updatedUserChats);
        setActiveThreadId(currThreadId);
        setPrompt("");
        setLoading(true);
        setIsGenerating(true);
        setNewChat(false);

        // Immediately update sidebar threads with this new/updated chat title
        const chatTitle = userPrompt.substring(0, 50);
        setAllThreads(prev => {
            const filtered = prev.filter(t => t.threadId !== currThreadId);
            const updated = [{ threadId: currThreadId, title: chatTitle }, ...filtered];
            setCachedThreads(updated);
            return updated;
        });

        abortControllerRef.current = new AbortController();
        const token = getStoredToken();
        const options = {
            method: "POST",
            signal: abortControllerRef.current.signal,
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

            const finalChats = [...updatedUserChats, { role: "assistant", content: assistantReply }];
            setPrevChats(finalChats);
            setActiveChats(finalChats);
            setReply(assistantReply);

            // If user is authenticated, refresh sidebar thread list so new chat appears immediately
            if (token) {
                fetch(`${API_URL}/api/thread`, {
                    headers: { "Authorization": `Bearer ${token}` }
                })
                .then(r => r.json())
                .then(threads => {
                    if (Array.isArray(threads) && threads.length > 0) {
                        const filtered = threads.map(t => ({ threadId: t.threadId, title: t.title }));
                        setAllThreads(filtered);
                        setCachedThreads(filtered);
                    }
                })
                .catch(() => {});
            }

            // If guest user just used their free message
            if (!isAuthenticated && guestCount === 0) {
                const nextCount = 1;
                setGuestCount(nextCount);
                localStorage.setItem("buddybot_guest_msg_count", "1");
                localStorage.setItem("buddybot_guest_thread_id", currThreadId);

                // Prompt sign up after user reads the reply
                setTimeout(() => {
                    setShowAuthModal(true);
                }, 1500);
            }
        } catch (err) {
            if (err.name === "AbortError") {
                console.log("Chat response aborted by user.");
                return;
            }
            console.error("Chat error:", err);
            setPrevChats(prev => [
                ...prev,
                { role: "assistant", content: "⚠️ Could not connect to server. Please try again." }
            ]);
            setIsGenerating(false);
        } finally {
            setLoading(false);
            abortControllerRef.current = null;
        }
    };

    return (
        <div className="chatWindow">
            <div className="navbar">
                <div className="nav-left-group">
                    {/* Mobile Hamburger Toggle */}
                    <button
                        type="button"
                        className="mobile-hamburger-btn"
                        onClick={() => setIsSidebarOpen && setIsSidebarOpen(!isSidebarOpen)}
                        aria-label="Toggle history menu"
                    >
                        <i className="fa-solid fa-bars"></i>
                    </button>

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
                </div>

                {/* User Auth actions or Profile Icon */}
                {isAuthenticated ? (
                    <div className="userIconDiv" ref={profileMenuRef}>
                        <div
                            className="userProfilePill"
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            title="Profile & Settings"
                        >
                            <span className="userAvatarCircle">
                                {(currentUser?.username?.[0] || currentUser?.email?.[0] || "U").toUpperCase()}
                            </span>
                            <span className="userProfileName">
                                {currentUser?.username || currentUser?.email?.split("@")[0] || "Account"}
                            </span>
                            <i className={`fa-solid fa-chevron-down profileChevron ${isProfileOpen ? "open" : ""}`}></i>
                        </div>
                        {isProfileOpen && (
                            <div className="dropDown userProfileDropdown">
                                <div className="userProfileHeader">
                                    <div className="userProfileEmail" title={currentUser?.email}>
                                        {currentUser?.email || "Signed In"}
                                    </div>
                                    <span className="userProfileTag">Free Plan</span>
                                </div>
                                <div className="dropDownDivider"></div>
                                <div
                                    className="dropDownItem"
                                    onClick={() => {
                                        setNewChat(true);
                                        setPrompt("");
                                        setIsProfileOpen(false);
                                    }}
                                >
                                    <i className="fa-solid fa-plus"></i> New chat
                                </div>
                                <div
                                    className="dropDownItem logoutItem"
                                    onClick={handleLogout}
                                >
                                    <i className="fa-solid fa-arrow-right-from-bracket"></i> Log out
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="nav-auth-actions">
                        <button
                            type="button"
                            className="nav-auth-btn login-only"
                            onClick={() => setShowAuthModal(true)}
                        >
                            Log in
                        </button>
                    </div>
                )}
            </div>

            <Chat />

            {(loading || isGenerating) && (
                <div className="loader-container">
                    <ScaleLoader color="#ef7722" height={18} width={3} radius={2} margin={2} />
                    <span className="loader-text">
                        {loading ? "Generating response..." : "Typing response..."}
                    </span>
                    <button
                        type="button"
                        className="loader-stop-btn"
                        onClick={handleStop}
                        title="Stop generating response"
                    >
                        <i className="fa-solid fa-square"></i>
                        <span>Stop</span>
                    </button>
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
                        placeholder={
                            isGuestLimitReached
                                ? "Sign up or log in to continue chatting..."
                                : (loading || isGenerating ? "AI is generating response..." : "Ask anything")
                        }
                        value={prompt}
                        disabled={loading || isGenerating}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                if (isGuestLimitReached) {
                                    setShowAuthModal(true);
                                } else if (!loading && !isGenerating) {
                                    getReply();
                                }
                            }
                        }}
                        onClick={() => {
                            if (isGuestLimitReached) setShowAuthModal(true);
                        }}
                    />
                    {loading || isGenerating ? (
                        <div
                            id="submit"
                            className="stop-btn-active"
                            onClick={handleStop}
                            title="Stop response"
                        >
                            <i className="fa-solid fa-square"></i>
                        </div>
                    ) : (
                        <div
                            id="submit"
                            onClick={() => isGuestLimitReached ? setShowAuthModal(true) : getReply()}
                            title={isGuestLimitReached ? "Sign up to send" : "Send message"}
                        >
                            <i className={isGuestLimitReached ? "fa-solid fa-lock" : "fa-solid fa-paper-plane"}></i>
                        </div>
                    )}
                </div>
                <p className="info">
                    BuddyBOT can make mistakes. Check important info.
                </p>
            </div>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
                onAuthSuccess={(token, user) => {
                    setIsAuthenticated(true);
                    setStoredToken(token);
                    if (user) {
                        setCurrentUser(user);
                        setStoredUser(user);
                    }
                    setGuestCount(0);
                    setShowAuthModal(false);
                }}
            />
        </div>
    );
}

export default ChatWindow;
