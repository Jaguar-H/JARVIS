import { runChat } from "./chatRun.js";
import { config } from "./config.js";
import { AUTO } from "./router.js";

const { token, chatId, apiUrl, pollSeconds, maxMessageLength } = config.telegram;

// The id of the chat Telegram messages go into, and the next update to ask Telegram for.
const CHAT_KEY = "telegram_chat";
const OFFSET_KEY = "telegram_offset";

// Errors can contain the request URL, which contains the token.
const safe = (error) => String(error.message).replaceAll(token, "<token>");

async function call(method, params, signal) {
  const response = await fetch(`${apiUrl}/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
    signal,
  });
  if (!response.ok) throw new Error(`Telegram ${method} failed (${response.status})`);
  return (await response.json()).result;
}

export const fromOwner = (update, ownerId = chatId) =>
  String(update.message?.from?.id) === ownerId && Boolean(update.message.text);

// Cuts at a line break when there is one, so long replies split cleanly.
export function splitMessage(text, max = maxMessageLength) {
  const parts = [];
  while (text.length > max) {
    const cut = text.lastIndexOf("\n", max) > 0 ? text.lastIndexOf("\n", max) : max;
    parts.push(text.slice(0, cut));
    text = text.slice(cut).trimStart();
  }
  parts.push(text);
  return parts;
}

// Handles one text message from the owner. send(text) delivers a message back.
// All Telegram messages share one chat; /new starts a fresh one.
export async function handleUpdate(db, update, send, run = runChat) {
  const text = update.message.text.trim();

  if (text === "/new") {
    db.deleteSetting(CHAT_KEY);
    return send("New chat started.");
  }

  const savedId = db.getSetting(CHAT_KEY);
  let chat = savedId && db.getChat(Number(savedId));
  if (!chat) {
    chat = db.createChat(text, AUTO);
    db.setSetting(CHAT_KEY, chat.id);
  }
  db.addMessage(chat.id, "user", text);

  // Telegram can't show a stream, so the whole reply is sent at the end.
  let reply = "";
  try {
    for await (const event of run(db, chat, AUTO, text)) {
      if (event.type === "token") reply += event.content;
    }
  } catch (error) {
    return send(`Something went wrong: ${error.message}`);
  }
  for (const part of splitMessage(reply.trim() || "(empty reply)")) await send(part);
}

// Starts the bot in the background. Does nothing unless the token and the owner's id are set.
export async function startTelegram(db) {
  if (!token || !chatId) return;
  console.log("[telegram] bot is on");

  const send = (text) => call("sendMessage", { chat_id: chatId, text });
  await call("setMyCommands", { commands: [{ command: "new", description: "Start a new chat" }] })
    .catch((error) => console.warn(`[telegram] ${safe(error)}`));

  while (true) {
    try {
      const updates = await call(
        "getUpdates",
        { offset: Number(db.getSetting(OFFSET_KEY) ?? 0), timeout: pollSeconds },
        AbortSignal.timeout((pollSeconds + 10) * 1000),
      );
      for (const update of updates) {
        // Saved first, so a restart doesn't answer the same message twice.
        db.setSetting(OFFSET_KEY, update.update_id + 1);
        if (!fromOwner(update)) continue;

        const typing = () => call("sendChatAction", { chat_id: chatId, action: "typing" }).catch(() => { });
        typing();
        const typingTimer = setInterval(typing, 4000);
        try {
          await handleUpdate(db, update, send);
        } finally {
          clearInterval(typingTimer);
        }
      }
    } catch (error) {
      console.warn(`[telegram] ${safe(error)}`);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}
