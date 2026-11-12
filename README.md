# Jarvis

A local chatbot that runs on your own Ollama models. It streams replies, remembers conversations, and can call tools (weather, Wikipedia and web search).

- **Server:** Deno + [Hono](https://hono.dev)
- **Client:** React + Vite
- **Storage:** SQLite (`data/jarvis.db`), built into Deno, no separate database to run
- **Models:** any model served by [Ollama](https://ollama.com)

## Requirements

- [Deno](https://deno.com) 2.x
- [Ollama](https://ollama.com) running on `localhost:11434`, with the models you want pulled (`ollama pull qwen3:8b`)

## Run

Two terminals, for development with live reload:

```sh
deno task server   # API on http://localhost:8000
deno task client   # UI on http://localhost:5173 (proxies /api to the server)
```

Or a single process that builds the client and serves everything:

```sh
deno task start    # http://localhost:8000
```

### Docker

Ollama stays on your machine; the container reaches it through `host.docker.internal`.

```sh
docker-compose up --build   # http://localhost:8000
```

Chats are kept in the `jarvis-data` volume.

## Configuration

Server settings (limits, timeouts, persona, tool URLs, router models) are all in `server/config.js`. Four of them can also be set with env vars:

| Setting      | Where                  | Default                  |
| ------------ | ---------------------- | ------------------------ |
| Ollama URL   | `OLLAMA_URL` env var   | `http://localhost:11434` |
| Memory model | `MEMORY_MODEL` env var | `qwen3:8b`               |
| SearXNG URL  | `SEARXNG_URL` env var  | `http://localhost:8080`  |
| Laya URL     | `LAYA_URL` env var     | `http://localhost:8100`  |
| Model list   | `client/src/models.js` | five models, edit freely |
| Database     | `server/main.js`       | `data/jarvis.db`         |

## Project layout

```
server/
  main.js              Hono app: mounts routes, serves the built client
  agent.js             streams the reply; runs tools and asks the model again
  ollama.js            streaming client for Ollama's /api/chat
  db.js                SQLite schema and queries
  routes/              /api/chat (stream) and /api/chats (list, get, delete)
  tools/               tools the model can call (see below)
  tests/               deno tests
client/src/
  App.jsx              layout: sidebar + chat
  api/                 fetch helpers (streaming chat, chat list)
  hooks/               useChat (open conversation), useChats (sidebar list)
  components/          ChatSidebar, ModelSelect, MessageList, Message, ChatInput
```

## How it works

1. The client sends `{ chatId?, model, content }` to `POST /api/chat`. The server owns the history, so a missing `chatId` creates a new chat.
2. The server loads the history from SQLite and asks Ollama for a reply, with the available tools attached.
3. If the model asks for a tool, the server runs it, adds the result to the conversation and asks again (up to 5 steps).
4. Events stream back as newline-delimited JSON: `chat`, `route`, `token`, `tool`, `error`. The client appends tokens as they arrive, and markdown is rendered in the reply.
5. Once the reply finishes, it is saved. A failed or aborted reply is not saved.

Only your messages and the final reply text are stored. Tool results are not, so the model calls a tool again if it needs the data in a later turn.

## Auto model choice

With **Auto** selected in the dropdown (the default), the server asks [Laya](https://huggingface.co/convaiinnovations/laya), a small decision model, how demanding the message is, on a 0 to 2 scale: chit-chat goes to `bonsai-2:2b` (low), general questions, writing and advice to `qwen3:8b` (medium), and code, debugging, math and technical analysis to `qwen3.6:35b` (high). Picking a model by hand skips Laya. The chosen model shows under each reply.

Laya runs as its own service (`systemOneModel/`, port 8100):

```sh
docker-compose up -d laya   # the first start downloads the model
curl localhost:8100/health
```

If Laya is down or slow (over 2s), the medium model answers. Only the latest message is classified, so a short follow-up such as "yes do it" counts as chit-chat. The models and the two cut-offs are in `server/config.js` (`router`).

## Tools

| Tool              | What it does                                                                 |
| ----------------- | ---------------------------------------------------------------------------- |
| `get_weather`     | Current weather, next 24 hours and 7-day forecast via [Open-Meteo](https://open-meteo.com) (no API key) |
| `search_wikipedia` | Short summaries of the best matching English Wikipedia articles              |
| `web_search`      | Web results (title, link, snippet) from a self-hosted [SearXNG](https://github.com/searxng/searxng); the model may pick a category. Start it with `docker-compose up -d searxng` (port 8080, stop any other container using it first) |

Every tool call is logged to the server console as `[tool] name called {...}`.

Not every Ollama model supports tool calling. If a model errors on every message, it probably doesn't.

### Add a tool

1. Create `server/tools/<name>/<tool>.js` exporting a `definition` (the JSON schema the model sees) and a `run(args)` function. Use `server/tools/fetchJson.js` for HTTP calls: it adds a timeout and readable errors.
2. Add it to the `tools` array in `server/tools/index.js`.
3. Add a test in `server/tests/`.

## API

| Method and path       | Purpose                                                    |
| --------------------- | ---------------------------------------------------------- |
| `POST /api/chat`      | Send a message, stream the reply (NDJSON)                  |
| `GET /api/chats`      | List chats, most recently active first                     |
| `GET /api/chats/:id`  | One chat with its messages                                 |
| `DELETE /api/chats/:id` | Delete a chat and its messages                           |
| `GET /api/usage`      | Lifetime token totals per model                            |
| `GET /api/health`     | Health check                                               |

## Tests

```sh
deno test -A server/tests
```

The tests stub `fetch`, so they need neither network access nor Ollama.
