import { config } from "../../config.js";

export const definition = {
  type: "function",
  function: {
    name: "send_telegram",
    description:
      "Send a text message to the user's Telegram. " +
      "Use it only when the user explicitly asks to be messaged or sent something on Telegram.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "The message to send" },
      },
      required: ["text"],
    },
  },
};

export async function run({ text }) {
  const { token, chatId, apiUrl, maxMessageLength } = config.telegram;

  if (typeof text !== "string" || !text.trim()) throw new Error("text is required");
  if (text.length > maxMessageLength) {
    throw new Error(`text must be at most ${maxMessageLength} characters`);
  }
  if (!token || !chatId) throw new Error("Telegram is not set up");

  let response;
  try {
    response = await fetch(`${apiUrl}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(config.tools.timeoutMs),
    });
  } catch (error) {
    // Fetch errors contain the URL, which contains the token, so they are not passed on.
    throw new Error(error.name === "TimeoutError" ? "Telegram timed out" : "Could not reach Telegram");
  }
  if (!response.ok) throw new Error(`Telegram returned an error (${response.status})`);
  return { sent: true };
}
