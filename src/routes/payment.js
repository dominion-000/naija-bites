const express = require("express");
const { verifyTransaction } = require("../integrations/paystack");
const { sessions } = require("../domain/sessionStore");
const { completeOrder } = require("../services/orderService");
const logger = require("../utils/logger");

const router = express.Router();

// GET /api/payment/callback
router.get("/callback", async (req, res) => {
  const { reference } = req.query;
  if (!reference) return res.redirect("/?payment=error");

  try {
    const result = await verifyTransaction(reference);
    const success = result.data.status === "success";
    completeOrder(sessions, reference, success);
    res.redirect(`/?payment=${success ? "success" : "failed"}`);
  } catch (err) {
    logger.error("Payment verification failed", {
      error: err.response?.data || err.message,
    });
    res.redirect("/?payment=error");
  }
});

module.exports = router;
