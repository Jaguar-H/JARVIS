import { DatabaseSync } from "node:sqlite";

const TITLE_LENGTH = 50;

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

  return {
    // The chat is titled with the start of its first message.
    createChat(firstMessage, model) {
      const title = firstMessage.trim().slice(0, TITLE_LENGTH);
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
  };
}
