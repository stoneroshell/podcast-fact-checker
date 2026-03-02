/**
 * Search form for podcast search.
 * Client Component — handles input and calls GET /api/podcasts/search?q=
 * See project.md §9.1, §9.3.
 */
"use client";

export default function SearchForm() {
  // TODO: Local state for query, results, loading
  // TODO: Debounced fetch to /api/podcasts/search?q=
  // TODO: On select episode → navigate to /episode/[id] or trigger episode list
  return (
    <div>
      <input
        type="search"
        placeholder="Search podcasts..."
        className="border rounded px-3 py-2"
        aria-label="Search podcasts"
      />
      {/* TODO: Results list / typeahead */}
    </div>
  );
}
