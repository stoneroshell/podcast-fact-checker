/**
 * Source citation: title (link), snippet, tier label.
 * See project.md §5.5, source-hierarchy v1.
 */
import type { SourceWithTier } from "@/types/claim";

type SourceCitationProps = {
  /** Prefer sourcesUsed (includes tier); fallback to sources-shaped list */
  sourcesUsed?: SourceWithTier[];
  sources?: { id: string; url: string; title: string; snippet: string }[];
};

export default function SourceCitation({ sourcesUsed, sources }: SourceCitationProps) {
  const list = sourcesUsed?.length ? sourcesUsed : (sources ?? []).map((s) => ({ url: s.url, title: s.title, snippet: s.snippet, tier: 4 as const }));
  return (
    <section>
      <h4>Sources</h4>
      <ul>
        {list.map((s, i) => (
          <li key={s.url ?? i}>
            {s.tier != null && <span>[Tier {s.tier}] </span>}
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title ?? s.url}
            </a>
            {s.snippet && <p>{s.snippet}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
