import { isClaude } from "./anthropic.js";
import { config } from "./config.js";

const { url, timeoutMs, lowBelow, highFrom, lowModel, mediumModel, highModel, contextChars } =
  config.router;

// What the client sends as the model when it wants Laya to choose.
export const AUTO = "auto";

// Worded as the kind of request, not "effort" or "difficulty": those separated badly.
// A score question returns 0 to 2: how far the message sits between these three descriptions.
const QUESTIONS = {
  kind: {
    type: "score",
    instructions: "What kind of request is this?",
    criteria: [
      "chit-chat or a simple factual question",
      "general explanation, writing, summary or advice",
      "code, debugging, math or technical analysis or heavy reasoning",
    ],
  },
};

// Asks Laya which model should answer this message. `previous` is the messages before it
// ([{ role, content }]), so a short follow-up like "yes do it" is judged in context. Never throws:
// when Laya is down, slow or answers something unexpected, the medium model is used.
export async function pickModel(message, previous = []) {
  const context = previous.map(({ role, content }) => `${role}: ${content.slice(0, contextChars)}`);
  const state = context.length ? { previous: context, message } : { message };
  try {
    const response = await fetch(`${url}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, questions: QUESTIONS }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`Laya returned ${response.status}`);

    const score = (await response.json()).answers?.kind?.score;
    if (typeof score !== "number") throw new Error("Laya gave no score");

    let model = score < lowBelow ? lowModel : score >= highFrom ? highModel : mediumModel;
    // A Claude high tier needs a key; without one the medium model answers.
    if (isClaude(model) && !config.anthropic.apiKey) model = mediumModel;
    console.log(`[router] ${score.toFixed(2)} -> ${model}`);
    return model;
  } catch (error) {
    console.warn(`[router] using ${mediumModel}: ${error.message}`);
    return mediumModel;
  }
}
