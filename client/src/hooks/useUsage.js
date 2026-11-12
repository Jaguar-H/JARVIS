import { useCallback, useEffect, useState } from "react";
import { getUsage } from "../api/usage.js";

// Lifetime token totals per model: [{ model, prompt_tokens, completion_tokens }].
export function useUsage() {
  const [models, setModels] = useState([]);

  const refresh = useCallback(async () => {
    try {
      setModels((await getUsage()).models);
    } catch {
      // The counter is optional; keep showing the last numbers.
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { models, refresh };
}
