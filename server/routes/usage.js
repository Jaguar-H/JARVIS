import { Hono } from "hono";

// GET / returns the lifetime token totals per model.
export function usageRoutes(db) {
  const app = new Hono();

  app.get("/", (c) => c.json({ models: db.listUsage() }));

  return app;
}
