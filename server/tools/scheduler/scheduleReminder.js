import { config } from "../../config.js";
import { addReminder, formatTime } from "../../scheduler.js";

export const definition = {
  type: "function",
  function: {
    name: "schedule_reminder",
    description:
      "Schedule something for later. This only saves it: Jarvis does it by itself at the chosen time " +
      "and sends the result to the user's Telegram, even if the server restarts, so do not do it now " +
      "and do not call send_telegram for it. Use it when the user says \"remind me\" or asks for " +
      "something to be done or said at a later time, and give either in_minutes or at. " +
      "When it returns, tell the user it is scheduled and for when (use the due time it returns).",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description:
            "For mode message: the message the user will read, short and complete on its own, e.g. " +
            "\"Call mom\". For mode task: the instruction to carry out at that time, e.g. " +
            "\"Check the weather in Pune and tell me if I need an umbrella\".",
        },
        mode: {
          type: "string",
          enum: ["message", "task"],
          description:
            "message (default): send the text as it is. task: at that time Jarvis carries out the " +
            "text as an instruction, using tools if needed (weather, search...), and sends the answer. " +
            "Use task only when something has to be looked up or worked out at that time.",
        },
        in_minutes: {
          type: "number",
          description: "Minutes from now, for relative requests like \"in 2 hours\" (120). Preferred over at.",
        },
        at: {
          type: "string",
          description:
            "For a clock time like \"at 6pm\": an ISO 8601 time with the UTC offset, e.g. 2026-11-12T18:00:00+05:30. " +
            "Work it out from the current time given in the system prompt.",
        },
      },
      required: ["text"],
    },
  },
};

export async function run({ text, mode = "message", at, in_minutes }) {
  if (typeof text !== "string" || !text.trim()) throw new Error("text is required");
  if (mode !== "message" && mode !== "task") throw new Error("mode must be message or task");
  if (text.length > config.telegram.maxMessageLength) {
    throw new Error(`text must be at most ${config.telegram.maxMessageLength} characters`);
  }
  const dueAt = in_minutes !== undefined ? Date.now() + Number(in_minutes) * 60_000 : new Date(at).getTime();
  if (Number.isNaN(dueAt)) {
    throw new Error("give in_minutes, or at as an ISO 8601 time, e.g. 2026-11-12T18:00:00+05:30");
  }
  if (dueAt <= Date.now()) throw new Error("the time must be in the future");

  addReminder(text.trim(), dueAt, mode);
  return { scheduled: true, due: formatTime(dueAt, { dateStyle: "medium", timeStyle: "short" }) };
}
