import "dotenv/config";

// Curated list of high-quality models available on Groq
export const GROQ_MODELS = [
    {
        id: "openai/gpt-oss-120b",
        name: "GPT OSS 120B",
        description: "OpenAI 120B flagship model on Groq LPU (Smartest)",
        badge: "Smartest",
        isDefault: true,
    },
    {
        id: "openai/gpt-oss-20b",
        name: "GPT OSS 20B",
        description: "High speed, ultra low latency 20B model",
        badge: "Fastest",
    },
    {
        id: "qwen/qwen3.8-27b",
        name: "Qwen 3.8 27B",
        description: "Deep general reasoning & multilingual coding",
        badge: "Balanced",
    },
    {
        id: "allam-2-7b",
        name: "Allam 2 7B",
        description: "Compact 7B lightweight instruction model",
        badge: "Compact",
    },
    {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B",
        description: "Meta flagship 70B parameter model",
        badge: "Meta",
    },
    {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B Instant",
        description: "Meta lightweight instant model",
        badge: "Meta",
    }
];

const DEFAULT_MODEL = "openai/gpt-oss-120b";
const FALLBACK_MODELS = [
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "allam-2-7b"
];

const getGroqAPIResponse = async (input, requestedModel) => {
    // Support either an array of messages or a single string prompt
    const messages = Array.isArray(input)
        ? input.map(m => ({ role: m.role, content: m.content }))
        : [{ role: "user", content: String(input) }];

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not configured in the environment.");
    }

    const selectedModel = requestedModel || process.env.GROQ_MODEL || DEFAULT_MODEL;

    const requestGroq = async (modelToUse) => {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: messages,
                temperature: 0.7,
                max_completion_tokens: 2048,
            })
        });

        const data = await response.json();
        return { ok: response.ok, status: response.status, data };
    };

    try {
        let { ok, data } = await requestGroq(selectedModel);

        // If the requested model returns an error (e.g. not found, no access),
        // gracefully fall back to active models supported on the key.
        if (!ok || data.error) {
            console.warn(`Groq API issue with model "${selectedModel}":`, data.error?.message || data);

            for (const fallbackModel of FALLBACK_MODELS) {
                if (fallbackModel === selectedModel) continue;
                console.log(`Trying fallback model: "${fallbackModel}"`);
                const fallback = await requestGroq(fallbackModel);
                if (fallback.ok && !fallback.data.error) {
                    return fallback.data.choices?.[0]?.message?.content || "No reply generated.";
                }
            }

            return data.error?.message || "Failed to generate reply from Groq.";
        }

        return data.choices?.[0]?.message?.content || "No reply generated.";
    } catch (err) {
        console.error("Failed to connect to Groq API:", err);
        throw err;
    }
};

export default getGroqAPIResponse;
