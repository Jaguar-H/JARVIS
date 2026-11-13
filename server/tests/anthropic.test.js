import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { streamClaude, toAnthropicRequest } from "../anthropic.js";
import { runChat } from "../chatRun.js";
import { config } from "../config.js";
import { openDb } from "../db.js";

const encoder = new TextEncoder();

const definitions = [{
  type: "function",
  function: { name: "get_weather", description: "Weather", parameters: { type: "object", properties: {} } },
}];

// A streamed Anthropic response (server-sent events) with the given content blocks.
function sse(blocks, stopReason = "end_turn") {
  const events = [["message_start", {
    type: "message_start",
    message: { id: "msg_1", type: "message", role: "assistant", model: "m", content: [], stop_reason: null, usage: { input_tokens: 7, output_tokens: 0 } },
  }]];
  blocks.forEach((block, index) => {
    const start = block.type === "text" ? { type: "text", text: "" } : { ...block, input: {} };
    events.push(["content_block_start", { type: "content_block_start", index, content_block: start }]);
    const delta = block.type === "text"
      ? { type: "text_delta", text: block.text }
      : { type: "input_json_delta", partial_json: JSON.stringify(block.input) };
    events.push(["content_block_delta", { type: "content_block_delta", index, delta }]);
    events.push(["content_block_stop", { type: "content_block_stop", index }]);
  });
  events.push(["message_delta", { type: "message_delta", delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 5 } }]);
  events.push(["message_stop", { type: "message_stop" }]);
  const body = events.map(([name, data]) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`).join("");
  return new Response(encoder.encode(body), { headers: { "content-type": "text/event-stream" } });
}

// Replaces fetch: requests to Anthropic get claude() (a Response, or a function that throws),
// anything else (Ollama) gets ollama(). Records the Anthropic request bodies.
async function withFetch({ claude, ollama }, fn) {
  const original = globalThis.fetch;
  const originalKey = config.anthropic.apiKey;
  const claudeRequests = [];
  config.anthropic.apiKey = "test-key";
  globalThis.fetch = async (url, init) => {
    if (String(url).includes("anthropic.com")) {
      claudeRequests.push(JSON.parse(init.body));
      return typeof claude === "function" ? claude() : claude;
    }
    return ollama();
  };
  try {
    return await fn(claudeRequests);
  } finally {
    globalThis.fetch = original;
    config.anthropic.apiKey = originalKey;
  }
}

async function collect(stream) {
  const events = [];
  for await (const event of stream) events.push(event);
  return events;
}

Deno.test("converts the history, tool calls and tool results to an Anthropic request", () => {
  const raw = [
    { type: "thinking", thinking: "", signature: "sig" },
    { type: "tool_use", id: "toolu_a", name: "get_weather", input: { city: "Pune" } },
    { type: "tool_use", id: "toolu_b", name: "get_weather", input: { city: "Delhi" } },
  ];
  const { system, messages, tools } = toAnthropicRequest([
    { role: "system", content: "You are Jarvis" },
    { role: "user", content: "weather?" },
    { role: "assistant", content: "", tool_calls: [{ function: { name: "get_weather", arguments: {} }, _content: raw }, { function: {} }] },
    { role: "tool", tool_name: "get_weather", content: "28C" },
    { role: "tool", tool_name: "get_weather", content: "20C" },
  ], definitions);

  assertEquals(system, "You are Jarvis");
  assertEquals(messages, [
    { role: "user", content: "weather?" },
    { role: "assistant", content: raw },
    { role: "user", content: [
      { type: "tool_result", tool_use_id: "toolu_a", content: "28C" },
      { type: "tool_result", tool_use_id: "toolu_b", content: "20C" },
    ] },
  ]);
  assertEquals(tools, [{ name: "get_weather", description: "Weather", input_schema: { type: "object", properties: {} } }]);
});

Deno.test("streams text and token counts in the shape agent.js expects", () =>
  withFetch({ claude: () => sse([{ type: "text", text: "Hello" }]) }, async (requests) => {
    const chunks = await collect(streamClaude("claude-haiku-5-5", [{ role: "user", content: "hi" }], definitions));

    assertEquals(chunks[0].message.content, "Hello");
    assertEquals(chunks.at(-1), { message: {}, done: true, prompt_eval_count: 7, eval_count: 5 });
    assertEquals(requests[0].model, "claude-haiku-5-5");
    assertEquals(requests[0].output_config.effort, config.anthropic.effort);
  }));

Deno.test("a tool use comes back as a tool call carrying the raw blocks", () =>
  withFetch({ claude: () => sse([{ type: "tool_use", id: "toolu_1", name: "get_weather", input: { city: "Pune" } }], "tool_use") }, async () => {
    const chunks = await collect(streamClaude("claude-haiku-5-5", [{ role: "user", content: "hi" }], definitions));
    const [call] = chunks.find((chunk) => chunk.message.tool_calls).message.tool_calls;

    assertEquals(call.function, { name: "get_weather", arguments: { city: "Pune" } });
    assertEquals(call._content[0].id, "toolu_1");
  }));

Deno.test("a refusal is an error", () =>
  withFetch({ claude: () => sse([{ type: "text", text: "no" }], "refusal") }, async () => {
    await assertRejects(
      () => collect(streamClaude("claude-haiku-5-5", [{ role: "user", content: "x" }], definitions)),
      Error,
      "declined",
    );
  }));

const ollamaReply = () =>
  new Response(JSON.stringify({ message: { role: "assistant", content: "local answer" }, done: true }) + "\n");

function chatWithMessage(db) {
  const chat = db.createChat("hi", "auto");
  db.addMessage(chat.id, "user", "hi");
  return chat;
}

Deno.test("a Claude call that fails before any text falls back to the medium local model", () =>
  withFetch({ claude: () => Promise.reject(new Error("offline")), ollama: ollamaReply }, async () => {
    const db = openDb(":memory:");
    const events = await collect(runChat(db, chatWithMessage(db), config.router.highModel, "hi"));

    assertEquals(events.filter((e) => e.type === "route").map((e) => e.model), [config.router.highModel, config.router.mediumModel]);
    assertEquals(events.filter((e) => e.type === "token").map((e) => e.content).join(""), "local answer");
  }));

Deno.test("a Claude failure after text has started is an error, not a fallback", () =>
  withFetch({ claude: () => sse([{ type: "text", text: "Hel" }], "refusal"), ollama: ollamaReply }, async () => {
    const db = openDb(":memory:");
    // The refusal arrives after the first token was already streamed.
    await assertRejects(() => collect(runChat(db, chatWithMessage(db), config.router.highModel, "hi")), Error, "declined");
  }));
