// orderService.js

const logger = require("../utils/logger");

function completeOrder(sessions, reference, success) {
  for (const session of sessions.values()) {
    if (!session.currentOrder || session.currentOrder.reference !== reference) {
      continue;
    }

    const order = session.currentOrder;
    if (success) {
      order.status = "paid";
      session.orderHistory.push(order);
      logger.info("Order marked paid", { reference });
    } else {
      order.status = "failed";
      logger.warn("Order marked failed", { reference });
    }
    session.currentOrder = null;
    session.state = "MAIN_MENU";
    return success ? "completed" : "failed";
  }

  logger.warn("No pending order matched payment reference", { reference });
  return "not_found";
}

module.exports = { completeOrder };
