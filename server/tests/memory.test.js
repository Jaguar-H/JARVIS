import { assertEquals } from "jsr:@std/assert@1";
import { openDb } from "../db.js";
import { extractMemories, learnFromMessage } from "../memory.js";

// Replaces fetch with one that answers every call with the given model output (a string),
// and records the request bodies.
async function withModelOutput(content, status, fn) {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = (_url, init) => {
    requests.push(JSON.parse(init.body));
    const body = JSON.stringify({ message: { role: "assistant", content } });
    return Promise.resolve(new Response(body, { status }));
  };
  try {
    return await fn(requests);
  } finally {
    globalThis.fetch = original;
  }
}

const output = (value) => JSON.stringify(value);
const MEMORIES = [{ id: 1, fact: "Lives in Delhi" }, { id: 2, fact: "Name is Sam" }];

Deno.test("keeps valid facts and ids, and drops unknown ids, empty and overlong facts", () =>
  withModelOutput(
    output({ add: ["Lives in Pune", "  ", "x".repeat(201), "Works at Acme"], forget: [1, 99] }),
    200,
    async () => {
      const result = await extractMemories({ memories: MEMORIES, userMessage: "I moved" });
      assertEquals(result, { add: ["Lives in Pune", "Works at Acme"], forget: [1] });
    },
  ));

Deno.test("allows at most 5 new facts", () =>
  withModelOutput(output({ add: ["a", "b", "c", "d", "e", "f"], forget: [] }), 200, async () => {
    const result = await extractMemories({ memories: [], userMessage: "hi" });
    assertEquals(result.add, ["a", "b", "c", "d", "e"]);
  }));

Deno.test("sends the notebook with ids, structured and without thinking", () =>
  withModelOutput(output({ add: [], forget: [] }), 200, async (requests) => {
    await extractMemories({ memories: MEMORIES, userMessage: "hello" });
    const [request] = requests;
    assertEquals(request.think, false);
    assertEquals(request.options.temperature, 0);
    assertEquals(request.format.required, ["add", "forget"]);
    assertEquals(request.messages[0].content.includes("[1] Lives in Delhi"), true);
    assertEquals(request.messages[1], { role: "user", content: "hello" });
  }));

Deno.test("applies the result to the database: forgets, adds, and skips duplicates", () =>
  withModelOutput(
    output({ add: ["lives in pune", "Works at Acme"], forget: [1] }),
    200,
    async () => {
      const db = openDb(":memory:");
      db.addMemory("Lives in Delhi");
      db.addMemory("Lives in Pune");

      await learnFromMessage(db, "I moved to Pune for Acme");

      assertEquals(db.listMemories().map((m) => m.fact), ["Lives in Pune", "Works at Acme"]);
    },
  ));

Deno.test("never throws, and saves nothing, when the model output is invalid or the call fails", async () => {
  for (const [content, status] of [["not json", 200], ["{}", 500]]) {
    await withModelOutput(content, status, async () => {
      const db = openDb(":memory:");
      db.addMemory("Lives in Delhi");
      await learnFromMessage(db, "I moved");
      assertEquals(db.listMemories().map((m) => m.fact), ["Lives in Delhi"]);
    });
  }
});

Deno.test("counts the tokens the memory model used", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(Response.json({
      message: { role: "assistant", content: output({ add: [], forget: [] }) },
      prompt_eval_count: 40,
      eval_count: 6,
    }));
  try {
    const db = openDb(":memory:");
    await learnFromMessage(db, "hello");
    const [row] = db.listUsage();
    assertEquals([row.prompt_tokens, row.completion_tokens], [40, 6]);
  } finally {
    globalThis.fetch = original;
  }
});
