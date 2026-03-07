/**
 * Claim summary: verdict, evidence summary, classification, confidence.
 * See project.md §5.2, §5.3, source-hierarchy v1.
 */
import type { ClaimResult, ClaimVerdict } from "@/types/claim";

const VERDICT_LABELS: Record<ClaimVerdict, string> = {
  True: "True",
  False: "False",
  Misleading: "Misleading",
  Contested: "Contested",
  Outdated: "No Longer Holds",
  "Insufficient Evidence": "Insufficient Evidence",
};

function verdictClassName(verdict: ClaimVerdict): string {
  const base = "font-medium";
  switch (verdict) {
    case "True":
      return `${base} text-green-700 dark:text-green-400`;
    case "False":
      return `${base} text-red-700 dark:text-red-400`;
    case "Contested":
      return `${base} text-stone-600 dark:text-stone-400`;
    case "Outdated":
      return `${base} text-amber-700 dark:text-amber-400`;
    case "Misleading":
    case "Insufficient Evidence":
    default:
      return `${base} text-stone-600 dark:text-stone-400`;
  }
}

type ClaimSummaryProps = {
  result: ClaimResult;
};

export default function ClaimSummary({ result }: ClaimSummaryProps) {
  const summary = result.evidenceSummary ?? result.contextSummary;
  const confidence = result.confidence ?? result.confidenceScore;
  const verdictLabel = VERDICT_LABELS[result.verdict] ?? result.verdict;
  return (
    <div>
      <p>
        <strong>Verdict:</strong>{" "}
        <span className={verdictClassName(result.verdict)} data-verdict={result.verdict}>
          {verdictLabel}
        </span>
      </p>
      {result.consensusScore != null && (
        <p><strong>Consensus:</strong> {result.consensusScore}%</p>
      )}
      {result.accuracyLabel && (
        <p><strong>Accuracy:</strong> {result.accuracyLabel}</p>
      )}
      <p><strong>Confidence:</strong> {confidence}%</p>
      <p>Classification: {result.claimClassification}</p>
      {summary && <p>{summary}</p>}
      {result.uncertaintyNote && <p><em>{result.uncertaintyNote}</em></p>}
    </div>
  );
}
