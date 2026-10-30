import "./Chat.css";
import { useContext, useState, useEffect, useRef } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/tokyo-night-dark.css";
import "katex/dist/katex.min.css";
import buddyBotLogo from "./assets/buddy-bot.png";

function extractText(node) {
    if (!node) return "";
    if (typeof node === "string") return node;
    if (typeof node === "number") return String(node);
    if (Array.isArray(node)) return node.map(extractText).join("");
    if (node.props && node.props.children) return extractText(node.props.children);
    return "";
}

export function formatMathFormulas(content) {
    if (!content || typeof content !== "string") return "";
    let text = content;

    // 1. Standard LaTeX display math: \[ ... \] -> $$ ... $$
    text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`);

    // 2. Standard LaTeX inline math: \( ... \) -> $ ... $
    text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`);

    // 3. Standalone bracketed block math: [ \boxed{...} ] or [ F = G \frac{...} ]
    // that is NOT a markdown link [text](url) or footnote [^1]
    text = text.replace(/(^|\n)\s*\[\s*(\\boxed[\s\S]*?|\\frac[\s\S]*?|\\[a-zA-Z]{2,}[\s\S]*?|[A-Z]\s*=[\s\S]*?\\(?:frac|times|sum|int)[\s\S]*?)\s*\](?!\s*[\(:])/g,
        (match, prefix, math) => `${prefix}\n$$\n${math.trim()}\n$$\n`
    );

    // 4. Standalone lines that are clearly formulas: e.g. "F = G \frac{...}{...}" on its own line
    text = text.replace(/(^|\n)\s*([A-Za-z]\s*=\s*(?:[A-Za-z0-9\s\+\-\*\/\(\)\,\.]*\\(?:frac|times|sqrt|sum|int|boxed)[\s\S]*?))\s*(?=\n|$)/g,
        (match, prefix, math) => {
            if (math.includes("$")) return match; // already delimited
            return `${prefix}\n$$\n${math.trim()}\n$$\n`;
        }
    );

    // 5. Clean up any accidental double-dollar collisions:
    text = text.replace(/\$\$\s*\$\$/g, "$$");

    return text;
}

function CodeBlock({ language, rawCode, children }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const textToCopy = rawCode || extractText(children);
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div
            className="code-block-container"
            spellCheck="false"
            data-gramm="false"
            data-enable-grammarly="false"
        >
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
            <pre
                className="code-block-pre"
                spellCheck="false"
                data-gramm="false"
                data-enable-grammarly="false"
            >
                <code
                    className={`hljs ${language ? `language-${language}` : ""}`}
                    spellCheck="false"
                    data-gramm="false"
                    data-enable-grammarly="false"
                >
                    {children}
                </code>
            </pre>
        </div>
    );
}

function Chat() {
    const { newChat, prevChats, reply, stopGenerationTrigger, setIsGenerating } = useContext(MyContext);
    const [latestReply, setLatestReply] = useState(null);
    const typingIntervalRef = useRef(null);
    const chatEndRef = useRef(null);

    // Auto-scroll to bottom on new chats or typing updates
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [prevChats, latestReply]);

    // Handle user clicking stop during typing animation
    useEffect(() => {
        if (stopGenerationTrigger && typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
            typingIntervalRef.current = null;
            setLatestReply(null); // Finish/freeze typing, show current content
            if (setIsGenerating) setIsGenerating(false);
        }
    }, [stopGenerationTrigger, setIsGenerating]);

    useEffect(() => {
        if (!reply) {
            setLatestReply(null);
            if (setIsGenerating) setIsGenerating(false);
            return;
        }

        if (!prevChats?.length) return;

        if (typingIntervalRef.current) {
            clearInterval(typingIntervalRef.current);
        }

        if (setIsGenerating) setIsGenerating(true);
        const words = reply.split(" ");
        let idx = 0;
        typingIntervalRef.current = setInterval(() => {
            setLatestReply(words.slice(0, idx + 1).join(" "));
            idx++;
            if (idx >= words.length) {
                clearInterval(typingIntervalRef.current);
                typingIntervalRef.current = null;
                setLatestReply(null); // Finish typing, revert to static content
                if (setIsGenerating) setIsGenerating(false);
            }
        }, 25);

        return () => {
            if (typingIntervalRef.current) {
                clearInterval(typingIntervalRef.current);
            }
        };
    }, [reply, setIsGenerating]);

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
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }], rehypeHighlight]}
                                            components={{
                                                pre({ children }) {
                                                    return <>{children}</>;
                                                },
                                                code({ node, inline, className, children, ...props }) {
                                                    const match = /language-(\w+)/.exec(className || "");
                                                    const textContent = extractText(children);
                                                    const isMultiline = String(textContent).includes("\n");
                                                    if (!inline && (match || className || isMultiline)) {
                                                        return (
                                                            <CodeBlock
                                                                language={match ? match[1] : ""}
                                                                rawCode={textContent}
                                                                {...props}
                                                            >
                                                                {children}
                                                            </CodeBlock>
                                                        );
                                                    }
                                                    return (
                                                        <code className="inline-code" {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                }
                                            }}
                                        >
                                            {formatMathFormulas(displayContent)}
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
