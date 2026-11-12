import { useRef, useState } from "react";
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
  const abortRef = useRef(null);

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

  // Changes the last message (the reply being streamed) with a function of it.
  function updateReply(change) {
    setMessages((prev) =>
      prev.map((message, i) => (i === prev.length - 1 ? change(message) : message))
    );
  }

  // Drop the reply bubble if nothing arrived to fill it.
  function dropEmptyReply() {
    setMessages((prev) => (prev.at(-1)?.content === "" ? prev.slice(0, -1) : prev));
  }

  function fail(message) {
    setError(message);
    dropEmptyReply();
  }

  function handleEvent(event) {
    if (event.type === "chat") setChatId(event.chat.id);
    else if (event.type === "tool") updateReply((m) => ({ ...m, tool: event.name }));
    // A token means the tool is done and the model is answering.
    else if (event.type === "token") {
      updateReply((m) => ({ ...m, content: m.content + event.content, tool: null }));
    } else if (event.type === "error") fail(event.message);
  }

  async function send(content) {
    setMessages((prev) => [
      ...prev,
      { role: "user", content },
      { role: "assistant", content: "" },
    ]);
    setError(null);
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamChat({ chatId, model, content }, handleEvent, controller.signal);
    } catch (err) {
      // Stopping on purpose is not an error. The part already shown stays on screen.
      if (err.name === "AbortError") dropEmptyReply();
      else fail(err.message);
    } finally {
      abortRef.current = null;
      updateReply((m) => ({ ...m, tool: null }));
      setIsLoading(false);
      onSent();
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  return {
    chatId, model, setModel, messages, isLoading, error, open, startNew, send, stop,
  };
}
