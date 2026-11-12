import { useId } from "react";

// Tick marks every 15° around the outer ring
const TICKS = Array.from({ length: 24 }, (_, i) => i * 15);
// Inner hex-style segments every 60°
const HEX_TICKS = Array.from({ length: 6 }, (_, i) => i * 60);

/**
 * Golden amber Arc Reactor — JARVIS Mark I / original Iron Man feel.
 * Uses three concentric animated rings, tick marks, and a bright glowing core.
 * `large` renders the full 10rem version on the empty-state screen.
 */
export default function ArcReactor({ large = false }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");

  return (
    <svg
      className={large ? "arc-reactor large" : "arc-reactor"}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <defs>
        {/* Warm amber halo */}
        <radialGradient id={`${id}-halo`}>
          <stop offset="0.4" stopColor="#ffb020" stopOpacity="0.20" />
          <stop offset="0.75" stopColor="#ff7700" stopOpacity="0.07" />
          <stop offset="1"   stopColor="#ff4400" stopOpacity="0" />
        </radialGradient>

        {/* Metal housing — warm bronze/steel */}
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0"   stopColor="#6a4a1e" />
          <stop offset="0.4" stopColor="#1c1208" />
          <stop offset="1"   stopColor="#9a7030" />
        </linearGradient>

        {/* Core radial — white hot centre bleeding to deep amber */}
        <radialGradient id={`${id}-core`}>
          <stop offset="0"    stopColor="#ffffff" />
          <stop offset="0.2"  stopColor="#fff0c0" />
          <stop offset="0.5"  stopColor="#ffb020" />
          <stop offset="0.75" stopColor="#ff7700" />
          <stop offset="1"    stopColor="#ff4400" stopOpacity="0" />
        </radialGradient>

        {/* Outer ring sweep */}
        <linearGradient id={`${id}-ring`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0"   stopColor="#ffb020" />
          <stop offset="0.5" stopColor="#ff8800" />
          <stop offset="1"   stopColor="#ffb020" />
        </linearGradient>

        {/* Blur for core glow */}
        <filter id={`${id}-blur`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
      </defs>

      {/* Ambient halo */}
      <circle cx="50" cy="50" r="50" fill={`url(#${id}-halo)`} />

      {/* Metal housing */}
      <circle cx="50" cy="50" r="47" fill="none" stroke={`url(#${id}-metal)`} strokeWidth="4" />
      {/* Bright amber rim */}
      <circle cx="50" cy="50" r="44.5" fill="none" stroke="#ffb020" strokeWidth="0.5" opacity="0.75" />

      {/* Outer tick marks */}
      {TICKS.map((angle) => (
        <line
          key={angle}
          x1="50" y1="4" x2="50" y2={angle % 90 === 0 ? "9" : "7"}
          stroke="#ffb020"
          strokeWidth={angle % 90 === 0 ? "1" : "0.6"}
          opacity={angle % 90 === 0 ? "0.9" : "0.45"}
          transform={`rotate(${angle} 50 50)`}
        />
      ))}

      {/* Outer spinning segmented ring */}
      <g className="arc-spin">
        <circle
          cx="50" cy="50" r="36"
          fill="none"
          stroke={`url(#${id}-ring)`}
          strokeWidth="4.5"
          strokeDasharray="22 7"
          opacity="0.9"
        />
      </g>

      {/* Counter-rotating inner dashed ring */}
      <g className="arc-spin-rev">
        <circle
          cx="50" cy="50" r="27"
          fill="none"
          stroke="#ff8800"
          strokeWidth="1.5"
          strokeDasharray="10 4"
          opacity="0.55"
        />
      </g>

      {/* Static inner accent ring */}
      <circle cx="50" cy="50" r="22" fill="none" stroke="#ffb020" strokeWidth="0.6" opacity="0.4" />

      {/* Inner hex tick marks */}
      {HEX_TICKS.map((angle) => (
        <line
          key={angle}
          x1="50" y1="30" x2="50" y2="33"
          stroke="#ffb020"
          strokeWidth="0.8"
          opacity="0.5"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}

      {/* Core bloom (blurred glow layer) */}
      <circle
        className="arc-core"
        cx="50" cy="50" r="15"
        fill={`url(#${id}-core)`}
        filter={`url(#${id}-blur)`}
      />
      {/* Core crisp layer */}
      <circle
        className="arc-core"
        cx="50" cy="50" r="12"
        fill={`url(#${id}-core)`}
      />
      {/* Bright white-hot centre */}
      <circle cx="50" cy="50" r="4" fill="#ffffff" opacity="0.95" />
      <circle cx="50" cy="50" r="1.5" fill="#fff5cc" />
    </svg>
  );
}
