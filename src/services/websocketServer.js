// websocketServer.js
// Real-time transport for the chat.

const { WebSocketServer } = require("ws");
const logger = require("../utils/logger");
const {
  getOrCreateSessionById,
  SESSION_COOKIE,
} = require("../domain/sessionStore");
const { handleChatMessage } = require("./chatService");

function parseCookieHeader(header) {
  const out = {};
  (header || "").split(";").forEach((pair) => {
    const idx = pair.indexOf("=");
    if (idx === -1) return;
    const key = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  });
  return out;
}

function attachWebSocketServer(httpServer, baseUrl) {
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const cookies = parseCookieHeader(req.headers.cookie);
    const { sid, session } = getOrCreateSessionById(cookies[SESSION_COOKIE]);
    logger.info("WebSocket connected", { sid });

    ws.on("message", async (raw) => {
      let payload;
      try {
        payload = JSON.parse(raw.toString());
      } catch {
        ws.send(
          JSON.stringify({ type: "error", message: "Malformed message." }),
        );
        return;
      }

      if (typeof payload.input !== "string" || !payload.input.trim()) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Please send a valid option.",
          }),
        );
        return;
      }

      const result = await handleChatMessage(session, payload.input, baseUrl);
      ws.send(
        JSON.stringify({ type: result.error ? "error" : "bot", ...result }),
      );
    });

    ws.on("close", () => logger.info("WebSocket disconnected", { sid }));
  });

  return wss;
}

module.exports = { attachWebSocketServer };
