const app = require("./app");
const logger = require("./utils/logger");
const { attachWebSocketServer } = require("./services/websocketServer");

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`Naija Bites ChatBot running on http://localhost:${PORT}`);
});

attachWebSocketServer(
  server,
  process.env.BASE_URL || `http://localhost:${PORT}`,
);
