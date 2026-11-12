import { config } from "../config.js";

const { timeoutMs, userAgent } = config.tools;
const HEADERS = { "User-Agent": userAgent };

// service: a readable name used in error messages, e.g. "The weather service".
export async function fetchJson(service, url, params) {
  let response;
  try {
    response = await fetch(`${url}?${new URLSearchParams(params)}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    console.log(error);

    throw new Error(
      error.name === "TimeoutError" ? `${service} timed out` : `Could not reach ${service}`,
    );
  }
  if (!response.ok) throw new Error(`${service} returned an error (${response.status})`);
  return response.json();
}
