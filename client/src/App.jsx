import { useChat } from "./hooks/useChat.js";
import { useChats } from "./hooks/useChats.js";
import { useMemories } from "./hooks/useMemories.js";
import ChatSidebar from "./components/ChatSidebar.jsx";
import MemoryPanel from "./components/MemoryPanel.jsx";
import ModelSelect from "./components/ModelSelect.jsx";
import MessageList from "./components/MessageList.jsx";
import ChatInput from "./components/ChatInput.jsx";

const MEMORY_REFRESH_DELAY_MS = 3000;

export default function App() {
  const { chats, error: chatsError, refresh: refreshChats, remove } = useChats();
  const { memories, error: memoriesError, refresh: refreshMemories, remove: forget } =
    useMemories();
  const { chatId, model, setModel, messages, isLoading, error, open, startNew, send } =
    useChat({ onSent: handleSent });

  function handleSent() {
    refreshChats();
    refreshMemories();
    // The server learns from a message after its reply ends, so check again shortly.
    setTimeout(refreshMemories, MEMORY_REFRESH_DELAY_MS);
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
        onSelect={open}
        onNew={startNew}
        onDelete={handleDelete}
      >
        <MemoryPanel memories={memories} error={memoriesError} onDelete={forget} />
      </ChatSidebar>
      <main className="chat">
        <header className="chat-header">
          <ModelSelect value={model} onChange={setModel} disabled={isLoading} />
        </header>
        <MessageList messages={messages} />
        {error && <p className="chat-error">{error}</p>}
        <ChatInput onSend={send} disabled={isLoading} />
      </main>
    </div>
  );
}
