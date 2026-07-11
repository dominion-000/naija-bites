// paystack.js
//
// Simple paystack payment logic

const axios = require("axios");

const PAYSTACK_BASE = "https://api.paystack.co";

function authHeader() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not set. Add it to your .env file.",
    );
  }
  return { Authorization: `Bearer ${key}` };
}

async function initializeTransaction({
  email,
  amountKobo,
  reference,
  callback_url,
}) {
  const res = await axios.post(
    `${PAYSTACK_BASE}/transaction/initialize`,
    { email, amount: amountKobo, reference, callback_url },
    { headers: authHeader() },
  );
  return res.data;
}

async function verifyTransaction(reference) {
  const res = await axios.get(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: authHeader(),
    },
  );
  return res.data;
}

module.exports = { initializeTransaction, verifyTransaction };
