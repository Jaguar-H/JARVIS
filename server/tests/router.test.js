import { assertEquals } from "jsr:@std/assert@1";
import { pickModel } from "../router.js";
import { config } from "../config.js";

const { lowBelow, highFrom, lowModel, mediumModel, highModel } = config.router;

// Replaces fetch with one that returns the given response (or throws) and records the request.
async function withLaya(respond, fn) {
  const original = globalThis.fetch;
  const requests = [];
  globalThis.fetch = (url, init) => {
    requests.push({ url, body: JSON.parse(init.body) });
    return respond();
  };
  try {
    return await fn(requests);
  } finally {
    globalThis.fetch = original;
  }
}

const score = (value) => () =>
  Promise.resolve(Response.json({ answers: { kind: { type: "score", score: value } } }));

Deno.test("sends the message to Laya as a three-way score question", () =>
  withLaya(score(1), async (requests) => {
    await pickModel("explain tides");
    assertEquals(requests[0].url.endsWith("/predict"), true);
    assertEquals(requests[0].body.state, { message: "explain tides" });
    assertEquals(requests[0].body.questions.kind.type, "score");
    assertEquals(requests[0].body.questions.kind.criteria.length, 3);
  }));

Deno.test("maps the score to the low, medium or high model, cut-offs included", async () => {
  const cases = [
    [0, lowModel],
    [lowBelow - 0.01, lowModel],
    [lowBelow, mediumModel],
    [highFrom - 0.01, mediumModel],
    [highFrom, highModel],
    [2, highModel],
  ];
  for (const [value, expected] of cases) {
    await withLaya(score(value), async () => {
      assertEquals(await pickModel("x"), expected, `score ${value}`);
    });
  }
});

Deno.test("falls back to the medium model, without throwing, when Laya fails", async () => {
  const failures = [
    () => Promise.reject(new Error("connection refused")),
    () => Promise.resolve(new Response("{}", { status: 500 })),
    () => Promise.resolve(Response.json({})),
    () => Promise.resolve(Response.json({ answers: { kind: { score: "high" } } })),
  ];
  for (const failure of failures) {
    await withLaya(failure, async () => {
      assertEquals(await pickModel("write a parser"), mediumModel);
    });
  }
});
