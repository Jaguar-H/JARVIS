import { useState } from "react";

export default function MemoryPanel({ memories, error, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="memory">
      <button className="memory-toggle" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
        <span>Memory ({memories.length})</span>
        <span>{isOpen ? "▾" : "▸"}</span>
      </button>
      {isOpen && (
        <>
          {error && <p className="chat-error">{error}</p>}
          {memories.length === 0 ? (
            <p className="memory-empty">Nothing yet. Jarvis learns about you as you chat.</p>
          ) : (
            <ul className="memory-list">
              {memories.map((memory) => (
                <li key={memory.id} className="memory-item">
                  <span>{memory.fact}</span>
                  <button
                    className="sidebar-delete"
                    onClick={() => onDelete(memory.id)}
                    aria-label={`Forget: ${memory.fact}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
