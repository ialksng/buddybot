import "dotenv/config";

// Curated list of high-quality models available on Groq
export const GROQ_MODELS = [
    {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B Instant",
        description: "Ultra-fast, lowest latency, 128k context",
        badge: "Fastest",
        isDefault: true,
    },
    {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B Versatile",
        description: "Meta's flagship model for reasoning & complex tasks",
        badge: "Smartest",
    },
    {
        id: "mixtral-8x7b-32768",
        name: "Mixtral 8x7B",
        description: "MoE architecture with 32k context window",
        badge: "Balanced",
    },
    {
        id: "gemma2-9b-it",
        name: "Gemma 2 9B",
        description: "Google's high-efficiency open model",
        badge: "Google",
    },
    {
        id: "llama3-70b-8192",
        name: "Llama 3 70B",
        description: "Meta's popular 70B parameter model",
        badge: "Popular",
    },
    {
        id: "llama3-8b-8192",
        name: "Llama 3 8B",
        description: "Standard Meta Llama 3 8B model",
        badge: "Lightweight",
    }
];

const DEFAULT_MODEL = "llama-3.1-8b-instant";

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
        // gracefully fall back to the universally available DEFAULT_MODEL.
        if (!ok || data.error) {
            console.warn(`Groq API issue with model "${selectedModel}":`, data.error?.message || data);

            if (selectedModel !== DEFAULT_MODEL) {
                console.log(`Falling back to default model: "${DEFAULT_MODEL}"`);
                const fallback = await requestGroq(DEFAULT_MODEL);
                if (fallback.ok && !fallback.data.error) {
                    return fallback.data.choices?.[0]?.message?.content || "No reply generated.";
                }
                data = fallback.data;
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
