const TIMEOUT_MS = 8000;
const HEADERS = { "User-Agent": "jarvis-chatbot/0.1 (local project)" };

// service: a readable name used in error messages, e.g. "The weather service".
export async function fetchJson(service, url, params) {
  let response;
  try {
    response = await fetch(`${url}?${new URLSearchParams(params)}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(
      error.name === "TimeoutError" ? `${service} timed out` : `Could not reach ${service}`,
    );
  }
  if (!response.ok) throw new Error(`${service} returned an error (${response.status})`);
  return response.json();
}
