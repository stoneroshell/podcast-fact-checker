/**
 * Map URL hostname/domain to source authority tier (1–6).
 * See source-hierarchy.md §2. v1: authority-from-domain only.
 *
 * Tier criteria (use when adding or reclassifying domains):
 * - Tier 1: Primary sources (original research, official datasets, court rulings, official filings). v1 rarely assigns; .gov/.edu often treated as Tier 2.
 * - Tier 2: Institutional authority — .gov, .edu, major intl bodies (WHO, UN, IMF, World Bank, EU), key agencies (CDC, NIH, NASA, SEC).
 * - Tier 3: High-standard journalism (Reuters, AP, BBC, NPR, etc.) OR established research institutes, NGOs, and government-adjacent statistical bodies. Recognized research orgs, peer-reviewed or institutionally backed, and established NGOs count here — not general web content.
 * - Tier 4: Default for general news, blogs, and other sites that don’t meet Tier 1–3.
 * - Tier 5: Aggregators / secondary compilations (Wikipedia, Statista, Britannica). Use only when Tier 1–4 results < 2.
 * - Tier 6: User-generated / social (Reddit, Twitter, YouTube, etc.). Excluded from evaluator in v1.
 */

export type Tier = 1 | 2 | 3 | 4 | 5 | 6;

/** Tier 6: user-generated / social — exclude from evaluator in v1 */
const TIER_6_HOSTS = new Set([
  "reddit.com",
  "www.reddit.com",
  "medium.com",
  "www.medium.com",
  "twitter.com",
  "www.twitter.com",
  "x.com",
  "www.x.com",
  "youtube.com",
  "www.youtube.com",
  "facebook.com",
  "www.facebook.com",
  "instagram.com",
  "www.instagram.com",
  "tiktok.com",
  "www.tiktok.com",
]);

/** Tier 5: aggregators — use only when Tier 1–4 < 2 */
const TIER_5_HOSTS = new Set([
  "wikipedia.org",
  "en.wikipedia.org",
  "www.wikipedia.org",
  "statista.com",
  "www.statista.com",
  "britannica.com",
  "www.britannica.com",
  "investopedia.com",
  "www.investopedia.com",
]);

/** Tier 3: high-standard journalism + established research institutes, NGOs, statistical bodies */
const TIER_3_HOSTS = new Set([
  "reuters.com",
  "www.reuters.com",
  "apnews.com",
  "www.apnews.com",
  "ap.org",
  "ft.com",
  "www.ft.com",
  "wsj.com",
  "www.wsj.com",
  "bbc.com",
  "www.bbc.co.uk",
  "bbc.co.uk",
  "npr.org",
  "www.npr.org",
  "theguardian.com",
  "www.theguardian.com",
  "economist.com",
  "www.economist.com",
  "politico.com",
  "www.politico.com",
  "bloomberg.com",
  "www.bloomberg.com",
  "axios.com",
  "www.axios.com",
  "aljazeera.com",
  "www.aljazeera.com",
  "dw.com",
  "www.dw.com",
  "france24.com",
  "www.france24.com",
  "prisonpolicy.org",
  "www.prisonpolicy.org",
  "prb.org",
  "www.prb.org",
  "prisonstudies.org",
  "www.prisonstudies.org",
  "sentencingproject.org",
  "www.sentencingproject.org",
  "pewresearch.org",
  "www.pewresearch.org",
  "urban.org",
  "www.urban.org",
  "rand.org",
  "www.rand.org",
]);

/** Tier 2: institutional — .gov, .edu, intl bodies */
function isTier2Host(host: string): boolean {
  const lower = host.toLowerCase();
  if (lower.endsWith(".gov") || lower.endsWith(".gov.uk") || lower === "gov.uk") return true;
  if (lower.endsWith(".edu") || lower.endsWith(".ac.uk") || lower === "edu") return true;
  const tier2Set = new Set([
    "who.int", "www.who.int",
    "un.org", "www.un.org", "unicef.org",
    "imf.org", "worldbank.org",
    "ec.europa.eu", "europa.eu",
    "cdc.gov", "nih.gov", "nasa.gov", "sec.gov", "fdic.gov",
    "iso.org", "ieee.org",
  ]);
  return tier2Set.has(lower) || tier2Set.has(host);
}

function normalizeHost(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Returns authority tier 1–6 for a given URL.
 * Tier 1: reserved (e.g. primary sources); v1 treats .gov/.edu as Tier 2.
 * Tier 4: default for "other" (general news, blogs).
 */
export function getTierFromUrl(url: string): Tier {
  const host = normalizeHost(url);
  if (!host) return 4;
  const withWww = "www." + host;
  if (TIER_6_HOSTS.has(host) || TIER_6_HOSTS.has(withWww)) return 6;
  if (TIER_5_HOSTS.has(host) || TIER_5_HOSTS.has(withWww)) return 5;
  if (TIER_3_HOSTS.has(host) || TIER_3_HOSTS.has(withWww)) return 3;
  if (isTier2Host(host) || isTier2Host(withWww)) return 2;
  return 4;
}
