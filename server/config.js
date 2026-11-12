// Every server setting in one place. Edit a value here and restart.
// Only OLLAMA_URL, MEMORY_MODEL, SEARXNG_URL, LAYA_URL, TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID can also be set with environment variables.
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
    // Only this many of the newest messages are sent to the model (all stay stored).
    maxHistory: 40,
  },

  telegram: {
    // Both must be set to turn the bot on. Only messages from chatId are answered.
    token: env("TELEGRAM_BOT_TOKEN", ""),
    chatId: env("TELEGRAM_CHAT_ID", ""),
    apiUrl: "https://api.telegram.org",
    pollSeconds: 30, // how long Telegram holds a getUpdates call open
    maxMessageLength: 4096, // Telegram's limit; longer replies are split
  },

  scheduler: {
    tickSeconds: 30, // how often due reminders are looked for
    lateAfterSeconds: 90, // a reminder sent later than this after its time gets a "was due" note
  },

  // Timezone used for "today's date" in the system prompt (the Docker container runs in UTC).
  timezone: "Asia/Kolkata",

  persona:
    "You are Jarvis, a helpful personal AI assistant. Be concise and direct. " +
    "Use a tool only when the user's request needs it, never just to be proactive. " +
    "If a tool fails, say so plainly and never guess or make up data.",

  router: {
    // Laya (systemOneModel/) decides which chat model answers when the dropdown says "auto".
    // Set LAYA_URL when Laya is not on localhost, e.g. when the server runs in Docker.
    url: env("LAYA_URL", "http://localhost:8100"),
    timeoutMs: 2000, // slower than this and the medium model answers
    // Laya scores each message from 0 (chit-chat) to 2 (code, math, technical). Cut-offs picked by
    // probing 22 prompts: technical ones scored 1.48 and up, everything else 1.07 and below, and
    // chit-chat versus general requests overlaps a little (0.17 to 0.95 against 0.52 to 1.07).
    lowBelow: 0.8, // under this: lowModel
    highFrom: 1.25, // from this: highModel; in between: mediumModel
    lowModel: "bonsai-2:2b",
    mediumModel: "qwen3:8b", // also the fallback when Laya is unavailable
    highModel: "qwen3.6:35b",
  },

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
