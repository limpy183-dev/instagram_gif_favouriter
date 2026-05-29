export function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-6 mt-10">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-[var(--text-faint)] text-xs">
          GIF data provided by <span className="text-[var(--text-muted)] font-semibold">GIPHY</span>
        </p>
        <p className="text-[var(--text-faint)] text-xs">
          Profiles, collections, metadata, history, public sharing, and queue persist through Supabase
        </p>
      </div>
    </footer>
  );
}
