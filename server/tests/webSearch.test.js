import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { run } from "../tools/search/webSearch.js";

const ITEMS = Array.from({ length: 8 }, (_, i) => ({
  title: `Result ${i}`,
  url: `https://example.com/${i}`,
  content: i === 1 ? "" : `Snippet ${i}`,
}));

async function withFetch(response, fn) {
  const original = globalThis.fetch;
  let requested;
  globalThis.fetch = (url) => {
    requested = new URL(url);
    return Promise.resolve(response);
  };
  try {
    return await fn(() => requested);
  } finally {
    globalThis.fetch = original;
  }
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });

Deno.test("maps results, caps at 5, keeps missing snippets as null, sends the category", () =>
  withFetch(json({ results: ITEMS }), async (requested) => {
    const { query, results } = await run({ query: " deno ", category: "news" });
    assertEquals(query, "deno");
    assertEquals(results.length, 5);
    assertEquals(results[0], { title: "Result 0", url: "https://example.com/0", snippet: "Snippet 0" });
    assertEquals(results[1].snippet, null);
    assertEquals(requested().searchParams.get("categories"), "news");
    assertEquals(requested().searchParams.get("format"), "json");
  }));

Deno.test("rejects empty queries, unknown categories, no results and service failures", async () => {
  await assertRejects(() => run({ query: "  " }), Error, "query is required");
  await assertRejects(() => run({ query: "x", category: "images" }), Error, "category must be one of");
  await withFetch(json({ results: [] }), async () => {
    await assertRejects(() => run({ query: "zzxxqq" }), Error, "No web results found");
  });
  await withFetch(json({}, 403), async () => {
    await assertRejects(() => run({ query: "deno" }), Error, "(403)");
  });
});
