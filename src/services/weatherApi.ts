// ============================================================
// TrafficConnect SA - Weather API
// File: src/services/weatherApi.ts
// ============================================================
//
// Uses Open-Meteo.
// No API key required.
// Works with React Native Web / Expo.
// Pretoria coordinates are used by default.
//
// ============================================================

const PRETORIA_LATITUDE = -25.7479;
const PRETORIA_LONGITUDE = 28.2293;

const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";

// ============================================================
// TYPES
// ============================================================

export type WeatherCondition =
  | "clear"
  | "partly_cloudy"
  | "cloudy"
  | "fog"
  | "rain"
  | "heavy_rain"
  | "snow"
  | "thunderstorm"
  | "unknown";

export type CurrentWeather = {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  visibility: number;
  precipitation: number;
  rain: number;
  showers: number;
  weatherCode: number;
  condition: WeatherCondition;
  isDay: boolean;
};

export type HourlyWeather = {
  time: string;
  temperature: number;
  apparentTemperature: number;
  precipitationProbability: number;
  precipitation: number;
  rain: number;
  showers: number;
  windSpeed: number;
  weatherCode: number;
  condition: WeatherCondition;
};

export type DailyWeather = {
  date: string;
  maxTemperature: number;
  minTemperature: number;
  precipitationProbability: number;
  precipitationSum: number;
  windSpeed: number;
  weatherCode: number;
  condition: WeatherCondition;
  sunrise: string;
  sunset: string;
};

export type WeatherData = {
  location: {
    name: string;
    latitude: number;
    longitude: number;
  };

  current: CurrentWeather;

  hourly: HourlyWeather[];

  daily: DailyWeather[];

  fetchedAt: string;
};

// ============================================================
// WEATHER CODE → CONDITION
// Open-Meteo WMO weather interpretation codes
// ============================================================

export const getWeatherCondition = (
  weatherCode: number
): WeatherCondition => {
  switch (weatherCode) {
    // Clear
    case 0:
      return "clear";

    // Mainly clear / partly cloudy
    case 1:
      return "clear";

    case 2:
      return "partly_cloudy";

    // Overcast
    case 3:
      return "cloudy";

    // Fog
    case 45:
    case 48:
      return "fog";

    // Drizzle
    case 51:
    case 53:
    case 55:
    case 56:
    case 57:
      return "rain";

    // Rain
    case 61:
    case 63:
    case 65:
    case 66:
    case 67:
      return weatherCode >= 65 ? "heavy_rain" : "rain";

    // Snow
    case 71:
    case 73:
    case 75:
    case 77:
      return "snow";

    // Rain showers
    case 80:
    case 81:
    case 82:
      return weatherCode === 82 ? "heavy_rain" : "rain";

    // Thunderstorms
    case 95:
    case 96:
    case 99:
      return "thunderstorm";

    default:
      return "unknown";
  }
};

// ============================================================
// HUMAN-READABLE WEATHER NAME
// ============================================================

export const getWeatherLabel = (
  condition: WeatherCondition
): string => {
  switch (condition) {
    case "clear":
      return "Clear";

    case "partly_cloudy":
      return "Partly cloudy";

    case "cloudy":
      return "Cloudy";

    case "fog":
      return "Foggy";

    case "rain":
      return "Rain";

    case "heavy_rain":
      return "Heavy rain";

    case "snow":
      return "Snow";

    case "thunderstorm":
      return "Thunderstorm";

    default:
      return "Weather unavailable";
  }
};

// ============================================================
// MAIN WEATHER FETCH
// ============================================================

