import express from "express";
import Thread from "../models/Thread.js";
import getGroqAPIResponse, { GROQ_MODELS } from "../utils/groq.js";

const router = express.Router();

// List available AI models
router.get(["/models", "/chat/models"], (req, res) => {
    res.json(GROQ_MODELS);
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
        const userIdStr = String(req.user.id);
        const queryOr = [{ userId: userIdStr }];
        if (mongoose.Types.ObjectId.isValid(userIdStr)) {
            queryOr.push({ userId: new mongoose.Types.ObjectId(userIdStr) });
        }

        const threads = await Thread.find({ $or: queryOr }).sort({ updatedAt: -1 });
        res.json(threads);
    } catch(err) {
        console.error("Failed to fetch threads:", err);
        res.status(500).json({ error: "Failed to fetch threads" });
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
        const uid = req.user?.id
            ? (mongoose.Types.ObjectId.isValid(req.user.id) ? new mongoose.Types.ObjectId(req.user.id) : req.user.id)
            : null;

        let thread = await Thread.findOne({threadId});
        if(!thread) {
            // create a new thread in DB
            thread = new Thread({
                threadId,
                title: message.substring(0, 50),
                userId: uid,
                messages: [{role: "user", content: message}]
            })
        } else {
            if (uid && !thread.userId) {
                thread.userId = uid;
            }
            thread.messages.push({role: "user", content: message});
        }
        const assistantReply = await getGroqAPIResponse(thread.messages, model);
        thread.messages.push({role: "assistant", content: assistantReply});
        thread.updatedAt = new Date();

        await thread.save();
        res.json({reply: assistantReply});

    } catch (err) {
        console.error("Chat error:", err);
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
        const uid = mongoose.Types.ObjectId.isValid(req.user.id)
            ? new mongoose.Types.ObjectId(req.user.id)
            : req.user.id;

        const thread = await Thread.findOneAndUpdate(
            { threadId },
            { $set: { userId: uid } },
            { new: true }
        );
        res.json({ success: true, thread });
    } catch (err) {
        console.error("Failed to claim thread:", err);
        res.status(500).json({ error: "Failed to claim thread" });
    }
});

export default router;