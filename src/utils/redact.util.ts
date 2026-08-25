const REDACTED = '<redacted>';
const SENSITIVE_KEY_PATTERN = /password|token/i;

// Masks sensitive fields (password on requests, token on responses) so no
// call site can forget to redact before something reaches debug logs.
// Recurses into nested objects/arrays so a credential buried in a wrapper
// (e.g. an error envelope) is still caught, not just top-level fields.
// Redaction is by KEY NAME only — a credential value echoed under an
// unrelated key (e.g. a hypothetical error message quoting the submitted
// password) would not be caught. Confirmed safe against DemoQA's actual
// Account API: every documented error message is a static, generic string
// (see docs/api-spec/account-endpoints.md) that never echoes request values.
// Revisit this if a future endpoint's error body includes submitted data.
export function redact(payload: unknown): unknown {
  if (Array.isArray(payload)) return payload.map(redact);
  if (typeof payload !== 'object' || payload === null) return payload;

  return Object.fromEntries(
    Object.entries(payload as Record<string, unknown>).map(([key, value]) => [
      key,
      SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redact(value),
    ])
  );
}

// Response bodies are logged as parsed+redacted JSON where possible (e.g. a
// GenerateToken success response contains a live JWT); falls back to raw
// text for non-JSON bodies (an empty 204, or a genuinely malformed response).
export function redactResponseText(text: string): string {
  if (!text) return text;
  try {
    return JSON.stringify(redact(JSON.parse(text)));
  } catch {
    return text;
  }
}
