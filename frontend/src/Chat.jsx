import "./Chat.css";
import { useContext, useState, useEffect, useRef } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/tokyo-night-dark.css";
import buddyBotLogo from "./assets/buddy-bot.png";

function CodeBlock({ language, children }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(String(children));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="code-block-container">
            <div className="code-block-header">
                <span className="code-language">{language || "code"}</span>
                <button
                    className="copy-code-btn"
                    onClick={handleCopy}
                    type="button"
                    title="Copy code to clipboard"
                >
                    <i className={`fa-solid ${copied ? "fa-check" : "fa-copy"}`}></i>
                    <span>{copied ? "Copied" : "Copy"}</span>
                </button>
            </div>
            <pre className="code-block-pre">
                <code className={`hljs ${language ? `language-${language}` : ""}`}>
                    {children}
                </code>
            </pre>
        </div>
    );
}

function Chat() {
    const { newChat, prevChats, reply } = useContext(MyContext);
    const [latestReply, setLatestReply] = useState(null);
    const chatEndRef = useRef(null);

    // Auto-scroll to bottom on new chats or typing updates
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [prevChats, latestReply]);

    useEffect(() => {
        if (!reply) {
            setLatestReply(null);
            return;
        }

        if (!prevChats?.length) return;

        const words = reply.split(" ");
        let idx = 0;
        const interval = setInterval(() => {
            setLatestReply(words.slice(0, idx + 1).join(" "));
            idx++;
            if (idx >= words.length) {
                clearInterval(interval);
                setLatestReply(null); // Finish typing, revert to static content
            }
        }, 25);

        return () => clearInterval(interval);
    }, [reply]);

    return (
        <div className="chats-container">
            {newChat && (
                <div className="chat-welcome">
                    <img src={buddyBotLogo} alt="BuddyBOT" className="welcome-logo" />
                    <h1>What can I help you with today?</h1>
                    <p>Ask questions, analyze concepts, write code, or explore ideas.</p>
                </div>
            )}

            <div className="chats">
                {prevChats?.map((chat, idx) => {
                    const isLast = idx === prevChats.length - 1;
                    const isAssistant = chat.role === "assistant";
                    const displayContent = isLast && isAssistant && latestReply !== null
                        ? latestReply
                        : chat.content;

                    return (
                        <div
                            className={chat.role === "user" ? "userDiv" : "buddyDiv"}
                            key={idx}
                        >
                            {chat.role === "user" ? (
                                <div className="userMessageBubble">
                                    <div className="userMessageText">{chat.content}</div>
                                </div>
                            ) : (
                                <div className="assistantMessageBubble">
                                    <div className="assistant-avatar">
                                        <img src={buddyBotLogo} alt="BuddyBOT" />
                                    </div>
                                    <div className="assistant-content markdown-body">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeHighlight]}
                                            components={{
                                                code({ node, inline, className, children, ...props }) {
                                                    const match = /language-(\w+)/.exec(className || "");
                                                    return !inline && match ? (
                                                        <CodeBlock language={match[1]} {...props}>
                                                            {String(children).replace(/\n$/, "")}
                                                        </CodeBlock>
                                                    ) : (
                                                        <code className="inline-code" {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                }
                                            }}
                                        >
                                            {displayContent}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={chatEndRef} />
            </div>
        </div>
    );
}

export default Chat;
