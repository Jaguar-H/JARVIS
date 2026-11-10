import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { streamReply } from "../agent.js";

const encoder = new TextEncoder();

// Builds a streaming Response from raw string chunks (which may split lines mid-way).
function ndjsonResponse(...chunks) {
  const body = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
  return new Response(body);
}

const line = (message) => JSON.stringify({ message, done: false }) + "\n";
const text = (content) => line({ role: "assistant", content });
const toolCall = (name) =>
  line({ role: "assistant", content: "", tool_calls: [{ function: { name, arguments: {} } }] });

// Replaces fetch with a function that returns the given responses in order and records request bodies.
async function withOllama(responses, fn) {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = (_url, init) => {
    requests.push(JSON.parse(init.body));
    return Promise.resolve(responses.shift());
  };
  try {
    return await fn(requests);
  } finally {
    globalThis.fetch = original;
  }
}

async function collect(stream) {
  const events = [];
  for await (const event of stream) events.push(event);
  return events;
}

Deno.test("streams tokens, even when a network chunk splits a line", () => {
  const whole = text("Hel");
  const responses = [ndjsonResponse(whole.slice(0, 10), whole.slice(10) + text("lo"))];
  return withOllama(responses, async () => {
    const events = await collect(streamReply("m", [{ role: "user", content: "hi" }]));
    assertEquals(events, [
      { type: "token", content: "Hel" },
      { type: "token", content: "lo" },
    ]);
  });
});

Deno.test("runs a requested tool, then streams the final answer", () => {
  const responses = [ndjsonResponse(toolCall("nope")), ndjsonResponse(text("Done"))];
  return withOllama(responses, async (requests) => {
    const events = await collect(streamReply("m", [{ role: "user", content: "hi" }]));
    assertEquals(events, [{ type: "tool", name: "nope" }, { type: "token", content: "Done" }]);

    const toolMessage = requests[1].messages.at(-1);
    assertEquals(toolMessage, { role: "tool", tool_name: "nope", content: "Unknown tool: nope" });
  });
});

Deno.test("gives up after too many tool steps", () => {
  const responses = Array.from({ length: 10 }, () => ndjsonResponse(toolCall("nope")));
  return withOllama(responses, async () => {
    await assertRejects(
      () => collect(streamReply("m", [{ role: "user", content: "hi" }])),
      Error,
      "No final answer",
    );
  });
});

Deno.test("surfaces an error reported inside the stream", () =>
  withOllama([ndjsonResponse(JSON.stringify({ error: "model not found" }) + "\n")], async () => {
    await assertRejects(
      () => collect(streamReply("m", [{ role: "user", content: "hi" }])),
      Error,
      "model not found",
    );
  }));
