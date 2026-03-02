/**
 * Single sentence line in transcript; clickable.
 * See project.md §9.1.
 */
import type { TranscriptSentence } from "@/types/episode";

type SentenceLineProps = {
  sentence: TranscriptSentence;
  onSelect: () => void;
};

export default function SentenceLine({ sentence, onSelect }: SentenceLineProps) {
  // TODO: Button or clickable span; onSelect() when user clicks (trigger claim check)
  return (
    <li>
      <button type="button" onClick={onSelect} className="text-left">
        {sentence.text}
      </button>
    </li>
  );
}
