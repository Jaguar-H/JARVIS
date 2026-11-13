import { Hono } from "hono";
import { serveStatic } from "hono/deno";
import { logger } from "hono/logger";
import { openDb } from "./db.js";
import { chatRoutes } from "./routes/chat.js";
import { chatsRoutes } from "./routes/chats.js";
import { memoriesRoutes } from "./routes/memories.js";
import { usageRoutes } from "./routes/usage.js";
import { startScheduler } from "./scheduler.js";
import { handleUpdate, startTelegram } from "./telegram.js";
import { run as sendTelegram } from "./tools/telegram/sendTelegram.js";

const DB_DIR = "data";

Deno.mkdirSync(DB_DIR, { recursive: true });
const db = openDb(`${DB_DIR}/jarvis.db`);

const app = new Hono();

app.use(logger());

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/chat", chatRoutes(db));
app.route("/api/chats", chatsRoutes(db));
app.route("/api/memories", memoriesRoutes(db));
app.route("/api/usage", usageRoutes(db));

app.use("/*", serveStatic({ root: "./client/dist" }));

Deno.serve(app.fetch);
startTelegram(db);
// A due task is handled like a message the user typed in the shared Telegram chat.
startScheduler(db, (text) => handleUpdate(db, { message: { text } }, (reply) => sendTelegram({ text: reply })));
