import { assertEquals } from "jsr:@std/assert@1";
import { buildSystemPrompt } from "../prompt.js";

Deno.test("without memories, the prompt is only the persona", () => {
  const prompt = buildSystemPrompt([]);
  assertEquals(prompt.includes("Jarvis"), true);
  assertEquals(prompt.includes("What you know about the user"), false);
});

Deno.test("lists the facts it knows about the user", () => {
  const prompt = buildSystemPrompt([{ id: 1, fact: "Lives in Pune" }, { id: 2, fact: "Name is Sam" }]);
  assertEquals(prompt.includes("- Lives in Pune\n- Name is Sam"), true);
});

Deno.test("uses only the newest 50 facts", () => {
  const memories = Array.from({ length: 60 }, (_, i) => ({ id: i + 1, fact: `fact ${i + 1}` }));
  const prompt = buildSystemPrompt(memories);
  assertEquals(prompt.includes("- fact 11\n"), true);
  assertEquals(prompt.includes("fact 10\n"), false);
  assertEquals(prompt.includes("- fact 60"), true);
});
