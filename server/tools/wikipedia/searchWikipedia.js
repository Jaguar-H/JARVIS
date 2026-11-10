import { fetchJson } from "../fetchJson.js";

const API_URL = "https://en.wikipedia.org/w/api.php";
const SERVICE = "Wikipedia";
const MAX_RESULTS = 3;
const SUMMARY_SENTENCES = 4;

export const definition = {
  type: "function",
  function: {
    name: "search_wikipedia",
    description:
      "Search Wikipedia and get short summaries of the best matching articles. " +
      "Use it for facts about people, places, events, concepts and other general knowledge.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to search for, e.g. Alan Turing" },
      },
      required: ["query"],
    },
  },
};

export async function run({ query }) {
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("query is required");
  }

  const data = await fetchJson(SERVICE, API_URL, {
    action: "query",
    format: "json",
    formatversion: 2,
    generator: "search",
    gsrsearch: query.trim(),
    gsrlimit: MAX_RESULTS,
    prop: "extracts|info",
    exintro: 1,
    explaintext: 1,
    exsentences: SUMMARY_SENTENCES,
    exlimit: "max",
    inprop: "url",
  });

  const pages = data.query?.pages ?? [];
  if (!pages.length) throw new Error(`No Wikipedia articles found for "${query.trim()}"`);

  // The API returns pages unordered; `index` is the search rank.
  const results = pages
    .toSorted((a, b) => a.index - b.index)
    .map((page) => ({
      title: page.title,
      summary: page.extract || null,
      url: page.fullurl ?? null,
    }));

  return { query: query.trim(), results };
}
