import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";
import { run } from "../tools/weather/getWeather.js";

const PLACE = { name: "Springfield", admin1: "Illinois", country: "United States", country_code: "US", latitude: 39.8, longitude: -89.6, timezone: "America/Chicago" };
const OTHER = { ...PLACE, admin1: "Missouri", latitude: 37.2, longitude: -93.3 };
const CANADA = { ...PLACE, country: "Canada", country_code: "CA" };

const FORECAST = {
  current: { time: "2026-11-06T22:15", temperature_2m: 10, apparent_temperature: 8, relative_humidity_2m: 50, precipitation: 0, weather_code: 3, wind_speed_10m: 12, is_day: 0 },
  hourly: {
    time: ["2026-11-06T21:00", "2026-11-06T22:00", "2026-11-06T23:00"],
    temperature_2m: [11, 10, 9],
    precipitation_probability: [0, 5, null],
  },
  daily: {
    time: ["2026-11-06"],
    weather_code: [3],
    temperature_2m_max: [14],
    temperature_2m_min: [null],
    precipitation_probability_max: [5],
  },
};

async function withFetch(handler, fn) {
  const original = globalThis.fetch;
  globalThis.fetch = (url) => Promise.resolve(handler(String(url)));
  try {
    return await fn();
  } finally {
    globalThis.fetch = original;
  }
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status });
const route = (geocoding) => (url) => json(url.includes("geocoding") ? geocoding : FORECAST);

Deno.test("returns structured weather and keeps missing values as null", () =>
  withFetch(route({ results: [PLACE] }), async () => {
    const result = await run({ city: "Springfield" });
    assertEquals(result.location.region, "Illinois");
    assertEquals(result.current.condition, "Overcast");
    assertEquals(result.current.isDay, false);
    assertEquals(result.nextHours.map((h) => h.time), ["2026-11-06T22:00", "2026-11-06T23:00"]);
    assertEquals(result.nextHours[1].precipitationProbabilityPercent, null);
    assertEquals(result.daily[0].minTempC, null);
    assert(!("otherMatches" in result));
  }));

Deno.test("reports other matches for ambiguous names and filters by country", () =>
  withFetch(route({ results: [PLACE, OTHER, CANADA] }), async () => {
    assertEquals((await run({ city: "Springfield" })).otherMatches.length, 2);
    const canadian = await run({ city: "Springfield", country: "ca" });
    assertEquals(canadian.location.country, "Canada");
  }));

Deno.test("rejects unknown places, empty input and service failures", async () => {
  await withFetch(route({}), async () => {
    await assertRejects(() => run({ city: "Nowhereville" }), Error, "No location found");
  });
  await withFetch(() => json({}, 500), async () => {
    await assertRejects(() => run({ city: "Delhi" }), Error, "(500)");
  });
  await assertRejects(() => run({ city: "  " }), Error, "city is required");
});
