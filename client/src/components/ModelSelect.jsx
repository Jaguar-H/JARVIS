import { AUTO, MODELS } from "../models.js";

export default function ModelSelect({ value, onChange, disabled }) {
  return (
    <select
      className="model-select"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      aria-label="Model"
    >
      <option value={AUTO}>Auto</option>
      {MODELS.map((model) => (
        <option key={model} value={model}>{model}</option>
      ))}
    </select>
  );
}
