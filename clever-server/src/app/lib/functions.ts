// Save Memory Tool Declaration
export const saveMemoryFunctionDeclaration: FunctionDeclaration = {
  name: "save_memory",
  description: "Save a user fact or memory (e.g., name, birthday, preferences) to the memory. Do not use when the information is already known.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: {
        type: SchemaType.STRING,
        description: "The type of memory to save (e.g., 'name', 'birthday', 'favorite_color').",
      },
      value: {
        type: SchemaType.STRING,
        description: "The value to save (e.g., 'Emir', 'blue', '1990-01-01').",
      },
      keywords: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        minItems: 3,
        description: "Array of at least 3 keywords to help with memory retrieval.",
      },
    },
    required: ["name", "value", "keywords"],
  },
};

// Memory record type for memory API
export interface MemoryRecord {
  name: string;
  value: string;
  keywords?: string[];
  [key: string]: unknown;
}

// Save memory function (calls memory API)
export async function save_memory(args: Record<string, unknown>): Promise<MemoryRecord> {
  const { name, value, keywords } = args as { name: string; value: string; keywords: string[] };
  if (!Array.isArray(keywords) || keywords.length < 3) {
    throw new Error("'keywords' must be an array of at least 3 strings.");
  }
  const url = "https://services.emirozdis.com/api/memory";
  const body: MemoryRecord = { name, value, keywords };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "authorization": process.env.AUTH_KEY!,
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`Failed to save memory: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<MemoryRecord>;
}
import { SchemaType, FunctionDeclaration } from "@google/generative-ai";
import fetch from "node-fetch";

// ----- Types -----
interface VisionResult {
  vision?: string;
  error?: string;
}
interface GeocodingResult {
  results: {
    name: string;
    latitude: number;
    longitude: number;
    country?: string;
    admin1?: string;
  }[];
}

interface WeatherResult {
  current_weather?: {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    is_day: number;
  };
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}



type ToolFunction = (args: Record<string, unknown>) => Promise<unknown> | unknown;

export const retrieveVisionFunctionDeclaration: FunctionDeclaration = {
  name: "retrieve_vision",
  description: "Retrieve vision data from smart glasses when vision is needed.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
    required: [],
  },
};

export const retrieve_vision = async (
  args: Record<string, unknown>
): Promise<VisionResult> => {
  const { hasGlassesConnected } = args as { hasGlassesConnected: boolean };
  if (!hasGlassesConnected) {
    return { error: "Smart glasses must be connected to retrieve vision data." };
  }
  return { vision: "Retrieving vision data." };
};

export const getWeatherFunctionDeclaration: FunctionDeclaration = {
  name: "get_weather",
  description: "Gets the current weather for a location.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      location: {
        type: SchemaType.STRING,
        description: "The city name for which to get the weather information.",
      },
    },
    required: ["location"],
  },
};

export const get_weather = async function (args: Record<string, unknown>): Promise<{ weather: string }> {
  const { location, hasGlassesConnected } = args as { location: string; hasGlassesConnected: boolean };
  try {
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&country_code=`;
    const geocodingResponse = await fetch(geocodingUrl);
    if (!geocodingResponse.ok) {
      throw new Error(`Geocoding API returned status ${geocodingResponse.status}`);
    }
    const geocodingData = (await geocodingResponse.json()) as GeocodingResult;

    if (!geocodingData.results || geocodingData.results.length === 0) {
      return { weather: `Could not find coordinates for location: "${location}". Please try a more specific name.` };
    }

    const geoResult = geocodingData.results[0];
    const latitude = geoResult.latitude;
    const longitude = geoResult.longitude;
    const resolvedLocationName = `${geoResult.name}${geoResult.admin1 ? `, ${geoResult.admin1}` : ""}${geoResult.country ? `, ${geoResult.country}` : ""}`;

    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`;
    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) {
      throw new Error(`Weather API returned status ${weatherResponse.status}`);
    }
    const weatherData = (await weatherResponse.json()) as WeatherResult;

    if (!weatherData.current_weather) {
      return { weather: `Could not retrieve weather data for ${resolvedLocationName}.` };
    }

    const current = weatherData.current_weather;
    const weatherDescription = `
      Weather in ${resolvedLocationName}:
      - Current Temperature: ${current.temperature}°C
      - Wind Speed: ${current.windspeed} km/h
      - Wind Direction: ${current.winddirection}°
      - Weather Code: ${current.weathercode} (${getWeatherDescription(current.weathercode)})
      - Is Day: ${current.is_day === 1 ? "Yes" : "No"}
    `;

    return { weather: weatherDescription.trim() };
  } catch (error) {
    console.error("Error fetching weather:", error);
    return { weather: `An error occurred while fetching weather for ${location}.` };
  }
};

function getWeatherDescription(code: number): string {
  const weatherCodes: { [key: number]: string } = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Cloudy",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Drizzle: Light",
    53: "Drizzle: Moderate",
    55: "Drizzle: Dense",
    56: "Freezing Drizzle: Light",
    57: "Freezing Drizzle: Dense",
    61: "Rain: Slight",
    63: "Rain: Moderate",
    65: "Rain: Heavy",
    66: "Freezing Rain: Light",
    67: "Freezing Rain: Heavy",
    71: "Snow fall: Slight",
    73: "Snow fall: Moderate",
    75: "Snow fall: Heavy",
    77: "Snow grains",
    80: "Rain showers: Slight",
    81: "Rain showers: Moderate",
    82: "Rain showers: Violent",
    85: "Snow showers: Slight",
    86: "Snow showers: Heavy",
    95: "Thunderstorm: Slight or moderate",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail",
  };
  return weatherCodes[code] || "Unknown weather code";
}

// Web search
export const webSearchFunctionDeclaration: FunctionDeclaration = {
  name: "web_search",
  description: "Performs a search using SearxNG and returns the top results.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: "The search query string." },
      maxResults: { type: SchemaType.NUMBER, description: "Maximum number of results to return." },
    },
    required: ["query"],
  },
};

export const web_search = async function (args: Record<string, unknown>): Promise<{ results: SearchResult[] }> {
  const { query, maxResults = 5, hasGlassesConnected } = args as { query: string; maxResults?: number; hasGlassesConnected: boolean };
  try {
    const baseUrl = process.env.SEARCH_API;
    const apiKey = process.env.AUTH_KEY;
    if (!apiKey) throw new Error("SEARCH_API_KEY or AUTH_KEY environment variable is not set");

    // Compose the API URL and headers
    const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(query)}&format=json&max_results=${maxResults}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Clever-AI-Search-Client/1.0",
        "authorization": apiKey,
      },
    });
    if (!response.ok) throw new Error(`Search API returned status ${response.status}`);

    // Handle new API response format
    const data = (await response.json()) as {
      status?: string;
      count?: number;
      results?: { url: string; title: string; snippet: string }[];
    };
    const results: SearchResult[] = [];

    if (Array.isArray(data.results)) {
      const topResults = data.results.slice(0, maxResults);
      for (let i = 0; i < topResults.length; i++) {
        const r = topResults[i];
        results.push({
          title: r.title,
          url: r.url,
          snippet: r.snippet || "",
        });
      }
    }

    return { results: results.length ? results : [{ title: "No results found", url: "", snippet: "" }] };
  } catch (error) {
    console.error("Error performing search:", error);
    return { results: [{ title: "Error", url: "", snippet: `An error occurred while searching for \"${query}\": ${error instanceof Error ? error.message : String(error)}` }] };
  }
};

