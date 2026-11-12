import { Hono } from "hono";
import { stream } from "hono/streaming";
import { streamReply } from "../agent.js";
import { learnFromMessage } from "../memory.js";
import { buildSystemPrompt } from "../prompt.js";
import { AUTO, pickModel } from "../router.js";

// Counting tokens must never break a reply.
function countTokens(db, model, { prompt, completion }) {
  try {
    db.addUsage(model, prompt, completion);
  } catch (error) {
    console.warn(`[usage] could not count tokens: ${error.message}`);
  }
}

// POST / { chatId?, model, content } streams the reply as NDJSON events.
// Without a chatId a new chat is created. The server keeps the history.
export function chatRoutes(db) {
  const app = new Hono();

  app.post("/", async (c) => {
    const body = await c.req.json().catch(() => null);

    if (typeof body?.model !== "string" || !body.model) {
      return c.json({ error: "model required" }, 400);
    }

    if (typeof body.content !== "string" || !body.content.trim()) {
      return c.json({ error: "content required" }, 400);
    }

    const chat = body.chatId == null
      ? db.createChat(body.content, body.model)
      : db.getChat(body.chatId);

    if (!chat) return c.json({ error: "chat not found" }, 404);

    db.setModel(chat.id, body.model);
    db.addMessage(chat.id, "user", body.content);

    c.header("Content-Type", "application/x-ndjson");
    return stream(c, async (out) => {
      const controller = new AbortController();
      out.onAbort(() => controller.abort());
      const send = (event) => out.writeln(JSON.stringify(event));

      await send({ type: "chat", chat: { id: chat.id, title: chat.title, model: body.model } });

      let reply = "";
      try {
        const model = body.model === AUTO ? await pickModel(body.content) : body.model;
        await send({ type: "route", model });

        const history = db.getMessages(chat.id);
        const messages = [
          { role: "system", content: buildSystemPrompt(db.listMemories()) },
          ...history,
        ];
        for await (const event of streamReply(model, messages, controller.signal)) {
          if (event.type === "usage") {
            countTokens(db, model, event);
            continue;
          }
          if (event.type === "token") reply += event.content;
          await send(event);
        }
        // Only a finished reply is saved; an aborted or failed one is dropped.
        if (reply) {
          db.addMessage(chat.id, "assistant", reply);
          // Not awaited: learning about the user must not delay or break the reply.
          learnFromMessage(db, body.content);
        }
      } catch (error) {
        if (!controller.signal.aborted) await send({ type: "error", message: error.message });
      }
    });
  });

  return app;
}
