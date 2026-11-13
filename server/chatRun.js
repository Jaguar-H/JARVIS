import { streamReply } from "./agent.js";
import { isClaude } from "./anthropic.js";
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
  const stored = db.getMessages(chat.id);
  const { contextMessages } = config.router;
  // stored ends with the message being answered, which Laya gets separately.
  const previous = contextMessages ? stored.slice(0, -1).slice(-contextMessages) : [];
  const model = selectedModel === AUTO ? await pickModel(content, previous) : selectedModel;
  yield { type: "route", model };

  // Only the newest messages go to the model; all of them stay stored.
  const history = stored.slice(-config.chat.maxHistory);
  const messages = [
    { role: "system", content: buildSystemPrompt(db.listMemories()) },
    ...history,
  ];

  // A Claude call that fails before anything came back (offline, no credit, rate limit) is
  // retried once on the medium local model. A failure after that point is an error.
  const candidates = isClaude(model) ? [model, config.router.mediumModel] : [model];
  let reply = "";
  for (const [index, candidate] of candidates.entries()) {
    if (index) yield { type: "route", model: candidate };
    let started = false;
    try {
      for await (const event of streamReply(candidate, messages, signal)) {
        if (event.type === "usage") {
          countTokens(db, candidate, event);
          continue;
        }
        started = true;
        if (event.type === "token") reply += event.content;
        yield event;
      }
      break;
    } catch (error) {
      if (started || signal?.aborted || index === candidates.length - 1) throw error;
      console.warn(`[chat] ${candidate} failed (${error.message}), using ${candidates[index + 1]}`);
    }
  }
  // Only a finished reply is saved; an aborted or failed one is dropped.
  if (reply) {
    db.addMessage(chat.id, "assistant", reply);
    // Not awaited: learning about the user must not delay or break the reply.
    learnFromMessage(db, content);
  }
}
