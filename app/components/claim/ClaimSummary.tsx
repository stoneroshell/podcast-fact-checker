/**
 * Claim summary: classification, accuracy band, context, confidence.
 * See project.md §5.2, §5.3.
 */
import type { ClaimResult } from "@/types/claim";

type ClaimSummaryProps = {
  result: ClaimResult;
};

export default function ClaimSummary({ result }: ClaimSummaryProps) {
  // TODO: Show claimClassification, accuracyPercentage (with band label), contextSummary, confidenceScore, uncertaintyNote
  return (
    <div>
      <p>Classification: {result.claimClassification}</p>
      <p>Accuracy: {result.accuracyPercentage}%</p>
      <p>{result.contextSummary}</p>
    </div>
  );
}
