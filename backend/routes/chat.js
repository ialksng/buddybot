import express from "express";
import Thread from "../models/Thread.js";
import getGroqAPIResponse, { GROQ_MODELS } from "../utils/groq.js";

const router = express.Router();

// List available AI models
router.get(["/models", "/chat/models"], (req, res) => {
    res.json(GROQ_MODELS);
});

router.get("/debug-groq", async (req, res) => {
    const key = process.env.GROQ_API_KEY || "";
    const keyPreview = key ? `${key.substring(0, 6)}...${key.substring(key.length - 4)} (length: ${key.length})` : "NOT_SET";
    try {
        const response = await fetch("https://api.groq.com/openai/v1/models", {
            headers: {
                "Authorization": `Bearer ${key.trim()}`
            }
        });
        const data = await response.json();
        res.json({
            status: response.status,
            ok: response.ok,
            keyPreview,
            models: data.data ? data.data.map(m => m.id) : data
        });
    } catch (e) {
        res.json({ error: e.message, keyPreview });
    }
});

// test
router.post("/test", async(req, res) => {
    try {
    const thread = new Thread({
        threadId: "xyz",
        title: "Testing New Thread"
    });
    const response = await thread.save();
    res.send(response);

    } catch (err) {
        console.log(err);
        res.status(500).json({error: "Failed to save in database"});
    }
});

// Get all threads
router.get(["/thread", "/chat/thread"], async(req, res) => {
    try {
        if (!req.user?.id) {
            return res.json([]);
        }
        const threads = await Thread.find({
            $or: [
                { userId: req.user.id },
                { userId: String(req.user.id) }
            ]
        }).sort({updatedAt: -1});
        res.json(threads);
    } catch(err) {
        console.log(err);
        res.status(500).json({error: "Failed to fetch threads"});
    }
});

// Get a particular thread
router.get(["/thread/:threadId", "/chat/thread/:threadId"], async(req, res) => {
    const {threadId} = req.params;
    try {
        const thread = await Thread.findOne({threadId});

        if(!thread) {
            return res.status(404).json({error: "Thread not found"});
        }

        res.json(thread.messages);
    } catch(err) {
        console.log(err);
        res.status(500).json({error: "Failed to fetch chat"});
    }
});

// Delete a thread 
router.delete(["/thread/:threadId", "/chat/thread/:threadId"], async(req, res) => {
    const {threadId} = req.params; // fetch
    try {
        const deletedThread = await Thread.findOneAndDelete({threadId});

        if(!deletedThread) {
            return res.status(404).json({error: "Thread not found"});
        }

        res.status(200).json({success: "Thread deleted successfully"});
    } catch(err) {
        console.log(err);
        res.status(500).json({error: "Failed to delete chat"});
    }
});

// newChat
router.post(["/chat", "/"], async(req, res) => {
    const {threadId, message, model} = req.body;

    if(!threadId || !message) {
        return res.status(400).json({error: "Missing required fields"});
    }
    try {
        let thread = await Thread.findOne({threadId});
        if(!thread) {
            // create a new thread in DB
            thread = new Thread({
                threadId,
                title: message,
                userId: req.user?.id || null,
                messages: [{role: "user", content: message}]
            })
        } else {
            if (req.user?.id && !thread.userId) {
                thread.userId = req.user.id;
            }
            thread.messages.push({role: "user", content: message});
        }
        const assistantReply = await getGroqAPIResponse(thread.messages, model);
        thread.messages.push({role: "assistant", content: assistantReply});
        thread.updatedAt = new Date();

        await thread.save();
        res.json({reply: assistantReply});

    } catch (err) {
        console.log(err);
        res.status(500).json({error: "Something went wrong"});
    }
});

// Claim a guest thread after logging in or signing up
router.post("/claim-thread", async (req, res) => {
    const { threadId } = req.body;
    if (!threadId || !req.user) {
        return res.status(400).json({ error: "Missing threadId or unauthorized" });
    }
    try {
        const thread = await Thread.findOneAndUpdate(
            { threadId, userId: null },
            { userId: req.user.id },
            { new: true }
        );
        res.json({ success: true, thread });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Failed to claim thread" });
    }
});

export default router;