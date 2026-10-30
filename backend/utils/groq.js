import "dotenv/config";

const getGroqAPIResponse = async (input) => {
    // Support either an array of messages or a single string prompt
    const messages = Array.isArray(input)
        ? input.map(m => ({ role: m.role, content: m.content }))
        : [{ role: "user", content: String(input) }];

    const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.7,
            max_completion_tokens: 1024,
        })
    };

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", options);
        const data = await response.json();

        if (data.error) {
            console.error("Groq API error:", data.error);
            return data.error.message || "Failed to generate reply from Groq.";
        }

        return data.choices?.[0]?.message?.content || "No reply generated.";
    } catch (err) {
        console.error("Failed to connect to Groq API:", err);
        throw err;
    }
};

export default getGroqAPIResponse;

