// Structured logging + the error-tracker seam (NASCAR-081). Emits one JSON line
// per event so critical flows (email, cron, webhook) are queryable in Vercel or
// any log aggregator. `captureError` is the single place an error tracker (e.g.
// Sentry) is wired at deploy time — keeping the SDK and its DSN out of the
// codebase until production. Never log secrets or PII beyond what's necessary.

type Fields = Record<string, unknown>;

function emit(
  level: "info" | "warn" | "error",
  event: string,
  fields?: Fields,
) {
  const line = JSON.stringify({ level, event, ...fields });
  // Vercel/most platforms timestamp and route by stream, so we don't add a time.
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: string, fields?: Fields) => emit("info", event, fields),
  warn: (event: string, fields?: Fields) => emit("warn", event, fields),
  error: (event: string, fields?: Fields) => emit("error", event, fields),
};

/**
 * Report an unexpected error. Today it logs structured; at deploy, plug an error
 * tracker in here (e.g. `Sentry.captureException(error, { extra: context })`).
 * Never throws — observability must not break the request.
 */
export function captureError(error: unknown, context?: Fields): void {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    log.error("exception", { message, stack, ...context });
  } catch {
    // Last resort: never let logging throw.
  }
}
