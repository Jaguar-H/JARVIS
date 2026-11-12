import { useId } from "react";

// Tick marks around the outer ring, every 15 degrees.
const TICKS = Array.from({ length: 24 }, (_, i) => i * 15);

// The arc reactor logo: metal housing, tick marks, a segmented ring that turns slowly,
// and a glowing core. Motion is in index.css (.arc-spin, .arc-core). large is used on the empty chat screen.
export default function ArcReactor({ large = false }) {
  // Gradient and filter ids must be unique on the page, so each reactor gets its own.
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");

  return (
    <svg
      className={large ? "arc-reactor large" : "arc-reactor"}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0.6" stopColor="#ff9a1f" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ff9a1f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a7560" />
          <stop offset="0.5" stopColor="#2a1d12" />
          <stop offset="1" stopColor="#b09478" />
        </linearGradient>
        <radialGradient id={`${id}-core`}>
          <stop offset="0" stopColor="#fffdf2" />
          <stop offset="0.35" stopColor="#ffd27a" />
          <stop offset="0.7" stopColor="#ff9a1f" />
          <stop offset="1" stopColor="#ff6a00" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-blur`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>

      {/* Soft halo behind the whole reactor */}
      <circle cx="50" cy="50" r="50" fill={`url(#${id}-halo)`} />

      {/* Metal housing with a thin bright rim */}
      <circle cx="50" cy="50" r="46" fill="none" stroke={`url(#${id}-metal)`} strokeWidth="4" />
      <circle cx="50" cy="50" r="43.5" fill="none" stroke="#ffb020" strokeWidth="0.6" opacity="0.8" />

      {TICKS.map((angle) => (
        <line
          key={angle}
          x1="50" y1="5" x2="50" y2="8.5"
          stroke="#ffb020" strokeWidth="0.8" opacity="0.6"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}

      {/* Segmented ring that turns slowly */}
      <g className="arc-spin">
        <circle
          cx="50" cy="50" r="34"
          fill="none" stroke="#ffb020" strokeWidth="5"
          strokeDasharray="28 7.6" opacity="0.85"
        />
      </g>
      <circle cx="50" cy="50" r="25" fill="none" stroke="#ffb020" strokeWidth="1" opacity="0.6" />

      {/* Glowing core: a blurred copy under a sharp one, with a bright centre */}
      <circle className="arc-core" cx="50" cy="50" r="14" fill={`url(#${id}-core)`} filter={`url(#${id}-blur)`} />
      <circle className="arc-core" cx="50" cy="50" r="12" fill={`url(#${id}-core)`} />
      <circle cx="50" cy="50" r="5" fill="#fffdf2" />
    </svg>
  );
}
