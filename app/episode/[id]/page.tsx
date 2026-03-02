/**
 * Episode detail + transcript.
 * Server Component — fetch episode by id, pass to transcript/claim UI.
 * See project.md §9.1, §9.3.
 */
export default function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // TODO: await getEpisode(params.id) and pass to layout/children
  return (
    <main className="min-h-screen p-8">
      <p className="text-muted-foreground">
        Episode detail and transcript view. (Placeholder — wire up
        EpisodeHeader, TranscriptView, ClaimPanel.)
      </p>
      {/* TODO: EpisodeHeader, TranscriptView, ClaimPanel */}
    </main>
  );
}
