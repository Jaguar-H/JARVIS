// The arc reactor logo: rings, a slowly turning dashed ring and a glowing core.
// Colours and motion come from index.css (.arc-*). large is used on the empty chat screen.
export default function ArcReactor({ large = false }) {
  return (
    <svg
      className={large ? "arc-reactor large" : "arc-reactor"}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <circle className="arc-ring" cx="50" cy="50" r="46" />
      <g className="arc-spin">
        <circle className="arc-dashes" cx="50" cy="50" r="36" />
      </g>
      <circle className="arc-ring" cx="50" cy="50" r="24" />
      <circle className="arc-core" cx="50" cy="50" r="12" />
    </svg>
  );
}
