import { Hono } from "hono";

export function chatsRoutes(db) {
  const app = new Hono();

  app.get("/", (c) => c.json(db.listChats()));

  app.get("/:id", (c) => {
    const chat = db.getChat(Number(c.req.param("id")));
    return chat ? c.json(chat) : c.json({ error: "chat not found" }, 404);
  });

  app.delete("/:id", (c) => {
    const deleted = db.deleteChat(Number(c.req.param("id")));
    return deleted ? c.body(null, 204) : c.json({ error: "chat not found" }, 404);
  });

  return app;
}
