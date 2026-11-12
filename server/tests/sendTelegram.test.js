import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { config } from "../config.js";
import { run } from "../tools/telegram/sendTelegram.js";

async function withTelegram(settings, response, fn) {
  const originalFetch = globalThis.fetch;
  const originalSettings = { ...config.telegram };
  Object.assign(config.telegram, settings);
  let request;
  globalThis.fetch = (url, init) => {
    request = { url, body: JSON.parse(init.body) };
    return Promise.resolve(response);
  };
  try {
    return await fn(() => request);
  } finally {
    globalThis.fetch = originalFetch;
    Object.assign(config.telegram, originalSettings);
  }
}

const SET = { token: "SECRET", chatId: "42" };

Deno.test("sends the text to the owner's chat", () =>
  withTelegram(SET, new Response("{}"), async (request) => {
    assertEquals(await run({ text: "hi" }), { sent: true });
    assertEquals(request().url, `${config.telegram.apiUrl}/botSECRET/sendMessage`);
    assertEquals(request().body, { chat_id: "42", text: "hi" });
  }));

Deno.test("rejects bad text, missing setup and Telegram errors without leaking the token", async () => {
  await withTelegram(SET, new Response("{}"), async () => {
    await assertRejects(() => run({ text: "  " }), Error, "text is required");
    await assertRejects(() => run({ text: "x".repeat(5000) }), Error, "at most");
  });
  await withTelegram({ token: "", chatId: "" }, new Response("{}"), async () => {
    await assertRejects(() => run({ text: "hi" }), Error, "not set up");
  });
  await withTelegram(SET, new Response("{}", { status: 400 }), async () => {
    await assertRejects(() => run({ text: "hi" }), Error, "(400)");
  });
});
