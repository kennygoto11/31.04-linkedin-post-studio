import type { Context, Config } from "@netlify/functions";
import { logInvocation, computeAnthropicCost } from './_cost-logger.mjs';

// Browser-direct Anthropic logger.
// The Post Studio calls Claude from the browser with the user's own API key,
// so the Anthropic spend never touches a wrapped Netlify function. The
// browser POSTs the usage block from the response here, and we write a
// single row to function_invocations matching the metadata.anthropic shape
// the dashboard already understands.

const PROJECT = '30-li-post-studio-goto11';
const FUNCTION_NAME = 'post-studio';

const _handler = async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad json" }), { status: 400 });
  }

  const usage = body?.usage;
  const model = body?.model;
  if (!usage
      || typeof usage.input_tokens !== 'number'
      || typeof usage.output_tokens !== 'number') {
    return new Response(JSON.stringify({ error: "usage.input_tokens and usage.output_tokens required" }), { status: 400 });
  }
  if (usage.input_tokens > 1_000_000 || usage.output_tokens > 1_000_000) {
    return new Response(JSON.stringify({ error: "usage out of range" }), { status: 400 });
  }

  const cost = computeAnthropicCost(usage, model);

  await logInvocation({
    project: PROJECT,
    function_name: FUNCTION_NAME,
    status_code: 200,
    metadata: {
      anthropic: {
        calls: 1,
        input_tokens: usage.input_tokens || 0,
        output_tokens: usage.output_tokens || 0,
        cache_creation_tokens: usage.cache_creation_input_tokens || 0,
        cache_read_tokens: usage.cache_read_input_tokens || 0,
        cost_usd: Number(cost.toFixed(6)),
        model: model || null,
      },
      source: 'browser-direct',
    },
  }, null);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export default _handler;

export const config: Config = {
  path: "/api/log-anthropic",
};
