// fetch that throws an Error with the server's message when the response is not ok.
export async function request(url, options) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? `Request failed (${response.status})`);
  }
  return response;
}
