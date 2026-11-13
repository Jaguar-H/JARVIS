import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { openDb } from "../db.js";
import { startScheduler, tick } from "../scheduler.js";
import { run } from "../tools/scheduler/scheduleReminder.js";

const NOW = Date.parse("2026-11-12T09:30:00+05:30");
const MINUTE = 60_000;

function fakeSend() {
  const sent = [];
  const send = (message) => {
    sent.push(message.text);
    return Promise.resolve({ sent: true });
  };
  return { sent, send };
}

Deno.test("sends due reminders once and leaves future ones", async () => {
  const db = openDb(":memory:");
  db.addReminder("due", NOW - 10_000);
  db.addReminder("later", NOW + MINUTE);
  const { sent, send } = fakeSend();

  await tick(db, NOW, { send });
  await tick(db, NOW, { send });

  assertEquals(sent, ["due"]);
});

Deno.test("a reminder that is long overdue says when it was due", async () => {
  const db = openDb(":memory:");
  db.addReminder("call mom", Date.parse("2026-11-12T09:00:00+05:30"));
  const { sent, send } = fakeSend();

  await tick(db, NOW, { send });

  assertEquals(sent, ["call mom (was due 09:00)"]);
});

Deno.test("a failed send stays unsent and is retried on the next tick", async () => {
  const db = openDb(":memory:");
  db.addReminder("retry me", NOW);

  await tick(db, NOW, { send: () => Promise.reject(new Error("offline")) });
  assertEquals(db.listDueReminders(NOW).length, 1);

  const { sent, send } = fakeSend();
  await tick(db, NOW + 30_000, { send });
  assertEquals(sent, ["retry me"]);
});

Deno.test("a task is run, not sent as text, and says when it was due if late", async () => {
  const db = openDb(":memory:");
  db.addReminder("check the weather", NOW - 10_000, "task");
  db.addReminder("check the news", Date.parse("2026-11-12T09:00:00+05:30"), "task");
  const { sent, send } = fakeSend();
  const ran = [];

  await tick(db, NOW, { send, runTask: (text) => ran.push(text) });
  await tick(db, NOW, { send, runTask: (text) => ran.push(text) });

  assertEquals(sent, []);
  assertEquals(ran.length, 2);
  assertEquals(ran[0].startsWith("[Scheduled task, was due 09:00] check the news"), true);
  assertEquals(ran[1].startsWith("[Scheduled task] check the weather"), true);
});

Deno.test("a task that throws stays unsent and is retried", async () => {
  const db = openDb(":memory:");
  db.addReminder("check the weather", NOW, "task");

  await tick(db, NOW, { runTask: () => Promise.reject(new Error("telegram down")) });
  assertEquals(db.listDueReminders(NOW).length, 1);

  const ran = [];
  await tick(db, NOW, { runTask: (text) => ran.push(text) });
  assertEquals(ran.length, 1);
  assertEquals(db.listDueReminders(NOW).length, 0);
});

Deno.test("schedule_reminder saves a future reminder and rejects bad input", async () => {
  const db = openDb(":memory:");
  const timer = startScheduler(db); // also gives the tool its database
  try {
    const at = new Date(Date.now() + 60 * MINUTE).toISOString();

    assertEquals((await run({ text: " stretch ", at })).scheduled, true);
    assertEquals(db.listDueReminders(Date.now() + 61 * MINUTE).map((r) => r.text), ["stretch"]);

    assertEquals((await run({ text: "water", in_minutes: 5 })).scheduled, true);
    assertEquals(db.listDueReminders(Date.now() + 6 * MINUTE).map((r) => r.text), ["water"]);

    await run({ text: "look up the weather", mode: "task", in_minutes: 4 });
    assertEquals(db.listDueReminders(Date.now() + 4 * MINUTE + 1000).map((r) => r.kind), ["task"]);

    await assertRejects(() => run({ text: "x", mode: "poem", in_minutes: 5 }), Error, "mode");
    await assertRejects(() => run({ text: "x", in_minutes: -5 }), Error, "future");
    await assertRejects(() => run({ text: "x" }), Error, "in_minutes");
    await assertRejects(() => run({ text: "x", at: "tomorrow-ish" }), Error, "ISO 8601");
    await assertRejects(() => run({ text: "x", at: "2020-01-01T00:00:00Z" }), Error, "future");
    await assertRejects(() => run({ text: " ", at }), Error, "text is required");
  } finally {
    clearInterval(timer);
  }
});
