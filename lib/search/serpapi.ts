/**
 * SerpAPI client for web search (source retrieval).
 * See project.md §3.1, §3.2, §5.1 step 6.
 */

const SERPAPI_KEY = process.env.SERPAPI_API_KEY;
const MAX_RESULTS = Number(process.env.MAX_SEARCH_RESULTS) || 6;

type SerpApiOrganicResult = {
  title?: string;
  snippet?: string;
  link?: string;
};

export async function search(
  query: string
): Promise<{ title: string; snippet: string; link: string }[]> {
  if (!SERPAPI_KEY?.trim()) return [];

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", SERPAPI_KEY);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    if (!res.ok) return [];
    const data = (await res.json()) as { organic_results?: SerpApiOrganicResult[] };
    const results = data.organic_results ?? [];
    return results
      .slice(0, MAX_RESULTS)
      .filter((r) => r.link != null)
      .map((r) => ({
        title: r.title ?? "",
        snippet: r.snippet ?? "",
        link: r.link ?? "",
      }));
  } catch {
    return [];
  }
}
