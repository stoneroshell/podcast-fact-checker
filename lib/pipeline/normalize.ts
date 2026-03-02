/**
 * Normalize input text for claim pipeline (trim, collapse whitespace, light cleanup).
 * See project.md §5.1 step 1.
 */
export function normalizeClaimInput(text: string): string {
  // TODO: Trim, collapse whitespace, optional: strip leading "So," "And," etc.
  return text.trim().replace(/\s+/g, " ");
}

/**
 * Generate a stable hash for cache key (e.g. SHA-256 of normalized text).
 * See project.md §5.6.
 */
export function normalizedClaimHash(normalizedText: string): string {
  // TODO: Use crypto.subtle or node crypto to hash normalizedText; return hex string
  return normalizedText;
}
