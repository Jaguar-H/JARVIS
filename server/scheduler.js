import { config } from "./config.js";
import { run as sendTelegram } from "./tools/telegram/sendTelegram.js";

// Tools only receive their arguments, so they reach the database through this module.
let database;

export const formatTime = (ms, options) =>
  new Date(ms).toLocaleString("en-GB", { timeZone: config.timezone, ...options });

export function addReminder(text, dueAt, kind) {
  return database.addReminder(text, dueAt, kind);
}

// What the model is asked when a task comes due. It reads like a user message in the shared
// Telegram chat, so a later "thanks, and tomorrow?" has the context.
const taskMessage = (task, lateSince) =>
  `[Scheduled task${lateSince ? `, was due ${lateSince}` : ""}] ${task}\n` +
  "(Do it now and reply with the result only. The reply is sent to the user automatically, " +
  "so do not use send_telegram.)";

// Handles every reminder that is due. A message is sent as text; a task is given to
// runTask(text), which runs it like a chat message and sends the answer itself. A reminder that
// fails (for example Telegram is unreachable right after a boot) stays unsent and is retried
// on the next tick. A task that the model fails at is reported to the user and counts as done.
export async function tick(db, now = Date.now(), { send = sendTelegram, runTask } = {}) {
  for (const { id, text, due_at, kind } of db.listDueReminders(now)) {
    const late = now - due_at > config.scheduler.lateAfterSeconds * 1000;
    const dueTime = formatTime(due_at, { timeStyle: "short" });
    try {
      if (kind === "task") {
        await runTask(taskMessage(text, late && dueTime));
      } else {
        await send({ text: late ? `${text} (was due ${dueTime})` : text });
      }
      db.markReminderSent(id, now);
    } catch (error) {
      console.error(`[scheduler] reminder ${id} not done: ${error.message}`);
    }
  }
}

// The first tick runs at once: it catches up on reminders that came due while the server was
// down or the laptop was asleep. A task can take longer than a tick, so a tick is skipped while
// the previous one is still running (otherwise the same task would run twice).
export function startScheduler(db, runTask) {
  database = db;
  let busy = false;
  const safeTick = async () => {
    if (busy) return;
    busy = true;
    try {
      await tick(db, Date.now(), { runTask });
    } catch (error) {
      console.error(`[scheduler] ${error.message}`);
    } finally {
      busy = false;
    }
  };
  safeTick();
  return setInterval(safeTick, config.scheduler.tickSeconds * 1000);
}
