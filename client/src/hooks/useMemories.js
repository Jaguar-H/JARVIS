import { useCallback, useEffect, useState } from "react";
import { deleteMemory, listMemories } from "../api/memories.js";

// The facts Jarvis has learned about the user, shown in the sidebar.
export function useMemories() {
  const [memories, setMemories] = useState([]);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setMemories(await listMemories());
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function remove(id) {
    try {
      await deleteMemory(id);
    } catch (err) {
      setError(err.message);
      return;
    }
    await refresh();
  }

  return { memories, error, refresh, remove };
}
