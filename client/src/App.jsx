import { useChat } from "./hooks/useChat.js";
import { useChats } from "./hooks/useChats.js";
import ChatSidebar from "./components/ChatSidebar.jsx";
import ModelSelect from "./components/ModelSelect.jsx";
import MessageList from "./components/MessageList.jsx";
import ChatInput from "./components/ChatInput.jsx";

export default function App() {
  const { chats, error: chatsError, refresh, remove } = useChats();
  const { chatId, model, setModel, messages, isLoading, error, open, startNew, send } =
    useChat({ onSent: refresh });

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
      />
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
