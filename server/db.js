import { DatabaseSync } from "node:sqlite";
import { config } from "./config.js";

// Rows from node:sqlite have a null prototype; copy them into plain objects.
const plain = (row) => ({ ...row });

export function openDb(path) {
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS chats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      model TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fact TEXT NOT NULL UNIQUE COLLATE NOCASE
    );
    CREATE TABLE IF NOT EXISTS usage (
      model TEXT PRIMARY KEY,
      prompt_tokens INTEGER NOT NULL DEFAULT 0,
      completion_tokens INTEGER NOT NULL DEFAULT 0
    );
  `);

  const insertChat = db.prepare("INSERT INTO chats (title, model) VALUES (?, ?)");

  // Most recently active first: chats are ordered by their newest message.
  const selectChats = db.prepare(`
    SELECT id, title, model FROM chats
    ORDER BY (SELECT MAX(id) FROM messages WHERE chat_id = chats.id) DESC, id DESC
  `);
  const selectChat = db.prepare("SELECT id, title, model FROM chats WHERE id = ?");
  const selectMessages = db.prepare(
    "SELECT role, content FROM messages WHERE chat_id = ? ORDER BY id",
  );
  const insertMessage = db.prepare(
    "INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)",
  );
  const updateModel = db.prepare("UPDATE chats SET model = ? WHERE id = ?");
  const removeChat = db.prepare("DELETE FROM chats WHERE id = ?");
  const selectMemories = db.prepare("SELECT id, fact FROM memories ORDER BY id");
  // The UNIQUE column makes this skip facts that are already saved, ignoring case.
  const insertMemory = db.prepare("INSERT OR IGNORE INTO memories (fact) VALUES (?)");
  const removeMemory = db.prepare("DELETE FROM memories WHERE id = ?");
  const upsertUsage = db.prepare(`
    INSERT INTO usage (model, prompt_tokens, completion_tokens) VALUES (?, ?, ?)
    ON CONFLICT(model) DO UPDATE SET
      prompt_tokens = prompt_tokens + excluded.prompt_tokens,
      completion_tokens = completion_tokens + excluded.completion_tokens
  `);
  const selectUsage = db.prepare(
    "SELECT model, prompt_tokens, completion_tokens FROM usage ORDER BY model",
  );

  return {
    // The chat is titled with the start of its first message.
    createChat(firstMessage, model) {
      const title = firstMessage.trim().slice(0, config.chat.titleLength);
      const { lastInsertRowid } = insertChat.run(title, model);
      return { id: Number(lastInsertRowid), title, model };
    },

    listChats: () => selectChats.all().map(plain),

    getChat(id) {
      const chat = selectChat.get(id);
      return chat ? { ...plain(chat), messages: this.getMessages(id) } : null;
    },

    getMessages: (chatId) => selectMessages.all(chatId).map(plain),

    addMessage: (chatId, role, content) => insertMessage.run(chatId, role, content),

    setModel: (chatId, model) => updateModel.run(model, chatId),

    deleteChat: (id) => removeChat.run(id).changes > 0,

    listMemories: () => selectMemories.all().map(plain),

    // Returns false when the fact was already saved.
    addMemory: (fact) => insertMemory.run(fact).changes > 0,

    deleteMemory: (id) => removeMemory.run(id).changes > 0,

    // Lifetime token totals per model, added up as Ollama reports them.
    addUsage: (model, promptTokens, completionTokens) =>
      upsertUsage.run(model, promptTokens, completionTokens),

    listUsage: () => selectUsage.all().map(plain),
  };
}
