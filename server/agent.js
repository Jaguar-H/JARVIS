import { streamChat } from "./ollama.js";
import { definitions, runTool } from "./tools/index.js";

const MAX_STEPS = 5;

// Streams the model's answer as events: { type: "token", content } and { type: "tool", name }.
// When the model asks for tools, runs them and asks again, until it answers in text.
export async function* streamReply(model, history, signal) {
  const messages = [...history];

  for (let step = 0; step < MAX_STEPS; step++) {
    let content = "";
    const toolCalls = [];

    for await (const { message } of streamChat(model, messages, definitions, signal)) {
      if (message.content) {
        content += message.content;
        yield { type: "token", content: message.content };
      }
      if (message.tool_calls) toolCalls.push(...message.tool_calls);
    }
    if (!toolCalls.length) return;
    console.log({ toolcall: messages.tool_calls, toolCalls });

    messages.push({ role: "assistant", content, tool_calls: toolCalls });
    for (const { function: call } of toolCalls) {
      yield { type: "tool", name: call.name };

      const result = await runTool(call.name, call.arguments);
      messages.push({ role: "tool", tool_name: call.name, content: result });
    }
  }

  throw new Error(`No final answer after ${MAX_STEPS} tool steps`);
}
