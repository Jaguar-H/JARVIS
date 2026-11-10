import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { logger } from "hono/logger";
import { openDb } from "./db.js";
import { chatRoutes } from "./routes/chat.js";
import { chatsRoutes } from "./routes/chats.js";

const DB_DIR = "data";

Deno.mkdirSync(DB_DIR, { recursive: true });
const db = openDb(`${DB_DIR}/jarvis.db`);

const app = new Hono();

app.use(logger());

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/chat", chatRoutes(db));
app.route("/api/chats", chatsRoutes(db));

app.use("/*", serveStatic({ root: "./client/dist" }));

Deno.serve(app.fetch);
