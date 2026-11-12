import { config } from "../../config.js";
import { fetchJson } from "../fetchJson.js";

const { apiUrl, maxResults, summarySentences } = config.tools.wikipedia;
const SERVICE = "Wikipedia";

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

  const data = await fetchJson(SERVICE, apiUrl, {
    action: "query",
    format: "json",
    formatversion: 2,
    generator: "search",
    gsrsearch: query.trim(),
    gsrlimit: maxResults,
    prop: "extracts|info",
    exintro: 1,
    explaintext: 1,
    exsentences: summarySentences,
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
