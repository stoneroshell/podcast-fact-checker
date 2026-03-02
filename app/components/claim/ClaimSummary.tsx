/**
 * Claim summary: verdict, evidence summary, classification, confidence.
 * See project.md §5.2, §5.3, source-hierarchy v1.
 */
import type { ClaimResult } from "@/types/claim";

type ClaimSummaryProps = {
  result: ClaimResult;
};

export default function ClaimSummary({ result }: ClaimSummaryProps) {
  const summary = result.evidenceSummary ?? result.contextSummary;
  const confidence = result.confidence ?? result.confidenceScore;
  return (
    <div>
      <p><strong>Verdict:</strong> {result.verdict}</p>
      <p><strong>Confidence:</strong> {confidence}%</p>
      <p>Classification: {result.claimClassification}</p>
      {summary && <p>{summary}</p>}
      {result.uncertaintyNote && <p><em>{result.uncertaintyNote}</em></p>}
    </div>
  );
}
