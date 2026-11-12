import { config } from "./config.js";
import { chatStructured } from "./ollama.js";

const { model, maxNewFacts, maxFactLength } = config.memory;

const SCHEMA = {
  type: "object",
  properties: {
    add: { type: "array", items: { type: "string" } },
    forget: { type: "array", items: { type: "integer" } },
  },
  required: ["add", "forget"],
};

const INSTRUCTIONS = `You keep a notebook of lasting personal facts about the user.
Read ONLY the user's latest message. Save a fact only if the user states it about THEMSELVES: name, job, employer, city, preferences, goals, family, hobbies.
Never save: questions, requests, topics they ask about, general knowledge, passwords, PINs, keys or any secret.
Write facts as short present-tense statements, e.g. "Lives in Pune". Never write "moved", "now" or "changed".
"forget" = ids of existing memories that the message makes false. If the user changes a fact (city, job), put the OLD id in forget AND the new fact in add.
and forget only if the two things are contradicting AND if found contradicting forget the old memory and add the current one.
If nothing qualifies, return {"add": [], "forget": []}.

Examples
Existing: [1] Lives in Delhi | Message: I moved to Mumbai -> {"add":["Lives in Mumbai"],"forget":[1]}
Existing: (none) | Message: What is the capital of France? -> {"add":[],"forget":[]}
Existing: (none) | Message: my card pin is 1234 -> {"add":[],"forget":[]}
Existing: (none) | Message: I'm Sam, I love hiking -> {"add":["Name is Sam","Loves hiking"],"forget":[]}
Existing: [1] Name is Sam | Message: explain recursion please -> {"add":[],"forget":[]}`;

// Asks the model what to add to and forget from the notebook after one user message.
// memories: [{ id, fact }]. Returns { add: string[], forget: number[] } with bad entries dropped.
//
// Only the user's message is given to the model, not the assistant's reply: with the reply
// included, the 2B model stopped noticing contradictions.
export async function extractMemories({ memories, userMessage }) {
  const notebook = memories.length
    ? memories.map(({ id, fact }) => `[${id}] ${fact}`).join("\n")
    : "(none)";

  const result = await chatStructured(model, [
    { role: "system", content: `${INSTRUCTIONS}\n\nExisting memories:\n${notebook}` },
    { role: "user", content: userMessage },
  ], SCHEMA);

  const knownIds = new Set(memories.map(({ id }) => id));
  return {
    add: (result.add ?? [])
      .map((fact) => String(fact).trim())
      .filter((fact) => fact && fact.length <= maxFactLength)
      .slice(0, maxNewFacts),
    forget: (result.forget ?? []).filter((id) => knownIds.has(id)),
  };
}

// Runs extraction and applies the result to the database. Never throws: a failure only
// means nothing is remembered this time.
export async function learnFromMessage(db, userMessage) {
  try {
    const { add, forget } = await extractMemories({
      memories: db.listMemories(),
      userMessage,
    });
    console.log({ add, forget });


    const forgotten = forget.filter((id) => db.deleteMemory(id));
    const added = add.filter((fact) => db.addMemory(fact));
    if (forgotten.length) console.log(`[memory] forgot ids: ${forgotten.join(", ")}`);
    if (added.length) console.log(`[memory] added: ${added.join(" | ")}`);
  } catch (error) {
    console.warn(`[memory] extraction failed: ${error.message}`);
  }
}
