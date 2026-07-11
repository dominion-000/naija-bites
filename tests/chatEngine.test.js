const { processInput, greeting } = require("../src/domain/chatEngine");

function newSession() {
  return {
    state: "MAIN_MENU",
    cart: [],
    pendingItem: null,
    currentOrder: null,
    orderHistory: [],
  };
}

describe("chatEngine state machine", () => {
  test("greeting lists all main menu options", () => {
    const text = greeting();
    expect(text).toMatch(/1 - Place an order/);
    expect(text).toMatch(/99 - Checkout order/);
    expect(text).toMatch(/98 - See order history/);
    expect(text).toMatch(/97 - See current order/);
    expect(text).toMatch(/0 - Cancel order/);
  });

  test("invalid input at the main menu is rejected with a re-prompt", () => {
    const session = newSession();
    const result = processInput(session, "banana");
    expect(result.message).toMatch(/Invalid option/);
    expect(session.state).toBe("MAIN_MENU");
  });

  test("checkout with an empty cart says there is no order", () => {
    const session = newSession();
    const result = processInput(session, "99");
    expect(result.message).toMatch(/No order to place/);
  });

  test("history is empty for a fresh session", () => {
    const session = newSession();
    const result = processInput(session, "98");
    expect(result.message).toMatch(/No past orders yet/);
  });

  test("adding an item with no options goes straight to the cart", () => {
    const session = newSession();
    processInput(session, "1"); // enter browsing
    const result = processInput(session, "3"); // Fried Plantain, no option groups
    expect(result.message).toMatch(/Added Fried Plantain/);
    expect(session.cart).toHaveLength(1);
    expect(session.cart[0].options).toEqual([]);
  });

  test("an item with option groups walks through each group in order", () => {
    const session = newSession();
    processInput(session, "1"); // browsing
    processInput(session, "1"); // Jollof Rice & Chicken (2 option groups)
    expect(session.state).toBe("CHOOSING_OPTION");

    const afterFirstChoice = processInput(session, "2"); // Chicken Part: Thigh
    expect(afterFirstChoice.message).toMatch(/Spice Level/);

    const afterSecondChoice = processInput(session, "1"); // Spice Level: Mild
    expect(afterSecondChoice.message).toMatch(/Added Jollof Rice & Chicken/);
    expect(session.cart[0].options).toEqual([
      "Chicken Part: Thigh",
      "Spice Level: Mild",
    ]);
    expect(session.state).toBe("BROWSING");
  });

  test("an invalid option choice re-prompts without advancing", () => {
    const session = newSession();
    processInput(session, "1");
    processInput(session, "1"); // start Jollof Rice option flow
    const result = processInput(session, "99"); // not a valid choice index
    expect(result.message).toMatch(/Invalid choice/);
    expect(session.pendingItem.optionIndex).toBe(0);
  });

  test("checkout moves the cart into a pending order and clears the cart", () => {
    const session = newSession();
    processInput(session, "1");
    processInput(session, "3"); // Fried Plantain -> cart, ₦800
    const result = processInput(session, "99");
    expect(result.message).toMatch(/Order placed! Total: ₦800/);
    expect(session.cart).toEqual([]);
    expect(session.currentOrder.status).toBe("pending_payment");
    expect(session.state).toBe("AWAITING_PAYMENT");
  });

  test("cancel clears a pending order and returns to the main menu", () => {
    const session = newSession();
    processInput(session, "1");
    processInput(session, "3");
    processInput(session, "99");
    const result = processInput(session, "0");
    expect(result.message).toMatch(/Order cancelled/);
    expect(session.currentOrder).toBeNull();
    expect(session.state).toBe("MAIN_MENU");
  });

  test("cancel with nothing active says so", () => {
    const session = newSession();
    const result = processInput(session, "0");
    expect(result.message).toMatch(/No active order to cancel/);
  });

  test("scheduling requires a valid HH:MM time", () => {
    const session = newSession();
    processInput(session, "1");
    processInput(session, "3");
    processInput(session, "99");

    const bad = processInput(session, "schedule tomorrow");
    expect(bad.message).toMatch(/Reply "pay"/);

    const good = processInput(session, "schedule 18:30");
    expect(good.message).toMatch(/scheduled for 18:30/);
    expect(session.currentOrder.scheduledFor).toBe("18:30");
  });

  test('"pay" triggers the INITIATE_PAYMENT action', () => {
    const session = newSession();
    processInput(session, "1");
    processInput(session, "3");
    processInput(session, "99");
    const result = processInput(session, "pay");
    expect(result.action).toBe("INITIATE_PAYMENT");
  });
});
