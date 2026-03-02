/**
 * Transcript view: sentences, clickable.
 * Client Component — on sentence click call /api/claim/check and show ClaimPanel.
 * See project.md §9.1, §9.3.
 */
"use client";

import type { TranscriptSentence } from "@/types/episode";
import SentenceLine from "./SentenceLine";

type TranscriptViewProps = {
  sentences: TranscriptSentence[];
};

export default function TranscriptView({ sentences }: TranscriptViewProps) {
  // TODO: Map sentences to SentenceLine; on click set selected sentence and fetch claim result
  return (
    <div>
      {sentences.length === 0 ? (
        <p>No transcript. Paste or upload one.</p>
      ) : (
        <ul>
          {sentences.map((s) => (
            <SentenceLine key={s.id} sentence={s} onSelect={() => {}} />
          ))}
        </ul>
      )}
    </div>
  );
}
