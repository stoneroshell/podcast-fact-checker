/**
 * Supporting and contradicting evidence list.
 * See project.md §5.2, §5.5.
 */
import type { ClaimResult } from "@/types/claim";

type EvidenceListProps = {
  result: ClaimResult;
};

export default function EvidenceList({ result }: EvidenceListProps) {
  // TODO: Map supportingEvidence and contradictingEvidence; link to sources via sourceId
  return (
    <div>
      <section>
        <h4>Supporting evidence</h4>
        <ul>
          {result.supportingEvidence.map((e, i) => (
            <li key={i}>{e.summary}</li>
          ))}
        </ul>
      </section>
      <section>
        <h4>Contradicting evidence</h4>
        <ul>
          {result.contradictingEvidence.map((e, i) => (
            <li key={i}>{e.summary}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
