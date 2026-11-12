import { assertEquals } from "jsr:@std/assert@1";
import { openDb } from "../db.js";

Deno.test("creates a chat titled with the start of its first message", () => {
  const db = openDb(":memory:");
  const chat = db.createChat("  " + "a".repeat(80), "qwen3:8b");
  assertEquals(chat.title, "a".repeat(50));
  assertEquals(db.getChat(chat.id), { ...chat, messages: [] });
});

Deno.test("returns messages in the order they were added", () => {
  const db = openDb(":memory:");
  const { id } = db.createChat("hi", "m");
  db.addMessage(id, "user", "hi");
  db.addMessage(id, "assistant", "hello");
  assertEquals(db.getMessages(id), [
    { role: "user", content: "hi" },
    { role: "assistant", content: "hello" },
  ]);
});

Deno.test("lists the chat with the newest message first", () => {
  const db = openDb(":memory:");
  const first = db.createChat("first", "m");
  db.addMessage(first.id, "user", "first");
  const second = db.createChat("second", "m");
  db.addMessage(second.id, "user", "second");
  assertEquals(db.listChats().map((c) => c.title), ["second", "first"]);

  db.addMessage(first.id, "assistant", "reply");
  assertEquals(db.listChats().map((c) => c.title), ["first", "second"]);
});

Deno.test("updates the model and deletes a chat with its messages", () => {
  const db = openDb(":memory:");
  const { id } = db.createChat("hi", "m");
  db.addMessage(id, "user", "hi");

  db.setModel(id, "other");
  assertEquals(db.getChat(id).model, "other");

  assertEquals(db.deleteChat(id), true);
  assertEquals(db.getChat(id), null);
  assertEquals(db.getMessages(id), []);
  assertEquals(db.deleteChat(id), false);
});

Deno.test("saves memories in order and skips duplicates ignoring case", () => {
  const db = openDb(":memory:");
  assertEquals(db.addMemory("Lives in Pune"), true);
  assertEquals(db.addMemory("Name is Sam"), true);
  assertEquals(db.addMemory("lives in pune"), false);
  assertEquals(db.listMemories(), [
    { id: 1, fact: "Lives in Pune" },
    { id: 2, fact: "Name is Sam" },
  ]);
});

Deno.test("deletes a memory by id", () => {
  const db = openDb(":memory:");
  db.addMemory("Lives in Pune");
  assertEquals(db.deleteMemory(1), true);
  assertEquals(db.deleteMemory(1), false);
  assertEquals(db.listMemories(), []);
});

Deno.test("adds up token usage per model", () => {
  const db = openDb(":memory:");
  db.addUsage("a", 10, 5);
  db.addUsage("a", 20, 7);
  db.addUsage("b", 1, 2);
  assertEquals(db.listUsage(), [
    { model: "a", prompt_tokens: 30, completion_tokens: 12 },
    { model: "b", prompt_tokens: 1, completion_tokens: 2 },
  ]);
});
