import { request } from "./http.js";

// Sends a message and calls onEvent for each streamed event: chat, token, tool or error.
// chatId is omitted for the first message of a new chat.
export async function streamChat({ chatId, model, content }, onEvent) {
  const response = await request("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chatId, model, content }),
  });

  // The body is newline-delimited JSON, and a network chunk can end mid-line.
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines.filter(Boolean)) onEvent(JSON.parse(line));
  }
}
