/**
 * Prompt templates for claim extraction, classification, and evaluation.
 * See project.md §5, §6 (guardrails: neutral, no true/false, context + nuance).
 */

export const EXTRACT_CLAIM_PROMPT = `TODO: System + user prompt to extract single factual core claim from input text.`;

export const CLASSIFY_CLAIM_PROMPT = `TODO: Prompt to classify as verifiable_factual_claim | opinion | prediction | value_judgment | rhetorical_statement.`;

export const EVALUATE_CLAIM_PROMPT = `TODO: Prompt with guardrails: neutral tone, accuracy band (0-100), context summary, supporting/contradicting evidence, sources only from provided search results, uncertainty note when limited.`;
