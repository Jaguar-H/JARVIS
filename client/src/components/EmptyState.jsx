import ArcReactor from "./ArcReactor.jsx";

const STARTERS = [
  "What's the weather like today?",
  "What's in the news?",
  "What do you remember about me?",
];

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

// Shown in an empty chat. Each starter sends its text as a message.
export default function EmptyState({ onPrompt }) {
  return (
    <div className="empty">
      <ArcReactor large />
      <h2>{greeting()}. How can I help?</h2>
      <div className="starters">
        {STARTERS.map((prompt) => (
          <button key={prompt} className="starter" onClick={() => onPrompt(prompt)}>
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
