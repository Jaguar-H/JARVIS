import { config } from "../../config.js";
import { fetchJson } from "../fetchJson.js";

const { url, maxResults, categories } = config.tools.searxng;
const SERVICE = "SearXNG";

export const definition = {
  type: "function",
  function: {
    name: "web_search",
    description:
      "Search the web and get titles, links and snippets. " +
      "Use it for current events, recent information, or anything Wikipedia can't answer. use this tool when the user gives a fact to verify",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "What to search for, e.g. deno 2 release notes" },
        category: {
          type: "string",
          enum: categories,
          description: `Optional. One of: ${categories.join(", ")}. Defaults to ${categories[0]}.`,
        },
      },
      required: ["query"],
    },
  },
};

export async function run({ query, category = categories[0] }) {
  if (typeof query !== "string" || !query.trim()) {
    throw new Error("query is required");
  }
  if (!categories.includes(category)) {
    throw new Error(`category must be one of: ${categories.join(", ")}`);
  }

  const data = await fetchJson(SERVICE, `${url}/search`, {
    q: query.trim(),
    format: "json",
    categories: category,
  });

  const results = (data.results ?? []).slice(0, maxResults).map((item) => ({
    title: item.title,
    url: item.url,
    snippet: item.content || null,
  }));
  if (!results.length) throw new Error(`No web results found for "${query.trim()}"`);

  return { query: query.trim(), results };
}
