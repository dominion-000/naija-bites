// chatEngine.js
//
// This is a state machine.
// Each session sits in exactly one state at a time,
// and what a number means depends on that state.
// adding a new menu path later = new state + one handler, not a rewrite.
//
//   MAIN_MENU       -> the `1 / 99 / 98 / 97 / 0` top-level options
//   BROWSING        -> customer is picking items from the menu
//   CHOOSING_OPTION -> customer is walking through an item's sub-option
//   AWAITING_EMAIL   -> order placed, waiting on a valid email for the receipt
//   AWAITING_PAYMENT -> email captured, waiting on "pay" / "schedule"

const crypto = require("crypto");
const MENU = require("./menu");

// holds possible top-level commands
const GLOBAL_COMMANDS = ["99", "98", "97", "0"];

function mainMenuText() {
  return [
    "1 - Place an order",
    "99 - Checkout order",
    "98 - See order history",
    "97 - See current order",
    "0 - Cancel order",
  ].join("\n");
}

function formatMenuList() {
  return MENU.map(
    (item) => `${item.id}. ${item.name} - \u20a6${item.price}`,
  ).join("\n");
}
function formatItems(items) {
  return items
    .map(
      (i) =>
        `- ${i.name}${i.options.length ? ` (${i.options.join(", ")})` : ""} - \u20a6${i.price}`,
    )
    .join("\n");
}

// calculate the total price of items in the cart
function cartTotal(cart) {
  return cart.reduce((sum, i) => sum + i.price, 0);
}

function resetToMainMenu(session) {
  session.state = "MAIN_MENU";
  session.pendingItem = null;
}

function browsingPrompt() {
  return `Select an item number, or 99 to checkout, 97 to view current order, 0 to cancel.`;
}

// Global Commands
// valid from MAIN_MENU and BROWSING

// checkout
function handleCheckout(session) {
  if (!session.cart.length) {
    resetToMainMenu(session);
    return { message: `No order to place.\n\n${mainMenuText()}` };
  }
  const total = cartTotal(session.cart);
  session.currentOrder = {
    id: crypto.randomUUID(),
    items: session.cart,
    total,
    status: "pending_payment",
    scheduledFor: null,
    reference: null,
    email: null,
    createdAt: new Date().toISOString(),
  };
  session.cart = [];
  session.state = "AWAITING_EMAIL";
  return {
    message:
      `Order placed! Total: \u20a6${total}.\n\n` +
      `What email should we send your receipt to?`,
  };
}

// order history
function handleHistory(session) {
  if (!session.orderHistory.length) {
    return { message: `No past orders yet.\n\n${mainMenuText()}` };
  }
  const list = session.orderHistory
    .map(
      (o, i) =>
        `${i + 1}. ${formatItems(o.items)}\n   Total: \u20a6${o.total} — ${o.status}`,
    )
    .join("\n\n");
  return { message: `Your order history:\n\n${list}\n\n${mainMenuText()}` };
}

// handle orders
function handleCurrentOrder(session) {
  if (session.currentOrder) {
    const o = session.currentOrder;
    return {
      message:
        `Current order (${o.status}):\n${formatItems(o.items)}\nTotal: \u20a6${o.total}` +
        (o.scheduledFor ? `\nScheduled for: ${o.scheduledFor}` : "") +
        `\n\nReply "pay" to pay, or 0 to cancel.`,
    };
  }
  if (session.cart.length) {
    return {
      message:
        `Items selected so far:\n${formatItems(session.cart)}\nRunning total: \u20a6${cartTotal(session.cart)}\n\n` +
        `Select 99 to checkout, or continue browsing.`,
    };
  }
  return { message: `You have no current order.\n\n${mainMenuText()}` };
}

// cancel orders
function handleCancel(session) {
  const hadSomething = Boolean(session.currentOrder) || session.cart.length > 0;
  if (session.currentOrder && session.currentOrder.status === "paid") {
    // paid orders aren't cancellable, only pending ones are cancellable
  } else {
    session.currentOrder = null;
  }
  session.cart = [];
  resetToMainMenu(session);
  return {
    message: hadSomething
      ? `Order cancelled.\n\n${mainMenuText()}`
      : `No active order to cancel.\n\n${mainMenuText()}`,
  };
}

// function to route commands
function routeGlobalCommand(session, input) {
  switch (input) {
    case "99":
      return handleCheckout(session);
    case "98":
      return handleHistory(session);
    case "97":
      return handleCurrentOrder(session);
    case "0":
      return handleCancel(session);
    default:
      return null;
  }
}

// State Handlers

// Menu
function handleMainMenu(session, input) {
  if (input === "1") {
    session.state = "BROWSING";
    return {
      message: `Here's our menu:\n\n${formatMenuList()}\n\n${browsingPrompt()}`,
    };
  }
  const globalResult = routeGlobalCommand(session, input);
  if (globalResult) return globalResult;
  return {
    message: `Invalid option "${input}".\n\nWhat would you like to do?\n${mainMenuText()}`,
  };
}

