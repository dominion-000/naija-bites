// sessionStore.js
//
// No login
// the first time a browser
// hits the server, we hand it a random ID in a cookie. Every request after
// that carries the cookie, so we know which cart/order/history belongs to
// which device, with zero credentials involved.
//
// NOTE: sessions live in this Map, which lives in RAM. Restarting the server
// (or Render spinning the free instance down on idle) wipes every session.
// That's an accepted tradeoff for this assessment — see README for the
// upgrade path to SQLite if this ever needs to survive a restart.

const crypto = require("crypto");

const sessions = new Map();

const SESSION_COOKIE = "sid";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 1 sec(1000 ms) * 1 minute(60 secs) * 1 hour(60 mins) * 1 day (24 hours) * 30 = 30 days(1 month)

// creates the new/intial session
function createNewSession() {
  return {
    state: "MAIN_MENU", // MAIN_MENU | BROWSING | CHOOSING_OPTION | AWAITING_PAYMENT
    cart: [], // items added but not yet checked out
    pendingItem: null, // { item, optionIndex, chosen } while walking through options
    currentOrder: null, // order placed via checkout, awaiting/undergoing payment
    orderHistory: [], // paid orders
  };
}

function attachSession(req, res, next) {
  let sid = req.cookies[SESSION_COOKIE];

  if (!sid || !sessions.has(sid)) {
    sid = crypto.randomUUID();
    sessions.set(sid, createNewSession());
    res.cookie(SESSION_COOKIE, sid, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_MS,
    });
  }

  req.sessionId = sid;
  req.session = sessions.get(sid);
  next();
}

// Used by the WebSocket layer, which sits outside the Express middleware
// chain and so can't use attachSession's res.cookie(). It reads the same
// cookie by parsing the upgrade request's headers directly (see
// websocketServer.js) — this just looks up (or creates, as a fallback)
// the session behind that id.
function getOrCreateSessionById(sid) {
  if (sid && sessions.has(sid)) {
    return { sid, session: sessions.get(sid) };
  }
  const newSid = crypto.randomUUID();
  sessions.set(newSid, createNewSession());
  return { sid: newSid, session: sessions.get(newSid) };
}

module.exports = {
  attachSession,
  sessions,
  getOrCreateSessionById,
  SESSION_COOKIE,
};
