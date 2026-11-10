import { useCallback, useEffect, useState } from "react";
import { deleteChat, listChats } from "../api/chats.js";

// The list of saved chats shown in the sidebar.
export function useChats() {
  const [chats, setChats] = useState([]);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setChats(await listChats());
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
      await deleteChat(id);
    } catch (err) {
      setError(err.message);
      return;
    }
    await refresh();
  }

  return { chats, error, refresh, remove };
}
