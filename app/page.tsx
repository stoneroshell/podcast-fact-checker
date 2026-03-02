/**
 * Home: podcast search.
 * Server Component — data fetch for initial state can go here.
 * See project.md §9.1, §9.3.
 */
export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Scio</h1>
      <p className="text-muted-foreground mt-2">
        Search for a podcast to get started. (Placeholder — wire up SearchForm.)
      </p>
      {/* TODO: Add <SearchForm /> and episode list */}
    </main>
  );
}
