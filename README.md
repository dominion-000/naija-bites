# Naija Bites — Restaurant ChatBot

Number-select chat interface for placing restaurant orders, real-time over
WebSocket, with Paystack test-mode payment confirmed via webhook.

## Structure

```
src/
  app.js                        Express app config
  server.js                     Entry point (listen + WebSocket attach)
  domain/sessionStore.js        Cookie-based device sessions (in-memory)
  domain/menu.js                Menu data
  domain/chatEngine.js          State machine — all chat logic
  services/chatService.js       Shared by REST + WebSocket
  integration/paystack.js       Paystack API wrapper
  services/orderService.js      Idempotent order completion
  services/websocketServer.js   Real-time chat transport
  utils/logger.js               App-event logger
  routes/                       chat.js, payment.js, webhook.js
  views/                        index.ejs
  public/                       style.css, chat.js
tests/                          Jest + Supertest
```

## Run

```bash
npm install
cp .env.example .env   # add Paystack TEST secret key and Base URL>
npm run dev
```

The frontend is served on `http://localhost:3000`.

## Test

24 jest test suite, all passing

```bash
npm test
```
