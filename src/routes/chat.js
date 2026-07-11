const express = require("express");
const { greeting } = require("../domain/chatEngine");
const { handleChatMessage } = require("../services/chatService");

const router = express.Router();

// GET /api/chat/start
router.get("/start", (req, res) => {
  res.json({ message: greeting() });
});

// POST /api/chat/message — REST fallback.
router.post("/message", async (req, res) => {
  const { input } = req.body;

  if (typeof input !== "string" || !input.trim()) {
    return res.status(400).json({ message: "Please send a valid option." });
  }

  const base = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  const result = await handleChatMessage(req.session, input, base);

  if (result.error) {
    return res.status(502).json(result);
  }
  res.json(result);
});

module.exports = router;
