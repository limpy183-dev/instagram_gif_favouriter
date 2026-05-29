import { useState, type RefObject } from "react";
import type { User } from "@supabase/supabase-js";
import type { Page, Workspace, SyncStatus } from "../../types";
import {
  SparkleIcon,
  DiscoverIcon,
  FavouriteNavIcon,
  UsersIcon,
  LogoutIcon,
} from "../Icons";
import { SyncPanel } from "./SyncPanel";

interface HeaderProps {
  user: User;
  workspace: Workspace;
  page: Page;
  navigateToPage: (nextPage: Page) => void;
  handleLogout: () => Promise<void>;
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

export function Header({
  user,
  workspace,
  page,
  navigateToPage,
  handleLogout,
  syncStatus,
  favouritesOffline,
  workspaceOffline,
  lastSyncAt,
  retryingSync,
  retrySync,
  showSyncDetails,
  setShowSyncDetails,
  syncPanelRef,
}: HeaderProps) {
  const [avatarError, setAvatarError] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg glow-pulse"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              <SparkleIcon />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight gradient-text leading-none">GIF Studio</h1>
              <p className="text-[var(--text-faint)] text-xs">Instagram GIF Favouriter for creators</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <SyncPanel
              syncStatus={syncStatus}
              favouritesOffline={favouritesOffline}
              workspaceOffline={workspaceOffline}
              lastSyncAt={lastSyncAt}
              retryingSync={retryingSync}
              retrySync={retrySync}
              showSyncDetails={showSyncDetails}
              setShowSyncDetails={setShowSyncDetails}
              syncPanelRef={syncPanelRef}
            />
            <nav className="flex items-center gap-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl p-1 flex-wrap">
              {(["discover", "favourites", "toolbox", "users", "profile"] as Page[]).map((item) => (
                <button
                  key={item}
                  onClick={() => navigateToPage(item)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                    page === item ? "text-white shadow-lg" : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
                  }`}
                  style={
                    page === item
                      ? { background: "var(--accent)", boxShadow: "0 6px 18px -8px var(--accent-glow)" }
                      : undefined
                  }
                >
                  {item === "discover" && <DiscoverIcon />}
                  {item === "favourites" && <FavouriteNavIcon />}
                  {item === "users" && <UsersIcon />}
                  <span className="capitalize">{item}</span>
                </button>
              ))}
            </nav>
            <div className="flex items-center gap-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-2xl px-3 py-2.5 min-w-[240px] max-w-full transition-colors hover:border-[var(--border-strong)]">
              <div
                className="w-10 h-10 rounded-full border border-[var(--border-strong)] overflow-hidden flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "var(--accent-soft)" }}
              >
                {workspace.profile.avatarUrl && !avatarError ? (
                  <img
                    src={workspace.profile.avatarUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  (workspace.profile.displayName || user.email || "U").slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">
                  {workspace.profile.displayName || user.email || "Signed in"}
                </p>
                <p className="text-[var(--text-faint)] text-xs truncate">{user.email ?? "Supabase account"}</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-auto flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl transition-all duration-200"
              >
                <LogoutIcon />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
