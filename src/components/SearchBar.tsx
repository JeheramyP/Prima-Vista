import { usePresentation } from "../state/PresentationContext";

export default function SearchBar() {
  const { query, setQuery, searching } = usePresentation();

  return (
    <label className="relative block">
      <span className="sr-only">Search songs</span>
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-stone-500">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search title, artist, or lyric line"
        className="w-full rounded-xl border border-white/10 bg-sanctuary-800 py-2.5 pl-10 pr-16 text-sm text-stone-100 outline-none ring-gold-400/0 transition placeholder:text-stone-500 focus:border-gold-500/40 focus:ring-2 focus:ring-gold-400/20"
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] uppercase tracking-[0.16em] text-gold-400">
        {searching ? "Seeking" : null}
      </span>
    </label>
  );
}
