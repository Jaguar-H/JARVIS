// Every server setting in one place. Edit a value here and restart.
// Only OLLAMA_URL, MEMORY_MODEL and SEARXNG_URL can also be set with environment variables.
const env = (name, fallback) => Deno.env.get(name) ?? fallback;

export const config = {
  ollama: {
    // Set OLLAMA_URL when Ollama is not on localhost, e.g. when the server runs in Docker.
    url: env("OLLAMA_URL", "http://localhost:11434"),
    // Time limit for the non-streaming calls used by background jobs.
    structuredTimeoutMs: 60_000,
  },

  agent: {
    // How many times the model may ask for tools before it must answer.
    maxSteps: 5,
  },

  chat: {
    // A new chat is titled with this many characters of its first message.
    titleLength: 50,
  },

  // Timezone used for "today's date" in the system prompt (the Docker container runs in UTC).
  timezone: "Asia/Kolkata",

  persona:
    "You are Jarvis, a helpful personal AI assistant. Be concise and direct. " +
    "Use a tool only when the user's request needs it, never just to be proactive. " +
    "If a tool fails, say so plainly and never guess or make up data.",

  memory: {
    // The small model that extracts facts about the user after each reply.
    model: env("MEMORY_MODEL", "qwen3:8b"),
    maxNewFacts: 5, // facts saved per message
    maxFactLength: 200, // longer facts are dropped
    maxInPrompt: 50, // newest facts put in the system prompt
  },

  tools: {
    timeoutMs: 8000,
    userAgent: "jarvis-chatbot/0.1 (local project)",

    weather: {
      geocodingUrl: "https://geocoding-api.open-meteo.com/v1/search",
      forecastUrl: "https://api.open-meteo.com/v1/forecast",
      geocodeCount: 5, // places looked up for a city name
      hoursAhead: 24,
      forecastDays: 7,
    },

    wikipedia: {
      apiUrl: "https://en.wikipedia.org/w/api.php",
      maxResults: 3,
      summarySentences: 4,
    },

    searxng: {
      // Set SEARXNG_URL when SearXNG is not on localhost, e.g. when the server runs in Docker.
      url: env("SEARXNG_URL", "http://localhost:8080"),
      maxResults: 5,
      categories: ["general", "news", "science", "it"], // the first is the default
    },
  },
};
