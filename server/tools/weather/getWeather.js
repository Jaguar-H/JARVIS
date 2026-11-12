import { config } from "../../config.js";
import { fetchJson } from "../fetchJson.js";
import { describeWeatherCode } from "./weatherCodes.js";

const { geocodingUrl, forecastUrl, geocodeCount, hoursAhead, forecastDays } =
  config.tools.weather;
const SERVICE = "The weather service";

export const definition = {
  type: "function",
  function: {
    name: "get_weather",
    description:
      `Get the current weather, the next ${hoursAhead} hours and a ${forecastDays}-day forecast for a city. ` +
      "Pass only the city name. If several places share the name, use country to pick one.",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "City name only, e.g. Delhi" },
        country: {
          type: "string",
          description: "Optional country name or 2-letter code, e.g. India or IN",
        },
      },
      required: ["city"],
    },
  },
};

export async function run({ city, country }) {
  if (typeof city !== "string" || !city.trim()) {
    throw new Error("city is required");
  }

  const { location, otherMatches } = await findLocation(city.trim(), country);
  const forecast = await fetchForecast(location);

  return {
    location: describeLocation(location),
    ...(otherMatches.length && { otherMatches: otherMatches.map(describeLocation) }),
    ...forecast,
  };
}

function matchesCountry(place, country) {
  const wanted = country.trim().toLowerCase();
  return (
    place.country?.toLowerCase() === wanted ||
    place.country_code?.toLowerCase() === wanted
  );
}

async function findLocation(city, country) {
  const { results = [] } = await fetchJson(SERVICE, geocodingUrl, {
    name: city,
    count: geocodeCount,
    language: "en",
    format: "json",
  });

  const matches = country ? results.filter((place) => matchesCountry(place, country)) : results;
  if (!matches.length) {
    const where = country ? `${city}, ${country}` : city;
    throw new Error(`No location found for "${where}"`);
  }
  return { location: matches[0], otherMatches: matches.slice(1) };
}

function describeLocation(place) {
  return {
    name: place.name,
    region: place.admin1 ?? null,
    country: place.country ?? null,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone ?? null,
  };
}

async function fetchForecast({ latitude, longitude }) {
  const data = await fetchJson(SERVICE, forecastUrl, {
    latitude,
    longitude,
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    hourly: "precipitation_probability,temperature_2m",
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    temperature_unit: "celsius",
    wind_speed_unit: "kmh",
    timezone: "auto",
    forecast_days: forecastDays,
  });

  if (!data.current || !data.hourly || !data.daily) {
    throw new Error("The weather service returned incomplete data");
  }
  return {
    current: shapeCurrent(data.current),
    nextHours: shapeHourly(data.hourly, data.current.time),
    daily: shapeDaily(data.daily),
  };
}

function shapeCurrent(current) {
  return {
    time: current.time,
    condition: describeWeatherCode(current.weather_code),
    temperatureC: current.temperature_2m,
    feelsLikeC: current.apparent_temperature,
    humidityPercent: current.relative_humidity_2m,
    precipitationMm: current.precipitation,
    windSpeedKmh: current.wind_speed_10m,
    isDay: current.is_day == null ? null : current.is_day === 1,
  };
}

// Open-Meteo returns local times ("2026-11-06T22:00"), so comparing the hour prefix as text is safe.
function shapeHourly(hourly, currentTime) {
  const currentHour = currentTime.slice(0, 13);
  const start = Math.max(0, hourly.time.findIndex((time) => time.slice(0, 13) >= currentHour));

  return hourly.time.slice(start, start + hoursAhead).map((time, offset) => ({
    time,
    temperatureC: hourly.temperature_2m[start + offset],
    precipitationProbabilityPercent: hourly.precipitation_probability[start + offset],
  }));
}

function shapeDaily(daily) {
  return daily.time.map((date, i) => ({
    date,
    condition: describeWeatherCode(daily.weather_code[i]),
    maxTempC: daily.temperature_2m_max[i],
    minTempC: daily.temperature_2m_min[i],
    precipitationProbabilityMaxPercent: daily.precipitation_probability_max[i],
  }));
}