// Music
export const playMusicFunctionDeclaration: FunctionDeclaration = {
  name: "play_music",
  description: "Searches for and plays a song, artist, album, or genre on the user's default music app.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The name of the song, artist, album, genre, or a general music query. For example: 'lo-fi hip hop', 'new song by The Weeknd', 'Bohemian Rhapsody'.",
      },
    },
    required: ["query"],
  },
};

export const play_music = async function (args: Record<string, unknown>): Promise<{ musicUrl: string }> {
  const { query, hasGlassesConnected } = args as { query: string; hasGlassesConnected: boolean };
  try {
    const YT_API_KEY = process.env.YT_API_KEY;
    if (!YT_API_KEY) {
      throw new Error("YT_API_KEY environment variable is not set");
    }

    const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(query + " Official Audio")}&key=${YT_API_KEY}`;
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error(`YouTube API returned status ${res.status}`);
    const data = (await res.json()) as { items?: { id: { videoId: string } }[] };
    if (!data.items || data.items.length === 0) {
      throw new Error("No video found");
    }
    const videoId = data.items[0].id.videoId;
    return { musicUrl: `https://music.youtube.com/watch?v=${videoId}` };
  } catch (err: unknown) {
    console.error("Error fetching music:", err);
    return { musicUrl: "" };
  }
};

// Metadata
const functionMeta = {
  get_weather: { requireGlass: false },
  web_search: { requireGlass: false },
  retrieve_vision: { requireGlass: true },
  play_music: { requireGlass: false },
  save_memory: { requireGlass: false },
};

export function getAvailableTools(hasGlassesConnected: boolean) {
  const allFunctions = { get_weather, web_search, retrieve_vision, play_music, save_memory };
  const availableToolFunctions: Record<string, ToolFunction> = {};
  for (const [name, fn] of Object.entries(allFunctions)) {
    const meta = functionMeta[name as keyof typeof functionMeta];
    if (hasGlassesConnected || !meta.requireGlass) {
      availableToolFunctions[name] = fn;
    }
  }

  const allDeclarations = [
    getWeatherFunctionDeclaration,
    webSearchFunctionDeclaration,
    retrieveVisionFunctionDeclaration,
    playMusicFunctionDeclaration,
    saveMemoryFunctionDeclaration,
  ];
  const availableFunctionDeclarations = allDeclarations.filter((decl) => {
    const meta = functionMeta[decl.name as keyof typeof functionMeta];
    return hasGlassesConnected || !meta.requireGlass;
  });

  return { availableToolFunctions, availableFunctionDeclarations };
}

export function getAvailableToolFunctions(hasGlassesConnected: boolean) {
  const allFunctions = { get_weather, web_search, retrieve_vision, play_music, save_memory };
  const available: Record<string, ToolFunction> = {};
  for (const [name, fn] of Object.entries(allFunctions)) {
    const meta = functionMeta[name as keyof typeof functionMeta];
    if (hasGlassesConnected || !meta.requireGlass) {
      available[name] = fn;
    }
  }
  return available;
}

export const functionDeclarations = [
  getWeatherFunctionDeclaration,
  webSearchFunctionDeclaration,
  retrieveVisionFunctionDeclaration,
  playMusicFunctionDeclaration,
  saveMemoryFunctionDeclaration,
];
