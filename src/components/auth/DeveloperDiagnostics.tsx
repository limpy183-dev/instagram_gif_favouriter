import { getAppRedirectUrl } from "../../utils/authHelpers";

export function DeveloperDiagnostics() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "Not Set";
  const isPlaceholder = supabaseUrl.includes("placeholder");
  const redirectUrl = getAppRedirectUrl();

  return (
    <div className="mt-8 pt-6 border-t border-white/5 text-left">
      <details className="group cursor-pointer">
        <summary className="list-none flex items-center justify-between text-zinc-500 hover:text-zinc-300 text-xs font-semibold select-none transition-colors">
          <span className="flex items-center gap-1.5">🛠️ Developer Diagnostics</span>
          <span className="transition-transform duration-200 group-open:rotate-180">▼</span>
        </summary>
        <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-[11px] text-zinc-400 font-mono leading-relaxed">
          <div>
            <span className="text-zinc-500">Supabase URL:</span>
            <span className="text-violet-300 block break-all mt-0.5">{supabaseUrl}</span>
            {isPlaceholder && (
              <span className="text-amber-400 block mt-1">
                ⚠️ Using placeholders! Google OAuth requires a real Supabase project URL and Client ID.
              </span>
            )}
          </div>
          <div>
            <span className="text-zinc-500">OAuth Redirect URL:</span>
            <span className="text-pink-300 block break-all mt-0.5">{redirectUrl}</span>
          </div>
          <div className="text-zinc-500 text-[10px] mt-2 font-sans leading-normal">
            Make sure <code className="text-zinc-300">{redirectUrl}</code> is added under{" "}
            <strong className="text-zinc-300">Redirect URLs</strong> in your Supabase Auth Settings, and your Google
            Client ID & Secret are configured in the Supabase Dashboard.
          </div>
        </div>
      </details>
    </div>
  );
}