export const getWeather = async (
  latitude: number = PRETORIA_LATITUDE,
  longitude: number = PRETORIA_LONGITUDE
): Promise<WeatherData> => {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),

    // Current weather
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature," +
      "precipitation,rain,showers,weather_code,wind_speed_10m," +
      "wind_direction_10m,visibility,is_day",

    // Hourly forecast
    hourly:
      "temperature_2m,apparent_temperature," +
      "precipitation_probability,precipitation,rain,showers," +
      "weather_code,wind_speed_10m",

    // Daily forecast
    daily:
      "weather_code,temperature_2m_max,temperature_2m_min," +
      "precipitation_probability_max,precipitation_sum," +
      "wind_speed_10m_max,sunrise,sunset",

    timezone: "Africa/Johannesburg",

    forecast_days: "7",
  });

  const response = await fetch(
    `${WEATHER_API_URL}?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error(
      `Weather API request failed: ${response.status}`
    );
  }

  const data = await response.json();

  // ==========================================================
  // CURRENT WEATHER
  // ==========================================================

  const current: CurrentWeather = {
    temperature: Number(data.current.temperature_2m),

    apparentTemperature: Number(
      data.current.apparent_temperature
    ),

    humidity: Number(
      data.current.relative_humidity_2m
    ),

    windSpeed: Number(
      data.current.wind_speed_10m
    ),

    windDirection: Number(
      data.current.wind_direction_10m
    ),

    visibility: Number(
      data.current.visibility
    ),

    precipitation: Number(
      data.current.precipitation
    ),

    rain: Number(
      data.current.rain
    ),

    showers: Number(
      data.current.showers
    ),

    weatherCode: Number(
      data.current.weather_code
    ),

    condition: getWeatherCondition(
      Number(data.current.weather_code)
    ),

    isDay: Boolean(data.current.is_day),
  };

  // ==========================================================
  // HOURLY WEATHER
  // ==========================================================

  const hourly: HourlyWeather[] =
    data.hourly.time.map(
      (time: string, index: number) => {
        const weatherCode = Number(
          data.hourly.weather_code[index]
        );

        return {
          time,

          temperature: Number(
            data.hourly.temperature_2m[index]
          ),

          apparentTemperature: Number(
            data.hourly.apparent_temperature[index]
          ),

          precipitationProbability: Number(
            data.hourly.precipitation_probability[index]
          ),

          precipitation: Number(
            data.hourly.precipitation[index]
          ),

          rain: Number(
            data.hourly.rain[index]
          ),

          showers: Number(
            data.hourly.showers[index]
          ),

          windSpeed: Number(
            data.hourly.wind_speed_10m[index]
          ),

          weatherCode,

          condition:
            getWeatherCondition(weatherCode),
        };
      }
    );

  // ==========================================================
  // DAILY WEATHER
  // ==========================================================

  const daily: DailyWeather[] =
    data.daily.time.map(
      (date: string, index: number) => {
        const weatherCode = Number(
          data.daily.weather_code[index]
        );

        return {
          date,

          maxTemperature: Number(
            data.daily.temperature_2m_max[index]
          ),

          minTemperature: Number(
            data.daily.temperature_2m_min[index]
          ),

          precipitationProbability: Number(
            data.daily
              .precipitation_probability_max[index]
          ),

          precipitationSum: Number(
            data.daily.precipitation_sum[index]
          ),

          windSpeed: Number(
            data.daily.wind_speed_10m_max[index]
          ),

          weatherCode,

          condition:
            getWeatherCondition(weatherCode),

          sunrise: data.daily.sunrise[index],

          sunset: data.daily.sunset[index],
        };
      }
    );

  // ==========================================================
  // RETURN NORMALISED DATA
  // ==========================================================

  return {
    location: {
      name: "Pretoria",
      latitude,
      longitude,
    },

    current,

    hourly,

    daily,

    fetchedAt: new Date().toISOString(),
  };
};

// ============================================================
// GET CURRENT PRETORIA WEATHER
// Convenience function
// ============================================================

export const getPretoriaWeather =
  async (): Promise<WeatherData> => {
    return getWeather(
      PRETORIA_LATITUDE,
      PRETORIA_LONGITUDE
    );
  };

// ============================================================
// DRIVING CONDITION HELPER
// ============================================================

export type DrivingCondition =
  | "good"
  | "fair"
  | "poor"
  | "dangerous";

export const getDrivingCondition = (
  weather: CurrentWeather
): DrivingCondition => {
  // Thunderstorms = dangerous
  if (weather.condition === "thunderstorm") {
    return "dangerous";
  }

  // Heavy rain / very poor visibility
  if (
    weather.condition === "heavy_rain" ||
    weather.visibility < 2000
  ) {
    return "poor";
  }

  // Normal rain / fog
  if (
    weather.condition === "rain" ||
    weather.condition === "fog" ||
    weather.visibility < 5000
  ) {
    return "fair";
  }

  return "good";
};

// ============================================================
// DRIVING CONDITION LABEL
// ============================================================

export const getDrivingConditionLabel = (
  condition: DrivingCondition
): string => {
  switch (condition) {
    case "good":
      return "Good driving conditions";

    case "fair":
      return "Drive with caution";

    case "poor":
      return "Poor driving conditions";

    case "dangerous":
      return "Dangerous driving conditions";

    default:
      return "Driving conditions unavailable";
  }
};