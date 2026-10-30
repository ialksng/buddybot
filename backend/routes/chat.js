import express from "express";
import Thread from "../models/Thread.js";
import getGroqAPIResponse from "../utils/groq.js";

const router = express.Router();

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
        if (!req.user) {
            return res.json([]);
        }
        const threads = await Thread.find({
            $or: [{ userId: req.user.id }, { userId: { $exists: false } }]
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
    const {threadId, message} = req.body;

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
        const assistantReply = await getGroqAPIResponse(thread.messages);
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