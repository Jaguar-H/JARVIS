import { request } from "./http.js";

export const getUsage = async () => (await request("/api/usage")).json();
