/**
 * SerpAPI client for web search (source retrieval).
 * See project.md §3.1, §3.2, §5.1 step 6.
 */

const SERPAPI_KEY = process.env.SERPAPI_API_KEY;
const MAX_RESULTS = Number(process.env.MAX_SEARCH_RESULTS) || 6;

export async function search(query: string): Promise<{ title: string; snippet: string; link: string }[]> {
  // TODO: Call SerpAPI with query; return top MAX_RESULTS (title, snippet, link)
  // TODO: Handle missing key / rate limit (return [])
  if (!SERPAPI_KEY) return [];
  return [];
}
