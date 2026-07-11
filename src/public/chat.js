const log = document.getElementById("chat-log");
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");

function addMessage(text, role) {
  const el = document.createElement("div");
  el.className = `msg ${role}`;
  el.textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

function addPaymentLink(url) {
  const el = document.createElement("div");
  el.className = "msg bot";
  const link = document.createElement("a");
  link.className = "pay-link";
  link.href = url;
  link.textContent = "Pay now with Paystack →";
  el.appendChild(link);
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

function checkPaymentBanner() {
  const params = new URLSearchParams(window.location.search);
  const paymentStatus = params.get("payment");
  if (paymentStatus === "success") {
    addMessage("✅ Payment successful — your order is confirmed!", "system");
  } else if (paymentStatus === "failed") {
    addMessage("⚠️ Payment failed. You can try checking out again.", "system");
  } else if (paymentStatus === "error") {
    addMessage("⚠️ Something went wrong verifying your payment.", "system");
  }
  if (paymentStatus) {
    window.history.replaceState({}, "", window.location.pathname);
  }
}

// WebSocket transport

const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${wsProtocol}://${window.location.host}/ws`);

socket.addEventListener("message", (event) => {
  const data = JSON.parse(event.data);
  addMessage(data.message, data.type === "error" ? "system" : "bot");
  if (data.payment_url) {
    addPaymentLink(data.payment_url);
  }
});

socket.addEventListener("close", () => {
  addMessage("Connection lost — refresh the page to reconnect.", "system");
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) return;

  addMessage(value, "user");
  input.value = "";

  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ input: value }));
  } else {
    addMessage("Not connected yet — please try again in a moment.", "system");
  }
});

checkPaymentBanner();
