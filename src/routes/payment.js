const express = require("express");
const { verifyTransaction } = require("../integrations/paystack");
const { sessions } = require("../domain/sessionStore");
const { completeOrder } = require("../services/orderService");
const logger = require("../utils/logger");

const router = express.Router();

// GET /api/payment/callback — Paystack redirects the browser here after
// checkout. This is UX only: it verifies once more so the banner can show
// up immediately, but routes/webhook.js is the real source of truth, since
// a customer can close the tab before this redirect ever fires.
// completeOrder() is idempotent, so whichever of webhook/callback lands
// first "wins" and the other is a safe no-op.
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
