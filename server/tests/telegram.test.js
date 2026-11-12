import { assert, assertEquals } from "jsr:@std/assert@1";
import { openDb } from "../db.js";
import { fromOwner, handleUpdate, splitMessage } from "../telegram.js";

const update = (text, from = 42) => ({ message: { from: { id: from }, text } });

// A fake runChat that answers "echo: <text>".
async function* echo(_db, _chat, _model, content) {
  yield { type: "route", model: "m" };
  yield { type: "token", content: `echo: ${content}` };
}

async function chat(db, text, run = echo) {
  const sent = [];
  await handleUpdate(db, update(text), async (t) => sent.push(t), run);
  return sent;
}

Deno.test("only the owner's text messages are handled", () => {
  assert(fromOwner(update("hi"), "42"));
  assert(!fromOwner(update("hi", 7), "42"));
  assert(!fromOwner({ message: { from: { id: 42 } } }, "42")); // no text
  assert(!fromOwner({}, "42"));
});

Deno.test("messages share one chat until /new", async () => {
  const db = openDb(":memory:");
  assertEquals(await chat(db, "hello"), ["echo: hello"]);
  await chat(db, "again");
  assertEquals(db.listChats().length, 1);
  assertEquals(db.getMessages(1).map((m) => m.content), ["hello", "again"]); // fake run saves no reply

  assertEquals(await chat(db, "/new"), ["New chat started."]);
  await chat(db, "third");
  assertEquals(db.listChats().length, 2);
});

Deno.test("a failed reply is reported", async () => {
  const db = openDb(":memory:");
  // deno-lint-ignore require-yield
  async function* broken() {
    throw new Error("Ollama is down");
  }
  assertEquals(await chat(db, "hi", broken), ["Something went wrong: Ollama is down"]);
});

Deno.test("long replies are split, at a line break when possible", () => {
  assertEquals(splitMessage("aaa\nbbb\nccc", 7), ["aaa\nbbb", "ccc"]);
  assertEquals(splitMessage("abcdef", 4), ["abcd", "ef"]);
  assertEquals(splitMessage("short", 4096), ["short"]);
});
