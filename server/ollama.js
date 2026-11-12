import { config } from "./config.js";

const OLLAMA_CHAT_URL = `${config.ollama.url}/api/chat`;

// Yields Ollama's streamed chunks: { message: { content, thinking, tool_calls }, done }.
// model: an Ollama model name. messages: [{ role, content, ... }]. tools: optional tool definitions.
export async function* streamChat(model, messages, tools, signal) {
  const res = await fetch(OLLAMA_CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, tools, stream: true }),
    signal,
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);

  // The body is newline-delimited JSON, and a network chunk can end mid-line.
  let buffer = "";
  for await (const text of res.body.pipeThrough(new TextDecoderStream())) {
    buffer += text;
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) yield* parseChunk(line);
  }
  yield* parseChunk(buffer);
}

// One non-streaming call whose reply is forced into the given JSON schema, without thinking.
// Returns the parsed JSON. Used for small background jobs, so it is deterministic.
export async function chatStructured(model, messages, schema) {
  const res = await fetch(OLLAMA_CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      format: schema,
      think: false,
      options: { temperature: 0 },
      stream: false,
    }),
    signal: AbortSignal.timeout(config.ollama.structuredTimeoutMs),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  return JSON.parse((await res.json()).message.content);
}

function* parseChunk(line) {
  if (!line.trim()) return;
  const chunk = JSON.parse(line);
  if (chunk.error) throw new Error(`Ollama: ${chunk.error}`);
  yield chunk;
}
