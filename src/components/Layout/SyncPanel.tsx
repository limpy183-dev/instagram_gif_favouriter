import type { RefObject } from "react";
import type { SyncStatus } from "../../types";

interface SyncPanelProps {
  syncStatus: SyncStatus;
  favouritesOffline: boolean;
  workspaceOffline: boolean;
  lastSyncAt: string | null;
  retryingSync: boolean;
  retrySync: () => Promise<void>;
  showSyncDetails: boolean;
  setShowSyncDetails: (value: boolean | ((curr: boolean) => boolean)) => void;
  syncPanelRef: RefObject<HTMLDivElement | null>;
}

export function SyncPanel({
  syncStatus,
  favouritesOffline,
  workspaceOffline,
  lastSyncAt,
  retryingSync,
  retrySync,
  showSyncDetails,
  setShowSyncDetails,
  syncPanelRef,
}: SyncPanelProps) {
  return (
    <div className="relative" ref={syncPanelRef}>
      <button
        type="button"
        onClick={() => setShowSyncDetails((current) => !current)}
        className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold border ${
          syncStatus === "live"
            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
            : syncStatus === "partial"
            ? "border-sky-400/20 bg-sky-500/10 text-sky-200"
            : "border-amber-400/20 bg-amber-500/10 text-amber-200"
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            syncStatus === "live" ? "bg-emerald-300" : syncStatus === "partial" ? "bg-sky-300" : "bg-amber-300"
          }`}
        />
        {syncStatus === "live"
          ? "Live sync active"
          : syncStatus === "partial"
          ? "Partially synced"
          : "Offline cache mode"}
      </button>
      {showSyncDetails && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/10 bg-zinc-900/95 p-4 text-xs shadow-2xl backdrop-blur-xl z-50">
          <p className="text-white font-semibold mb-3">Sync details</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Favourites</span>
              <span className={favouritesOffline ? "text-amber-300" : "text-emerald-300"}>
                {favouritesOffline ? "Cached" : "Live"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Collections</span>
              <span className={workspaceOffline ? "text-amber-300" : "text-emerald-300"}>
                {workspaceOffline ? "Cached" : "Live"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Metadata</span>
              <span className={workspaceOffline ? "text-amber-300" : "text-emerald-300"}>
                {workspaceOffline ? "Cached" : "Live"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">History</span>
              <span className={workspaceOffline ? "text-amber-300" : "text-emerald-300"}>
                {workspaceOffline ? "Cached" : "Live"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-zinc-400">Profile</span>
              <span className={workspaceOffline ? "text-amber-300" : "text-emerald-300"}>
                {workspaceOffline ? "Cached" : "Live"}
              </span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-zinc-500">Last sync</span>
            <span className="text-zinc-300">
              {lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : "Not yet"}
            </span>
          </div>
          <p className="text-zinc-500 mt-3 leading-relaxed">
            Cached data appears when Supabase is unavailable. Live mode means the app is currently reading from
            Supabase.
          </p>
          <button
            type="button"
            onClick={() => {
              void retrySync();
            }}
            disabled={retryingSync}
            className="secondary-btn w-full mt-3 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {retryingSync ? (
              <>
                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                Retrying...
              </>
            ) : (
              "Retry sync now"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
