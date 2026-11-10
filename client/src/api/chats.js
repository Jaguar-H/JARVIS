import { request } from "./http.js";

export const listChats = async () => (await request("/api/chats")).json();

export const getChat = async (id) => (await request(`/api/chats/${id}`)).json();

export const deleteChat = (id) => request(`/api/chats/${id}`, { method: "DELETE" });
