const { completeOrder } = require("../src/services/orderService");

function makeSessionWithOrder(reference) {
  return {
    state: "AWAITING_PAYMENT",
    cart: [],
    pendingItem: null,
    currentOrder: {
      id: "1",
      reference,
      total: 800,
      items: [],
      status: "pending_payment",
    },
    orderHistory: [],
  };
}

describe("completeOrder (shared by webhook + callback)", () => {
  test("marks a matching order paid and moves it to history", () => {
    const session = makeSessionWithOrder("order_1");
    const sessions = new Map([["sid1", session]]);

    const outcome = completeOrder(sessions, "order_1", true);

    expect(outcome).toBe("completed");
    expect(session.currentOrder).toBeNull();
    expect(session.orderHistory).toHaveLength(1);
    expect(session.orderHistory[0].status).toBe("paid");
    expect(session.state).toBe("MAIN_MENU");
  });

  test("marks a matching order failed without touching history", () => {
    const session = makeSessionWithOrder("order_2");
    const sessions = new Map([["sid2", session]]);

    const outcome = completeOrder(sessions, "order_2", false);

    expect(outcome).toBe("failed");
    expect(session.orderHistory).toHaveLength(0);
    expect(session.currentOrder).toBeNull();
  });

  test("is idempotent: completing an already-completed order is a safe no-op", () => {
    const session = makeSessionWithOrder("order_3");
    // Simulate: webhook already completed this order.
    completeOrder(new Map([["sid3", session]]), "order_3", true);
    expect(session.orderHistory).toHaveLength(1);

    // Callback arrives a moment later for the same reference.
    const secondOutcome = completeOrder(
      new Map([["sid3", session]]),
      "order_3",
      true,
    );

    expect(secondOutcome).toBe("not_found"); // nothing pending left to complete
    expect(session.orderHistory).toHaveLength(1); // NOT double-pushed
  });

  test("returns not_found for an unknown reference", () => {
    const sessions = new Map();
    expect(completeOrder(sessions, "does_not_exist", true)).toBe("not_found");
  });
});
