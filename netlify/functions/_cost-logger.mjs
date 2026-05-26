// _cost-logger.mjs
// Lightweight cost/usage logger for Netlify functions. Writes one row per
// invocation to the shared Supabase `function_invocations` table.
//
// Naming convention: underscore prefix tells Netlify this is a helper, not
// a deployable function endpoint.
//
// Usage at the bottom (or end) of any function handler:
//
//   import { logInvocation, startTimer } from './_cost-logger.mjs';
//
//   const timer = startTimer();
//   // ...your function logic...
//   await logInvocation({
//     project: '40-alli-ai-dm-coach',
//     function_name: 'slack-events',
//     workspace_id: teamId,        // optional, e.g. Slack team_id
//     user_id: userId,             // optional, e.g. Slack user
//     status_code: 200,            // optional
//     metadata: { event_type: 'message' }, // optional, free-form JSON
//   }, timer);
//
// Required env vars (set at the Netlify team level for every site):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Safety: this function never throws. If Supabase is down or env vars are
// missing, it logs a warning and moves on. Cost tracking must never break
// the underlying function.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Netlify Functions default Lambda memory: 1024 MB.
// If a repo sets a different size in netlify.toml, pass `memory_mb` explicitly
// when calling logInvocation, or update this constant in a per-repo wrapper.
const DEFAULT_MEMORY_MB = 1024;

// Netlify pricing approximation: 1 credit is roughly 1 GB-second of compute.
// estimated_credits = (memory_mb / 1024) * (duration_ms / 1000)
function calcCredits(durationMs, memoryMb = DEFAULT_MEMORY_MB) {
  return (memoryMb / 1024) * (durationMs / 1000);
}

export function startTimer() {
  return { start: Date.now() };
}

// Convenience wrapper. Use when you just want to log the full handler
// duration and don't need request-specific fields (workspace_id, user_id,
// custom metadata). For richer logging (like slack-events extracting team
// and user from the payload), call logInvocation directly.
//
// Usage:
//   const _handler = async (req, context) => { ...existing handler... };
//   export default wrapHandler(_handler, {
//     project: '40-alli-ai-dm-coach',
//     function_name: 'dm-coach',
//   });
//
// Works for any signature ((req,context), (req), or no args for scheduled
// functions). Captures status_code from the Response if returned.
export function wrapHandler(handler, options) {
  return async (...args) => {
    const timer = startTimer();
    let statusCode = 200;
    let res;
    try {
      res = await handler(...args);
      statusCode = (res && res.status) || 200;
      return res;
    } catch (err) {
      statusCode = 500;
      throw err;
    } finally {
      await logInvocation({
        ...options,
        status_code: statusCode,
      }, timer);
    }
  };
}

export async function logInvocation(fields, timer) {
  try {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      console.warn('[cost-logger] SUPABASE env vars missing, skipping log');
      return;
    }

    const durationMs = timer ? Date.now() - timer.start : 0;
    const memoryMb = fields.memory_mb || DEFAULT_MEMORY_MB;
    const estimatedCredits = calcCredits(durationMs, memoryMb);

    const row = {
      project: fields.project,
      function_name: fields.function_name,
      workspace_id: fields.workspace_id || null,
      user_id: fields.user_id || null,
      duration_ms: durationMs,
      memory_mb: memoryMb,
      estimated_credits: Number(estimatedCredits.toFixed(6)),
      status_code: fields.status_code || null,
      metadata: fields.metadata || null,
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/function_invocations`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[cost-logger] supabase ${res.status}: ${errText}`);
    }
  } catch (err) {
    console.warn('[cost-logger] caught error:', err && err.message);
  }
}
