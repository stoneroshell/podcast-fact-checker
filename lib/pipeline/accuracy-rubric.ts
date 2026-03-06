/**
 * Accuracy score rubric: map 0–100 score to display label.
 * Iteration 2; model assigns score, code derives label for consistency.
 */
const RUBRIC: { min: number; max: number; label: string }[] = [
  { min: 95, max: 100, label: "Universally Accepted Fact" },
  { min: 80, max: 94, label: "Accurate But Simplified" },
  { min: 60, max: 79, label: "Mostly True But Missing Context" },
  { min: 40, max: 59, label: "Partially Misleading" },
  { min: 20, max: 39, label: "Mostly False" },
  { min: 0, max: 19, label: "False" },
];

export function getAccuracyLabel(score: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const band = RUBRIC.find((r) => clamped >= r.min && clamped <= r.max);
  return band?.label ?? "Insufficient Evidence";
}
