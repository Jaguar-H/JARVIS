import { useState } from "react";
import { useChat } from "./hooks/useChat.js";
import { useChats } from "./hooks/useChats.js";
import { useMemories } from "./hooks/useMemories.js";
import { useUsage } from "./hooks/useUsage.js";
import ChatSidebar from "./components/ChatSidebar.jsx";
import MemoryPanel from "./components/MemoryPanel.jsx";
import UsageLine from "./components/UsageLine.jsx";
import ModelSelect from "./components/ModelSelect.jsx";
import MessageList from "./components/MessageList.jsx";
import ChatInput from "./components/ChatInput.jsx";
import ArcReactor from "./components/ArcReactor.jsx";

const MEMORY_REFRESH_DELAY_MS = 3000;

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { chats, error: chatsError, refresh: refreshChats, remove } = useChats();
  const { memories, error: memoriesError, refresh: refreshMemories, remove: forget } =
    useMemories();
  const { models: usage, refresh: refreshUsage } = useUsage();
  const { chatId, model, setModel, messages, isLoading, error, open, startNew, send, stop } =
    useChat({ onSent: handleSent });

  function handleSent() {
    refreshChats();
    refreshMemories();
    refreshUsage();
    // The server learns from a message after its reply ends, so check again shortly.
    setTimeout(() => {
      refreshMemories();
      refreshUsage();
    }, MEMORY_REFRESH_DELAY_MS);
  }

  async function handleDelete(id) {
    await remove(id);
    if (id === chatId) startNew();
  }

  return (
    <div className="app">
      <ChatSidebar
        chats={chats}
        selectedId={chatId}
        error={chatsError}
        disabled={isLoading}
        collapsed={!sidebarOpen}
        onSelect={open}
        onNew={startNew}
        onDelete={handleDelete}
      >
        <MemoryPanel memories={memories} error={memoriesError} onDelete={forget} />
        <UsageLine models={usage} />
      </ChatSidebar>
      <main className="chat">
        <header className="chat-header">
          <button
            className="icon-button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            ☰
          </button>
          <div className="brand">
            <ArcReactor />
            <h1 className="wordmark">JARVIS</h1>
          </div>
          <ModelSelect value={model} onChange={setModel} disabled={isLoading} />
        </header>
        {/* The key resets the scroll position when you switch chats. */}
        <MessageList key={chatId ?? "new"} messages={messages} onPrompt={send} />
        {error && <p className="chat-error">{error}</p>}
        <ChatInput onSend={send} onStop={stop} isLoading={isLoading} />
      </main>
    </div>
  );
}
