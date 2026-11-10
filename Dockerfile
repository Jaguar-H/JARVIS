FROM denoland/deno:2.8.3

WORKDIR /app
COPY . .

# Build the React client, then cache the server's dependencies.
RUN deno task build && deno cache server/main.js

# SQLite lives in /app/data; make it writable for the non-root deno user.
RUN mkdir -p data && chown deno:deno data
USER deno

EXPOSE 8000
CMD ["run", "--allow-net", "--allow-read", "--allow-write=data", "--allow-env", "server/main.js"]
