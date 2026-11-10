import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { run } from "../tools/wikipedia/searchWikipedia.js";

const PAGES = [
  { title: "Turing machine", index: 2, extract: "A Turing machine is...", fullurl: "https://en.wikipedia.org/wiki/Turing_machine" },
  { title: "Alan Turing", index: 1, extract: "Alan Turing was...", fullurl: "https://en.wikipedia.org/wiki/Alan_Turing" },
  { title: "Turing test", index: 3, extract: "", fullurl: "https://en.wikipedia.org/wiki/Turing_test" },
];

async function withFetch(response, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = () => Promise.resolve(response);
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

Deno.test("returns results in search-rank order and keeps missing summaries as null", () =>
  withFetch(json({ query: { pages: PAGES } }), async () => {
    const { query, results } = await run({ query: " Alan Turing " });
    assertEquals(query, "Alan Turing");
    assertEquals(results.map((r) => r.title), ["Alan Turing", "Turing machine", "Turing test"]);
    assertEquals(results[0].url, "https://en.wikipedia.org/wiki/Alan_Turing");
    assertEquals(results[2].summary, null);
  }));

Deno.test("rejects empty queries, no matches and service failures", async () => {
  await assertRejects(() => run({ query: "  " }), Error, "query is required");
  await withFetch(json({ batchcomplete: true }), async () => {
    await assertRejects(() => run({ query: "zzxxqq" }), Error, "No Wikipedia articles found");
  });
  await withFetch(json({}, 503), async () => {
    await assertRejects(() => run({ query: "Alan Turing" }), Error, "(503)");
  });
});
