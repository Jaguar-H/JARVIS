import { config } from "./config.js";

const { url, timeoutMs, lowBelow, highFrom, lowModel, mediumModel, highModel } = config.router;

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

// Asks Laya which model should answer this message. Never throws: when Laya is down, slow or
// answers something unexpected, the medium model is used.
export async function pickModel(message) {
  try {
    const response = await fetch(`${url}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: { message }, questions: QUESTIONS }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`Laya returned ${response.status}`);

    const score = (await response.json()).answers?.kind?.score;
    if (typeof score !== "number") throw new Error("Laya gave no score");

    const model = score < lowBelow ? lowModel : score >= highFrom ? highModel : mediumModel;
    console.log(`[router] ${score.toFixed(2)} -> ${model}`);
    return model;
  } catch (error) {
    console.warn(`[router] using ${mediumModel}: ${error.message}`);
    return mediumModel;
  }
}
