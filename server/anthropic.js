import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

export const isClaude = (model) => model.startsWith("claude-");

// Turns the history (Ollama-shaped, as agent.js builds it) and the tool definitions into an
// Anthropic request. An assistant message with tool_calls carries the model's raw content blocks
// (thinking, text and tool_use, with their ids) in `_content` on its first call; they go back
// unchanged, and the tool messages that follow are matched to the tool_use ids in order.
export function toAnthropicRequest(history, definitions) {
  const system = history.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const messages = [];
  let pendingIds = [];

  for (const message of history) {
    if (message.role === "system") continue;

    if (message.role === "tool") {
      const block = { type: "tool_result", tool_use_id: pendingIds.shift(), content: message.content };
      const last = messages.at(-1);
      // History messages have text content, so an array here is a tool-result message we made.
      if (last?.role === "user" && Array.isArray(last.content)) last.content.push(block);
      else messages.push({ role: "user", content: [block] });
    } else if (message.tool_calls?.length) {
      const content = message.tool_calls.find((call) => call._content)._content;
      pendingIds = content.filter((block) => block.type === "tool_use").map((block) => block.id);
      messages.push({ role: "assistant", content });
    } else {
      messages.push({ role: message.role, content: message.content });
    }
  }

  const tools = definitions.map(({ function: f }) => ({
    name: f.name,
    description: f.description,
    input_schema: f.parameters,
  }));
  return { system, messages, tools };
}

// Same contract as streamChat in ollama.js: yields { message: { content, tool_calls }, done,
// prompt_eval_count, eval_count }, so agent.js can use either.
export async function* streamClaude(model, history, definitions, signal) {
  const { system, messages, tools } = toAnthropicRequest(history, definitions);
  const client = new Anthropic({ apiKey: config.anthropic.apiKey });
  const stream = client.messages.stream({
    model,
    max_tokens: config.anthropic.maxTokens,
    system,
    messages,
    tools,
    thinking: { type: "adaptive" },
    output_config: { effort: config.anthropic.effort },
  }, { signal });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield { message: { content: event.delta.text } };
    }
  }

  const final = await stream.finalMessage();
  const toolUses = final.content.filter((block) => block.type === "tool_use");
  if (final.stop_reason === "refusal") throw new Error("Claude declined this request");
  if (final.stop_reason === "max_tokens" && toolUses.length) {
    throw new Error("Claude's reply was cut off in the middle of a tool call");
  }

  if (toolUses.length) {
    const toolCalls = toolUses.map((block) => ({ function: { name: block.name, arguments: block.input } }));
    toolCalls[0]._content = final.content;
    yield { message: { content: "", tool_calls: toolCalls } };
  }

  const { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens } = final.usage;
  yield {
    message: {},
    done: true,
    prompt_eval_count: input_tokens + (cache_creation_input_tokens ?? 0) + (cache_read_input_tokens ?? 0),
    eval_count: output_tokens,
  };
}
