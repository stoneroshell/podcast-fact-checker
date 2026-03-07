/**
 * Parse transcript content from Podcast Index transcript URL.
 * Supports: application/json (segments with startTime, endTime, body),
 * application/srt (SRT cues), text/plain (sentence-split with null times).
 * See project.md Chunk A §2; podcasting2.org/docs/podcast-namespace/tags/transcript
 */

import type { TranscriptSentence } from "@/types/episode";

export type TranscriptInput = {
  url: string;
  type?: string;
};

/** JSON transcript: segments with startTime, endTime, body (Podcasting 2.0 spec). */
type JsonTranscriptSegment = {
  startTime?: number;
  endTime?: number;
  body?: string;
  speaker?: string;
  [key: string]: unknown;
};

type JsonTranscript = {
  segments?: JsonTranscriptSegment[];
  version?: string;
  [key: string]: unknown;
};

/**
 * Fetch transcript from URL and parse into TranscriptSentence[].
 * On fetch or parse failure returns [].
 */
export async function parseTranscriptFromPodcastIndex(
  input: TranscriptInput
): Promise<TranscriptSentence[]> {
  const { url, type: mimeType } = input;
  if (!url?.trim()) return [];

  let text: string;
  try {
    const res = await fetch(url.trim());
    if (!res.ok) return [];
    text = await res.text();
  } catch {
    return [];
  }

  const type = (mimeType ?? "").toLowerCase();
  if (type.includes("json")) return parseJsonTranscript(text);
  if (type.includes("srt") || url.toLowerCase().endsWith(".srt")) return parseSrtTranscript(text);
  return parsePlainTextTranscript(text);
}

function parseJsonTranscript(text: string): TranscriptSentence[] {
  let data: JsonTranscript;
  try {
    data = JSON.parse(text) as JsonTranscript;
  } catch {
    return [];
  }
  const segments = data.segments ?? [];
  return segments
    .map((seg, i) => {
      const body = typeof seg.body === "string" ? seg.body.trim() : "";
      if (!body) return null;
      const start = typeof seg.startTime === "number" ? seg.startTime : null;
      const end = typeof seg.endTime === "number" ? seg.endTime : null;
      return {
        id: `seg-${i}`,
        text: body,
        start_time: start,
        end_time: end,
      };
    })
    .filter((s): s is TranscriptSentence => s !== null);
}

/** Parse SRT: sequence of (index, timecode line, text lines, blank). */
function parseSrtTranscript(text: string): TranscriptSentence[] {
  const blocks = text.trim().split(/\n\s*\n/).filter((b) => b.trim());
  const sentences: TranscriptSentence[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const lines = blocks[i].trim().split(/\n/);
    if (lines.length < 2) continue;
    const timeMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );
    const startTime = timeMatch ? srtTimeToSeconds(timeMatch.slice(1, 5).map(Number)) : null;
    const endTime = timeMatch ? srtTimeToSeconds(timeMatch.slice(5, 9).map(Number)) : null;
    const content = lines.slice(2).join(" ").trim();
    if (!content) continue;
    sentences.push({
      id: `srt-${i}`,
      text: content,
      start_time: startTime,
      end_time: endTime,
    });
  }
  return sentences;
}

function srtTimeToSeconds([h, m, s, ms]: number[]): number {
  return (h ?? 0) * 3600 + (m ?? 0) * 60 + (s ?? 0) + (ms ?? 0) / 1000;
}

/** Plain text: split into sentences, no timestamps. */
function parsePlainTextTranscript(text: string): TranscriptSentence[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/(?<=[.!?])\s+/);
  return parts
    .map((p, i) => ({
      id: `txt-${i}`,
      text: p.trim(),
      start_time: null,
      end_time: null,
    }))
    .filter((s) => s.text.length > 0);
}
