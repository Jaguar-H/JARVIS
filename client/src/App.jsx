import { useState } from "react";
import { useChat } from "./hooks/useChat.js";
import { useChats } from "./hooks/useChats.js";
import { useMemories } from "./hooks/useMemories.js";
import { useUsage } from "./hooks/useUsage.js";
import { useHealth } from "./hooks/useHealth.js";
import ChatSidebar from "./components/ChatSidebar.jsx";
import MemoryPanel from "./components/MemoryPanel.jsx";
import UsageLine from "./components/UsageLine.jsx";
import ModelSelect from "./components/ModelSelect.jsx";
import MessageList from "./components/MessageList.jsx";
import ChatInput from "./components/ChatInput.jsx";
import ArcReactor from "./components/ArcReactor.jsx";
import StatusDot from "./components/StatusDot.jsx";

const MEMORY_REFRESH_DELAY_MS = 3000;

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const health = useHealth();
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
          {/* Sidebar toggle */}
          <button
            className="icon-button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1" y="3" width="14" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="1" y="7.25" width="9" height="1.5" rx="0.75" fill="currentColor"/>
              <rect x="1" y="11.5" width="14" height="1.5" rx="0.75" fill="currentColor"/>
            </svg>
          </button>

          {/* Brand */}
          <div className="brand">
            <ArcReactor />
            <div className="brand-text">
              <h1 className="wordmark">JARVIS</h1>
              <span className="wordmark-sub">Just A Rather Very Intelligent System</span>
            </div>
            <StatusDot health={health} isLoading={isLoading} />
          </div>

          {/* Model selector */}
          <ModelSelect value={model} onChange={setModel} disabled={isLoading} />
        </header>

        {/* Chat body — scrollable area + input, centered at max-width */}
        <div className="chat-body">
          {/* The key resets scroll position when switching chats */}
          <MessageList key={chatId ?? "new"} messages={messages} onPrompt={send} />
          {error && <p className="chat-error">{error}</p>}
          <ChatInput onSend={send} onStop={stop} isLoading={isLoading} />
        </div>
      </main>
    </div>
  );
}
