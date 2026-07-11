const crypto = require("crypto");

process.env.PAYSTACK_SECRET_KEY = "sk_test_dummy_for_tests";

const request = require("supertest");
const app = require("../src/app");
const { sessions } = require("../src/domain/sessionStore");

function sign(payload) {
  const raw = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(raw)
    .digest("hex");
  return { raw, signature };
}

describe("POST /api/payment/webhook", () => {
  afterEach(() => sessions.clear());

  test("rejects a request with an invalid signature", async () => {
    const { raw } = sign({
      event: "charge.success",
      data: { reference: "order_x" },
    });

    const res = await request(app)
      .post("/api/payment/webhook")
      .set("Content-Type", "application/json")
      .set("x-paystack-signature", "0".repeat(128)) // right length, wrong value
      .send(raw);

    expect(res.status).toBe(401);
  });

  test("rejects a request with no signature header at all", async () => {
    const { raw } = sign({
      event: "charge.success",
      data: { reference: "order_x" },
    });

    const res = await request(app)
      .post("/api/payment/webhook")
      .set("Content-Type", "application/json")
      .send(raw);

    expect(res.status).toBe(401);
  });

  test("accepts a correctly signed charge.success and marks the matching order paid", async () => {
    const sid = "test-sid-1";
    sessions.set(sid, {
      state: "AWAITING_PAYMENT",
      cart: [],
      pendingItem: null,
      currentOrder: {
        id: "1",
        reference: "order_test123",
        total: 2500,
        items: [],
        status: "pending_payment",
      },
      orderHistory: [],
    });

    const { raw, signature } = sign({
      event: "charge.success",
      data: { reference: "order_test123" },
    });

    const res = await request(app)
      .post("/api/payment/webhook")
      .set("Content-Type", "application/json")
      .set("x-paystack-signature", signature)
      .send(raw);

    expect(res.status).toBe(200);
    const session = sessions.get(sid);
    expect(session.currentOrder).toBeNull();
    expect(session.orderHistory[0].status).toBe("paid");
  });

  test("a correctly signed charge.failed marks the order failed, not paid", async () => {
    const sid = "test-sid-2";
    sessions.set(sid, {
      state: "AWAITING_PAYMENT",
      cart: [],
      pendingItem: null,
      currentOrder: {
        id: "2",
        reference: "order_test456",
        total: 1200,
        items: [],
        status: "pending_payment",
      },
      orderHistory: [],
    });

    const { raw, signature } = sign({
      event: "charge.failed",
      data: { reference: "order_test456" },
    });

    await request(app)
      .post("/api/payment/webhook")
      .set("Content-Type", "application/json")
      .set("x-paystack-signature", signature)
      .send(raw);

    const session = sessions.get(sid);
    expect(session.currentOrder).toBeNull();
    expect(session.orderHistory).toHaveLength(0);
  });
});
