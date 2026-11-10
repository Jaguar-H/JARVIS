import { useState } from "react";
import { streamChat } from "../api/chat.js";
import { getChat } from "../api/chats.js";
import { MODELS } from "../models.js";

// The open conversation. onSent runs after every message so the chat list can refresh.
export function useChat({ onSent }) {
  const [chatId, setChatId] = useState(null);
  const [model, setModel] = useState(MODELS[0]);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function open(id) {
    setError(null);
    try {
      const chat = await getChat(id);
      setChatId(chat.id);
      setModel(chat.model);
      setMessages(chat.messages);
    } catch (err) {
      setError(err.message);
    }
  }

  function startNew() {
    setChatId(null);
    setMessages([]);
    setError(null);
  }

  function appendToReply(text) {
    setMessages((prev) =>
      prev.map((message, i) =>
        i === prev.length - 1 ? { ...message, content: message.content + text } : message
      )
    );
  }

  function fail(message) {
    setError(message);
    // Drop the reply bubble if nothing arrived to fill it.
    setMessages((prev) => (prev.at(-1)?.content === "" ? prev.slice(0, -1) : prev));
  }

  function handleEvent(event) {
    if (event.type === "chat") setChatId(event.chat.id);
    else if (event.type === "token") appendToReply(event.content);
    else if (event.type === "error") fail(event.message);
  }

  async function send(content) {
    setMessages((prev) => [
      ...prev,
      { role: "user", content },
      { role: "assistant", content: "" },
    ]);
    setError(null);
    setIsLoading(true);

    try {
      await streamChat({ chatId, model, content }, handleEvent);
    } catch (err) {
      fail(err.message);
    } finally {
      setIsLoading(false);
      onSent();
    }
  }

  return { chatId, model, setModel, messages, isLoading, error, open, startNew, send };
}
