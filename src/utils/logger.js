// logger.js
//
// custom logger for in-app business events inside the app (order placed,
// payment verified, webhook received) and errors. Deliberately dependency-free.

function timestamp() {
  return new Date().toISOString();
}

function line(level, message, meta) {
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
  const out = `[${timestamp()}] ${level.toUpperCase()} ${message}${metaStr}`;
  if (level === "error") console.error(out);
  else console.log(out);
}

module.exports = {
  info: (message, meta) => line("info", message, meta),
  warn: (message, meta) => line("warn", message, meta),
  error: (message, meta) => line("error", message, meta),
};
