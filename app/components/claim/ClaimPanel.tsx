/**
 * Side panel: claim result (classification, accuracy, context, evidence, sources).
 * Client Component — receives result from parent state after /api/claim/check.
 * See project.md §9.1, §9.3, §5.2.
 */
import type { ClaimResult } from "@/types/claim";
import ClaimSummary from "./ClaimSummary";
import EvidenceList from "./EvidenceList";
import SourceCitation from "./SourceCitation";

type ClaimPanelProps = {
  result: ClaimResult | null;
  isLoading?: boolean;
};

export default function ClaimPanel({ result, isLoading }: ClaimPanelProps) {
  if (isLoading) return <aside>Checking claim…</aside>;
  if (!result) return <aside>Select a sentence to see context and verification.</aside>;

  return (
    <aside>
      <ClaimSummary result={result} />
      <EvidenceList result={result} />
      <SourceCitation sourcesUsed={result.sourcesUsed} sources={result.sources} />
    </aside>
  );
}
