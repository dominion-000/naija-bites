// routes/webhook.js
//
// Paystack signs the raw request bytes with the secret key and sends the signature in the header.
// Verify against the raw buffer and not the JSON body because parsing and reserializing cam
// change whitespace/key order and break the signature.

const crypto = require("crypto");
const logger = require("../utils/logger");
const { sessions } = require("../domain/sessionStore");
const { completeOrder } = require("../services/orderService");

function isValidSignature(rawBody, signature) {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const expected = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");
  // timingSafeEqual needs equal-length buffers, so length-check first.
  const expectedBuf = Buffer.from(expected, "hex");
  const signatureBuf = Buffer.from(signature, "hex");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

module.exports = function paystackWebhook(req, res) {
  const signature = req.headers["x-paystack-signature"];
  const rawBody = req.body; // Buffer — express.raw() left it unparsed

  if (!isValidSignature(rawBody, signature)) {
    logger.warn("Rejected webhook: invalid or missing signature");
    return res.sendStatus(401);
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString("utf8"));
  } catch (err) {
    logger.error("Webhook payload was not valid JSON", { error: err.message });
    return res.sendStatus(400);
  }

  logger.info("Received Paystack webhook", { event: event.event });

  if (event.event === "charge.success") {
    completeOrder(sessions, event.data.reference, true);
  } else if (event.event === "charge.failed") {
    completeOrder(sessions, event.data.reference, false);
  }

  // Respond fast with 200 regardless — Paystack retries on non-2xx, and
  // we don't want a slow downstream issue to trigger a retry storm.
  res.sendStatus(200);
};
