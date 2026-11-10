import { Hono } from "hono";
import { stream } from "hono/streaming";
import { streamReply } from "../agent.js";

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
        const history = db.getMessages(chat.id);
        for await (const event of streamReply(body.model, history, controller.signal)) {
          if (event.type === "token") reply += event.content;
          await send(event);
        }
        // Only a finished reply is saved; an aborted or failed one is dropped.
        if (reply) db.addMessage(chat.id, "assistant", reply);
      } catch (error) {
        if (!controller.signal.aborted) await send({ type: "error", message: error.message });
      }
    });
  });

  return app;
}
