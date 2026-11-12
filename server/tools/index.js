import * as getWeather from "./weather/getWeather.js";
import * as searchWikipedia from "./wikipedia/searchWikipedia.js";
import * as webSearch from "./search/webSearch.js";
import * as sendTelegram from "./telegram/sendTelegram.js";

const tools = [getWeather, searchWikipedia, webSearch, sendTelegram];

export const definitions = tools.map((tool) => tool.definition);

const runners = Object.fromEntries(
  tools.map((tool) => [tool.definition.function.name, tool.run]),
);

export async function runTool(name, args) {
  const run = runners[name];
  if (!run) {
    console.warn(`[tool] ${name} unknown`);
    return `Unknown tool: ${name}`;
  }

  console.log(`[tool] ${name} called`, JSON.stringify(args));
  const startedAt = performance.now();
  try {
    const result = JSON.stringify(await run(args));
    console.log(`[tool] ${name} ok (${elapsedMs(startedAt)}ms)`);
    return result;
  } catch (error) {
    console.error(`[tool] ${name} failed (${elapsedMs(startedAt)}ms): ${error.message}`);
    return `Tool ${name} failed: ${error.message}`;
  }
}

function elapsedMs(startedAt) {
  return Math.round(performance.now() - startedAt);
}
