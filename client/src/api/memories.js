import { request } from "./http.js";

export const listMemories = async () => (await request("/api/memories")).json();

export const deleteMemory = (id) => request(`/api/memories/${id}`, { method: "DELETE" });
