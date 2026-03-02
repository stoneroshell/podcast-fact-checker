/**
 * Source citation: title (link), snippet, optional quote.
 * See project.md §5.5.
 */
import type { ClaimResult } from "@/types/claim";

type SourceCitationProps = {
  sources: ClaimResult["sources"];
};

export default function SourceCitation({ sources }: SourceCitationProps) {
  // TODO: List sources with title as link (url), snippet; avoid hallucinated URLs
  return (
    <section>
      <h4>Sources</h4>
      <ul>
        {sources.map((s) => (
          <li key={s.id}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title}
            </a>
            <p>{s.snippet}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