function promptCurrentOption(session) {
  const { item, optionIndex } = session.pendingItem;
  const opt = item.options[optionIndex];
  const choicesText = opt.choices.map((c, i) => `${i + 1} - ${c}`).join("\n");
  return { message: `${item.name} — choose ${opt.name}:\n${choicesText}` };
}

function handleBrowsing(session, input) {
  if (GLOBAL_COMMANDS.includes(input)) {
    const result = routeGlobalCommand(session, input);
    if (result) return result;
  }

  const id = parseInt(input, 10);
  const item = MENU.find((m) => m.id === id);
  if (!item) {
    return {
      message: `Invalid selection "${input}".\n\n${formatMenuList()}\n\n${browsingPrompt()}`,
    };
  }

  if (item.options.length) {
    session.pendingItem = { item, optionIndex: 0, chosen: [] };
    session.state = "CHOOSING_OPTION";
    return promptCurrentOption(session);
  }

  session.cart.push({ name: item.name, price: item.price, options: [] });
  return {
    message: `Added ${item.name} to your order.\n\n${formatMenuList()}\n\n${browsingPrompt()}`,
  };
}

// Option
function handleOptionChoice(session, input) {
  const pending = session.pendingItem;
  const opt = pending.item.options[pending.optionIndex];
  const choiceIdx = parseInt(input, 10) - 1;

  if (Number.isNaN(choiceIdx) || !opt.choices[choiceIdx]) {
    const retry = promptCurrentOption(session);
    return {
      message: `Invalid choice "${input}". Please select a valid number.\n\n${retry.message}`,
    };
  }

  pending.chosen.push(`${opt.name}: ${opt.choices[choiceIdx]}`);
  pending.optionIndex += 1;

  if (pending.optionIndex < pending.item.options.length) {
    return promptCurrentOption(session);
  }

  session.cart.push({
    name: pending.item.name,
    price: pending.item.price,
    options: pending.chosen,
  });
  const addedName = pending.item.name;
  const addedOptions = pending.chosen.join(", ");
  session.pendingItem = null;
  session.state = "BROWSING";

  return {
    message: `Added ${addedName} (${addedOptions}) to your order.\n\n${formatMenuList()}\n\n${browsingPrompt()}`,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Handle Email
function handleAwaitingEmail(session, input) {
  const trimmed = input.trim();

  if (trimmed === "0") {
    return handleCancel(session);
  }

  if (!EMAIL_RE.test(trimmed)) {
    return {
      message: `"${trimmed}" doesn't look like a valid email. What email should we send your receipt to? (or 0 to cancel)`,
    };
  }

  session.currentOrder.email = trimmed.toLowerCase();
  session.state = "AWAITING_PAYMENT";
  return {
    message: `Got it — receipt goes to ${session.currentOrder.email}.\n\nReply "pay" to pay now, or "schedule HH:MM" to schedule this order for later, or 0 to cancel.`,
  };
}

const SCHEDULE_RE = /^schedule\s+(\d{1,2}:\d{2})$/i;

// Handle Payment
function handleAwaitingPayment(session, input) {
  const trimmed = input.trim();

  if (trimmed === "0") {
    return handleCancel(session);
  }

  if (/^pay$/i.test(trimmed)) {
    return {
      message: "Redirecting you to payment...",
      action: "INITIATE_PAYMENT",
    };
  }

  const scheduleMatch = trimmed.match(SCHEDULE_RE);
  if (scheduleMatch) {
    session.currentOrder.scheduledFor = scheduleMatch[1];
    return {
      message: `Order scheduled for ${scheduleMatch[1]}. Reply "pay" when you're ready, or 0 to cancel.`,
    };
  }

  return {
    message:
      'Reply "pay" to proceed to payment, "schedule HH:MM" to schedule for later, or 0 to cancel.',
  };
}

// Entry Point

// input
function processInput(session, rawInput) {
  const input = String(rawInput || "").trim();
  if (!input) {
    return { message: "Please enter a valid option." };
  }

  switch (session.state) {
    case "BROWSING":
      return handleBrowsing(session, input);
    case "CHOOSING_OPTION":
      return handleOptionChoice(session, input);
    case "AWAITING_EMAIL":
      return handleAwaitingEmail(session, input);
    case "AWAITING_PAYMENT":
      return handleAwaitingPayment(session, input);
    case "MAIN_MENU":
    default:
      return handleMainMenu(session, input);
  }
}

// greet customer
function greeting() {
  return `Welcome to Naija Bites! \ud83c\udf72\n\nWhat would you like to do?\n${mainMenuText()}`;
}

module.exports = { processInput, mainMenuText, greeting };
