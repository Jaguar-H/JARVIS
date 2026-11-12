/**
 * HUD status indicator driven by the real /api/health result.
 *
 * health:   "checking" | "online" | "offline"
 * isLoading: true while JARVIS is generating a reply
 *
 * Visual states:
 *   checking   → dim grey, slow pulse         "Connecting"
 *   online      → cyan pulse                   "Online"
 *   online+busy → amber rapid pulse            "Processing"
 *   offline     → red, no animation            "Offline"
 */
export default function StatusDot({ health, isLoading }) {
  let dotClass = "status-dot";
  let label = "Connecting";

  if (health === "offline") {
    dotClass += " status-dot--offline";
    label = "Offline";
  } else if (health === "online" && isLoading) {
    dotClass += " status-dot--processing";
    label = "Processing";
  } else if (health === "online") {
    dotClass += " status-dot--online";
    label = "Online";
  } else {
    // "checking"
    dotClass += " status-dot--checking";
  }

  return (
    <div
      className="status-dot-wrapper"
      aria-live="polite"
      aria-label={`System status: ${label}`}
      title={`System: ${label}`}
    >
      <span className={dotClass} />
      <span className="status-label">{label}</span>
    </div>
  );
}
