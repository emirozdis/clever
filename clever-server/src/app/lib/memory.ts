
// Memory record type for memory API
export interface MemoryRecord {
  name: string;
  value: string;
  keywords?: string[];
  [key: string]: unknown;
}

/**
 * Saves a memory to the memory API.
 * @param name The memory name (e.g., "name").
 * @param value The value to save (e.g., "emir").
 * @param apiKey The authentication key for the memory API.
 * @param keywords (optional) Array of keywords to save for the memory. If not provided, only name and value are sent.
 * @returns The saved memory record or error.
 */
export async function save_memory({ name, value, apiKey, keywords }: { name: string; value: string; apiKey: string; keywords?: string[] }): Promise<MemoryRecord> {
  const url = "https://services.emirozdis.com/api/memory";
  const body: MemoryRecord = { name, value };
  if (keywords) body.keywords = keywords;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "authorization": apiKey,
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`Failed to save memory: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<MemoryRecord>;
}

/**
 * Checks the memory API for relevant memories for a given query.
 * @param query The user query string.
 * @param apiKey The authentication key for the memory API.
 * @returns Array of relevant memory records.
 */
export async function get_relevant_memories({ query, apiKey }: { query: string; apiKey: string }): Promise<MemoryRecord[]> {
  const url = `https://services.emirozdis.com/api/memory?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "authorization": apiKey,
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch memories: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { matches?: MemoryRecord[] };
  return Array.isArray(data.matches) ? data.matches : [];
}
