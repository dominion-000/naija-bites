// chatService.js

const { processInput } = require("../domain/chatEngine");
const { initializeTransaction } = require("../integrations/paystack");
const logger = require("../utils/logger");

async function handleChatMessage(session, input, baseUrl) {
  const result = processInput(session, input);

  if (result.action !== "INITIATE_PAYMENT") {
    return { message: result.message };
  }

  const order = session.currentOrder;
  const reference = `order_${order.id}`;
  order.reference = reference;

  try {
    const payment = await initializeTransaction({
      email: "guest@naijabites.test",
      amountKobo: order.total * 100,
      reference,
      callback_url: `${baseUrl}/api/payment/callback`,
    });
    logger.info("Payment initialized", { reference, total: order.total });
    return {
      message: result.message,
      payment_url: payment.data.authorization_url,
    };
  } catch (err) {
    logger.error("Payment initialization failed", {
      error: err.response?.data || err.message,
    });
    return {
      message: "Could not start payment right now. Please try again shortly.",
      error: true,
    };
  }
}

module.exports = { handleChatMessage };
