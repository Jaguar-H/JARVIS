import { Hono } from "hono";

export function memoriesRoutes(db) {
  const app = new Hono();

  app.get("/", (c) => c.json(db.listMemories()));

  app.delete("/:id", (c) => {
    const deleted = db.deleteMemory(Number(c.req.param("id")));
    return deleted ? c.body(null, 204) : c.json({ error: "memory not found" }, 404);
  });

  return app;
}
