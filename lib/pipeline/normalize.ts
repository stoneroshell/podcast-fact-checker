/**
 * Normalize input text for claim pipeline (trim, collapse whitespace, light cleanup).
 * See project.md §5.1 step 1.
 */
import { createHash } from "crypto";

const LEADING_FILLER =
  /^\s*(?:So,?\s*|And,?\s*|I\s+mean,?\s*|Well,?\s*|Look,?\s*|You\s+know,?\s*)/i;

export function normalizeClaimInput(text: string): string {
  let out = text.trim().replace(/\s+/g, " ");
  out = out.replace(LEADING_FILLER, "").trim();
  return out || text.trim();
}

/**
 * Generate a stable hash for cache key (SHA-256 of normalized text).
 * See project.md §5.6.
 */
export function normalizedClaimHash(normalizedText: string): string {
  return createHash("sha256").update(normalizedText, "utf8").digest("hex");
}
