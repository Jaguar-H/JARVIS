import { streamReply } from "./agent.js";
import { config } from "./config.js";
import { learnFromMessage } from "./memory.js";
import { buildSystemPrompt } from "./prompt.js";
import { AUTO, pickModel } from "./router.js";

// Counting tokens must never break a reply.
function countTokens(db, model, { prompt, completion }) {
  try {
    db.addUsage(model, prompt, completion);
  } catch (error) {
    console.warn(`[usage] could not count tokens: ${error.message}`);
  }
}

// Answers the newest message of a chat (the caller has already saved it). Yields the stream
// events: { type: "route", model }, then "token" and "tool". Used by the web route and Telegram.
export async function* runChat(db, chat, selectedModel, content, signal) {
  const model = selectedModel === AUTO ? await pickModel(content) : selectedModel;
  yield { type: "route", model };

  // Only the newest messages go to the model; all of them stay stored.
  const history = db.getMessages(chat.id).slice(-config.chat.maxHistory);
  const messages = [
    { role: "system", content: buildSystemPrompt(db.listMemories()) },
    ...history,
  ];

  let reply = "";
  for await (const event of streamReply(model, messages, signal)) {
    if (event.type === "usage") {
      countTokens(db, model, event);
      continue;
    }
    if (event.type === "token") reply += event.content;
    yield event;
  }
  // Only a finished reply is saved; an aborted or failed one is dropped.
  if (reply) {
    db.addMessage(chat.id, "assistant", reply);
    // Not awaited: learning about the user must not delay or break the reply.
    learnFromMessage(db, content);
  }
}
