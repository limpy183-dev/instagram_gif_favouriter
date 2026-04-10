import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import AuthPage from './AuthPage';
import { supabase } from './utils/supabase';
import { DiscoverPage } from './pages/DiscoverPage';
import { FavouritesPage } from './pages/FavouritesPage';
import { ToolboxPage } from './pages/ToolboxPage';
import { ProfilePage } from './pages/ProfilePage';
import { UsersPage } from './pages/UsersPage';

const API_KEY = 'xi7X7aEg9CRosfoYoIJ1JmztL9J9lNBX';
const LIMIT = 24;
const LEGACY_FAVOURITES_KEY = 'gif_studio_favourites';
const MIGRATION_FLAG_KEY = 'gif_studio_favourites_migrated';
const CACHE_KEY = 'gif_studio_cached_favourites';
const WORKSPACE_CACHE_KEY = 'gif_studio_workspace_cache';
const DEFAULT_COLLECTION_ID = 'all-favourites';
const QUEUE_COLLECTION_ID = 'queue';
const SHARED_COLLECTION_ID = 'shared-reactions';

export type Page = 'discover' | 'favourites' | 'toolbox' | 'profile' | 'users';
type MoodFilter = 'all' | 'savage' | 'wholesome' | 'awkward' | 'excited' | 'chaotic' | 'flirty';
type SyncStatus = 'live' | 'partial' | 'offline';

export interface GifImage {
  url: string;
  width: string;
  height: string;
}

export interface Gif {
  id: string;
  title: string;
  images: {
    fixed_height: GifImage;
    original: GifImage;
    fixed_width: GifImage;
    downsized: GifImage;
  };
  username: string;
  rating: string;
  trending_datetime?: string;
}

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'heart';
  visible: boolean;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  color: string;
  gifIds: string[];
}

export interface GifMeta {
  tags: string[];
  notes: string;
  addedAt: string;
  useLater: boolean;
  imported: boolean;
  customSourceUrl?: string;
  collectionIds: string[];
}

interface HistoryEntry {
  gifId: string;
  viewedAt: string;
}

export interface ProfileSettings {
  displayName: string;
  accent: string;
  avatarUrl: string;
  landingPage: Page;
  helperMode: boolean;
  offlineCache: boolean;
  publicProfile: boolean;
  publicFavourites: boolean;
}

interface Workspace {
  collections: Collection[];
  gifMeta: Record<string, GifMeta>;
  history: HistoryEntry[];
  profile: ProfileSettings;
  manualImports: Gif[];
}

interface FavouriteRow {
  gif_id: string;
  gif_data: Gif;
}

interface ProfileRow {
  display_name: string | null;
  avatar_url: string | null;
  accent: string | null;
  landing_page: string | null;
  helper_mode: boolean | null;
  offline_cache: boolean | null;
  public_profile: boolean | null;
  public_favourites: boolean | null;
}

interface CollectionRow {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_public: boolean;
}

interface CollectionItemRow {
  collection_id: string;
  gif_id: string;
  position: number;
}

interface GifMetadataRow {
  gif_id: string;
  notes: string | null;
  tags: string[] | null;
  use_later: boolean;
  imported: boolean;
  custom_source_url: string | null;
  updated_at: string;
}

interface HistoryRow {
  gif_id: string;
  viewed_at: string;
}

interface GifAssetRow {
  gif_id: string;
  gif_data: Gif;
}

export interface PublicUserProfile {
  userId: string;
  displayName: string;
  avatarUrl: string;
  accent: string;
  publicFavourites: boolean;
}

const CATEGORIES = [
  { label: '🔥 Trending', value: '' },
  { label: '😂 Funny', value: 'funny' },
  { label: '💖 Love', value: 'love' },
  { label: '🎉 Celebrate', value: 'celebrate' },
  { label: '😮 Shocked', value: 'shocked' },
  { label: '🐱 Animals', value: 'animals' },
  { label: '💪 Motivation', value: 'motivation' },
  { label: '🎮 Gaming', value: 'gaming' },
  { label: '🍕 Food', value: 'food' },
  { label: '🌊 Vibes', value: 'vibes' },
];

const MOOD_PRESETS: Array<{ label: string; value: MoodFilter; keywords: string[] }> = [
  { label: 'All moods', value: 'all', keywords: [] },
  { label: 'Savage', value: 'savage', keywords: ['eye roll', 'sassy', 'mic drop'] },
  { label: 'Wholesome', value: 'wholesome', keywords: ['hug', 'love', 'cute'] },
  { label: 'Awkward', value: 'awkward', keywords: ['cringe', 'nervous', 'side eye'] },
  { label: 'Excited', value: 'excited', keywords: ['party', 'celebrate', 'hyped'] },
  { label: 'Chaotic', value: 'chaotic', keywords: ['wild', 'panic', 'mess'] },
  { label: 'Flirty', value: 'flirty', keywords: ['wink', 'kiss', 'romance'] },
];

const STARTER_COLLECTIONS: Collection[] = [
  { id: 'starter-funniest', name: 'Funniest Reactions', description: 'Quick reactions for jokes and chaotic replies.', isPublic: true, color: '#f97316', gifIds: [] },
  { id: 'starter-romantic', name: 'Romantic Replies', description: 'Love, blushing, and sweet reply energy.', isPublic: true, color: '#ec4899', gifIds: [] },
  { id: 'starter-dramatic', name: 'Dramatic Exits', description: 'Big reactions for big moments.', isPublic: true, color: '#8b5cf6', gifIds: [] },
  { id: 'starter-awkward', name: 'Awkward Silences', description: 'Perfect for side-eyes and slow blinks.', isPublic: true, color: '#14b8a6', gifIds: [] },
];

function createDefaultWorkspace(): Workspace {
  return {
    collections: [
      { id: DEFAULT_COLLECTION_ID, name: 'All Favourites', description: 'Your synced saved GIFs.', isPublic: false, color: '#db2777', gifIds: [] },
      { id: QUEUE_COLLECTION_ID, name: 'Use Later Queue', description: 'Temporary saves before making them permanent.', isPublic: false, color: '#8b5cf6', gifIds: [] },
      { id: SHARED_COLLECTION_ID, name: 'Shared Reactions', description: 'Team-ready and shareable reaction picks.', isPublic: true, color: '#06b6d4', gifIds: [] },
      ...STARTER_COLLECTIONS,
    ],
    gifMeta: {},
    history: [],
    profile: {
      displayName: 'Creator',
      accent: '#a855f7',
      avatarUrl: '',
      landingPage: 'discover',
      helperMode: false,
      offlineCache: true,
      publicProfile: true,
      publicFavourites: true,
    },
    manualImports: [],
  };
}

function normalizeAvatarUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.includes('i.ibb.co/')) return trimmed;
  const match = trimmed.match(/^https?:\/\/(?:www\.)?ibb\.co\/([A-Za-z0-9]+)(?:\/.*)?$/i);
  if (match) return `https://i.ibb.co/${match[1]}/image.png`;
  return trimmed;
}

function SearchIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>;
}
function CopyIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>;
}
function DownloadIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>;
}
function CloseIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
}
function XIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
}
function CheckIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
}
function SparkleIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1l2.5 7.5H22l-6.5 4.5 2.5 7.5L12 16l-6 4.5 2.5-7.5L3 8.5h7.5z" /></svg>;
}
function HeartIcon({ filled }: { filled?: boolean }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
}
function InstagramIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>;
}
function TrashIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>;
}
function DiscoverIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>;
}
function FavouriteNavIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
}
function UsersIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function LogoutIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
}

export function Toast({ message, type, visible }: ToastProps) {
  const styles: Record<ToastProps['type'], string> = {
    success: 'bg-emerald-500 shadow-emerald-500/30',
    error: 'bg-red-500 shadow-red-500/30',
    info: 'bg-violet-500 shadow-violet-500/30',
    heart: 'bg-gradient-to-r from-pink-500 to-rose-500 shadow-pink-500/30',
  };
  if (!visible) return null;
  return <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3.5 rounded-2xl text-white text-sm font-medium shadow-2xl ${styles[type]} toast-enter`}>{type === 'success' && <CheckIcon />}{type === 'heart' && <HeartIcon filled />}{message}</div>;
}

export function SkeletonCard({ height }: { height: number }) {
  return <div className="masonry-item rounded-2xl overflow-hidden shimmer" style={{ height: `${height}px` }} />;
}

export function SectionCard({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900/80 backdrop-blur-sm p-5 shadow-xl shadow-black/10">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          {subtitle && <p className="text-zinc-500 text-sm mt-1">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function GifCard({ gif, index, onSelect, isFavourited, onToggleFavourite, notePreview, isQueued, onQueueToggle }: {
  gif: Gif;
  index: number;
  onSelect: (gif: Gif) => void;
  isFavourited: boolean;
  onToggleFavourite: (gif: Gif) => void;
  notePreview?: string;
  isQueued: boolean;
  onQueueToggle: (gif: Gif) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const searchName = gif.title?.replace(/\s+GIF$/, '').trim() || 'Untitled';
  return (
    <div className="masonry-item gif-card relative rounded-2xl overflow-hidden cursor-pointer group" style={{ animationDelay: `${(index % 12) * 40}ms` }}>
      {!loaded && <div className="shimmer w-full rounded-2xl" style={{ height: '180px' }} />}
      <img src={gif.images.fixed_height.url} alt={gif.title} className={`w-full rounded-2xl transition-transform duration-300 group-hover:scale-105 block ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`} onLoad={() => setLoaded(true)} onClick={() => onSelect(gif)} />
      <div className="gif-overlay absolute inset-0 rounded-2xl flex flex-col justify-end pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0) 100%)' }}>
        <div className="p-2.5">
          <p className="text-white text-xs font-semibold line-clamp-2">{searchName}</p>
          {notePreview && <p className="text-white/60 text-[10px] mt-1 line-clamp-2">{notePreview}</p>}
        </div>
      </div>
      <div className="absolute top-2 right-2 flex gap-2 z-10">
        <button onClick={(e) => { e.stopPropagation(); onQueueToggle(gif); }} className={`mini-action ${isQueued ? 'bg-violet-500 text-white' : 'bg-black/50 text-white/70'}`}>{isQueued ? 'Q' : '+'}</button>
        <button onClick={(e) => { e.stopPropagation(); onToggleFavourite(gif); }} className={`mini-action ${isFavourited ? 'bg-pink-500 text-white' : 'bg-black/50 text-white/60 hover:text-pink-400'}`}><HeartIcon filled={isFavourited} /></button>
      </div>
    </div>
  );
}

function GifModal({ gif, onClose, onCopy, isFavourited, onToggleFavourite, note, tags, onUpdateNote, onAddTag }: {
  gif: Gif | null;
  onClose: () => void;
  onCopy: (text: string, label?: string) => void;
  isFavourited: boolean;
  onToggleFavourite: (gif: Gif) => void;
  note: string;
  tags: string[];
  onUpdateNote: (gif: Gif, note: string) => void;
  onAddTag: (gif: Gif, tag: string) => void;
}) {
  const [draftTag, setDraftTag] = useState('');
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!gif) return;
      if (e.key === 'Escape') onClose();
      if (e.key.toLowerCase() === 'f') onToggleFavourite(gif);
      if (e.key.toLowerCase() === 'c') onCopy(gif.title?.replace(/\s+GIF$/, '').trim() || 'Untitled', 'Name');
      if (e.key.toLowerCase() === 'u') onCopy(gif.images.fixed_height.url, 'URL');
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [gif, onClose, onCopy, onToggleFavourite]);

  if (!gif) return null;
  const searchName = gif.title?.replace(/\s+GIF$/, '').trim() || 'Untitled';

  return (
    <div ref={backdropRef} onClick={(e) => { if (e.target === backdropRef.current) onClose(); }} className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop bg-black/75">
      <div className="relative bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl max-w-3xl w-full border border-white/10 fade-in-up max-h-[92vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/80 text-white rounded-full p-2"><CloseIcon /></button>
        <button onClick={() => onToggleFavourite(gif)} className={`absolute top-4 left-4 z-10 rounded-full p-2.5 ${isFavourited ? 'bg-pink-500 text-white' : 'bg-black/50 text-white/70'}`}><HeartIcon filled={isFavourited} /></button>
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="bg-zinc-950"><img src={gif.images.original.url} alt={gif.title} className="w-full max-h-[36rem] object-contain" /></div>
          <div className="p-5">
            <h3 className="text-white font-semibold text-base mb-2">{gif.title || 'Untitled GIF'}</h3>
            <div className="bg-gradient-to-r from-pink-500/10 to-violet-500/10 border border-pink-500/20 rounded-xl px-4 py-3 mb-4">
              <p className="text-pink-300 text-xs font-semibold mb-1">Instagram Reel Comment Search</p>
              <p className="text-zinc-400 text-xs">Search <span className="text-white font-medium bg-white/10 px-1.5 py-0.5 rounded">"{searchName}"</span> when commenting on Reels.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <button onClick={() => onCopy(searchName, 'Name')} className="tool-btn"><InstagramIcon />Copy Name</button>
              <button onClick={() => onCopy(gif.images.fixed_height.url, 'URL')} className="tool-btn"><CopyIcon />Copy URL</button>
              <a href={gif.images.original.url} target="_blank" rel="noopener noreferrer" className="tool-btn no-underline"><DownloadIcon />Open GIF</a>
            </div>
            <label className="block text-zinc-400 text-xs font-semibold mb-1">Notes</label>
            <textarea value={note} onChange={(e) => onUpdateNote(gif, e.target.value)} className="w-full min-h-24 bg-zinc-800 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500" />
            <div className="mt-4">
              <label className="block text-zinc-400 text-xs font-semibold mb-1">Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">{tags.map((tag) => <span key={tag} className="chip">#{tag}</span>)}</div>
              <div className="flex gap-2">
                <input value={draftTag} onChange={(e) => setDraftTag(e.target.value)} placeholder="Add tag" className="flex-1 bg-zinc-800 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-500" />
                <button onClick={() => { if (!draftTag.trim()) return; onAddTag(gif, draftTag); setDraftTag(''); }} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500">Add</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ensureSystemCollections(collections: Collection[]): Collection[] {
  const defaults = createDefaultWorkspace().collections;
  return [...collections, ...defaults.filter((item) => !collections.some((existing) => existing.id === item.id))].map((collection) => ({ ...collection, gifIds: collection.gifIds ?? [] }));
}

function parseHashRoute() {
  const hash = window.location.hash.replace(/^#/, '');
  if (hash.startsWith('/collections/')) return { type: 'public-collection' as const, id: hash.replace('/collections/', '') };
  if (hash.startsWith('/users/')) return { type: 'public-user' as const, id: hash.replace('/users/', '') };
  if (hash.startsWith('/page/')) return { type: 'page' as const, id: hash.replace('/page/', '') as Page };
  if (['/discover', '/favourites', '/toolbox', '/users', '/profile'].includes(hash)) return { type: 'page' as const, id: hash.replace('/', '') as Page };
  return { type: 'app' as const, id: '' };
}

function readWorkspaceCache(): Partial<Workspace> | null {
  try {
    const stored = localStorage.getItem(WORKSPACE_CACHE_KEY);
    return stored ? JSON.parse(stored) as Partial<Workspace> : null;
  } catch {
    return null;
  }
}

function getPreferredPage(route: ReturnType<typeof parseHashRoute>, fallbackPage: Page): Page {
  if (route.type === 'page') return route.id;
  return fallbackPage;
}

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace>(createDefaultWorkspace());
  const [page, setPage] = useState<Page>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [favouriteSearch, setFavouriteSearch] = useState('');
  const [filterTag, setFilterTag] = useState('all');
  const [filterCollectionId, setFilterCollectionId] = useState(DEFAULT_COLLECTION_ID);
  const [filterRating, setFilterRating] = useState('all');
  const [filterUsername, setFilterUsername] = useState('all');
  const [moodFilter, setMoodFilter] = useState<MoodFilter>('all');
  const [gifs, setGifs] = useState<Gif[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGif, setSelectedGif] = useState<Gif | null>(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [toast, setToast] = useState<ToastProps>({ message: '', type: 'success', visible: false });
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [favourites, setFavourites] = useState<Gif[]>([]);
  const [favouritesLoading, setFavouritesLoading] = useState(false);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceOffline, setWorkspaceOffline] = useState(false);
  const [favouritesOffline, setFavouritesOffline] = useState(false);
  const [showSyncDetails, setShowSyncDetails] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [retryingSync, setRetryingSync] = useState(false);
  const [migrationChecked, setMigrationChecked] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionPublic, setNewCollectionPublic] = useState(false);
  const [manualImportUrl, setManualImportUrl] = useState('');
  const [manualImportTitle, setManualImportTitle] = useState('');
  const [publicCollection, setPublicCollection] = useState<Collection | null>(null);
  const [publicCollectionGifs, setPublicCollectionGifs] = useState<Gif[]>([]);
  const [publicCollectionLoading, setPublicCollectionLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userResults, setUserResults] = useState<PublicUserProfile[]>([]);
  const [selectedUserProfile, setSelectedUserProfile] = useState<PublicUserProfile | null>(null);
  const [selectedUserCollections, setSelectedUserCollections] = useState<Collection[]>([]);
  const [selectedUserFavourites, setSelectedUserFavourites] = useState<Gif[]>([]);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const syncPanelRef = useRef<HTMLDivElement>(null);

  const route = useMemo(parseHashRoute, [window.location.hash]);

  const showToast = (message: string, type: ToastProps['type'] = 'success') => {
    setToast({ message, type, visible: true });
    window.setTimeout(() => setToast((current) => ({ ...current, visible: false })), 3000);
  };

  const fetchGifs = useCallback(async (query: string, cat: string, newOffset = 0) => {
    if (newOffset === 0) setLoading(true);
    else setLoadingMore(true);
    const moodKeywords = moodFilter !== 'all' ? MOOD_PRESETS.find((item) => item.value === moodFilter)?.keywords.join(' ') ?? '' : '';
    const searchTerm = [query || cat, moodKeywords].filter(Boolean).join(' ').trim();
    const endpoint = searchTerm ? `https://api.giphy.com/v1/gifs/search?api_key=${API_KEY}&q=${encodeURIComponent(searchTerm)}&limit=${LIMIT}&offset=${newOffset}` : `https://api.giphy.com/v1/gifs/trending?api_key=${API_KEY}&limit=${LIMIT}&offset=${newOffset}`;
    try {
      const response = await fetch(endpoint);
      const json = await response.json();
      const data: Gif[] = json.data || [];
      if (newOffset === 0) setGifs(data);
      else setGifs((prev) => [...prev, ...data]);
      setHasMore(data.length === LIMIT);
      setOffset(newOffset + LIMIT);
    } catch {
      showToast('Failed to fetch GIFs. Try again.', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [moodFilter]);

  const loadWorkspace = useCallback(async () => {
    if (!user) return;
    setWorkspaceLoading(true);
    const [profileRes, collectionsRes, itemsRes, metadataRes, historyRes] = await Promise.all([
      supabase.from('profiles').select('display_name, avatar_url, accent, landing_page, helper_mode, offline_cache, public_profile, public_favourites').eq('user_id', user.id).maybeSingle(),
      supabase.from('collections').select('id, name, description, color, is_public').eq('user_id', user.id),
      supabase.from('collection_items').select('collection_id, gif_id, position').eq('user_id', user.id).order('position', { ascending: true }),
      supabase.from('gif_metadata').select('gif_id, notes, tags, use_later, imported, custom_source_url, updated_at').eq('user_id', user.id),
      supabase.from('view_history').select('gif_id, viewed_at').eq('user_id', user.id).order('viewed_at', { ascending: false }).limit(30),
    ]);

    const defaultWorkspace = createDefaultWorkspace();
    const cachedWorkspace = readWorkspaceCache();
    const hasWorkspaceError = Boolean(profileRes.error || collectionsRes.error || itemsRes.error || metadataRes.error || historyRes.error);

    if (hasWorkspaceError && cachedWorkspace) {
      setWorkspace({
        collections: ensureSystemCollections((cachedWorkspace.collections as Collection[] | undefined) ?? defaultWorkspace.collections),
        gifMeta: cachedWorkspace.gifMeta ?? {},
        history: cachedWorkspace.history ?? [],
        profile: cachedWorkspace.profile ? { ...defaultWorkspace.profile, ...cachedWorkspace.profile } : defaultWorkspace.profile,
        manualImports: (cachedWorkspace.manualImports as Gif[] | undefined) ?? [],
      });
      setPage(getPreferredPage(route, (cachedWorkspace.profile?.landingPage as Page | undefined) ?? defaultWorkspace.profile.landingPage));
      setWorkspaceOffline(true);
      setWorkspaceLoading(false);
      return;
    }

    const profile = profileRes.data as ProfileRow | null;
    const collectionsRows = (collectionsRes.data ?? []) as CollectionRow[];
    const itemRows = (itemsRes.data ?? []) as CollectionItemRow[];
    const metadataRows = (metadataRes.data ?? []) as GifMetadataRow[];
    const historyRows = (historyRes.data ?? []) as HistoryRow[];

    const collectionMap = new Map<string, string[]>();
    itemRows.forEach((item) => {
      const existing = collectionMap.get(item.collection_id) ?? [];
      collectionMap.set(item.collection_id, [...existing, item.gif_id]);
    });

    const syncedCollections = ensureSystemCollections(collectionsRows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      color: row.color ?? '#a855f7',
      isPublic: row.is_public,
      gifIds: collectionMap.get(row.id) ?? [],
    })));

    const mergedCollections = ensureSystemCollections([...syncedCollections, ...defaultWorkspace.collections.filter((collection) => !syncedCollections.some((existing) => existing.id === collection.id))]);

    const gifMeta: Record<string, GifMeta> = {};
    metadataRows.forEach((row) => {
      gifMeta[row.gif_id] = {
        tags: row.tags ?? [],
        notes: row.notes ?? '',
        addedAt: row.updated_at,
        useLater: row.use_later,
        imported: row.imported,
        customSourceUrl: row.custom_source_url ?? undefined,
        collectionIds: mergedCollections.filter((collection) => collection.gifIds.includes(row.gif_id)).map((collection) => collection.id),
      };
    });

    const nextWorkspace: Workspace = {
      collections: mergedCollections,
      gifMeta,
      history: historyRows.map((row) => ({ gifId: row.gif_id, viewedAt: row.viewed_at })),
      profile: {
        displayName: profile?.display_name ?? cachedWorkspace?.profile?.displayName ?? defaultWorkspace.profile.displayName,
        avatarUrl: normalizeAvatarUrl(profile?.avatar_url ?? cachedWorkspace?.profile?.avatarUrl ?? defaultWorkspace.profile.avatarUrl),
        accent: profile?.accent ?? cachedWorkspace?.profile?.accent ?? defaultWorkspace.profile.accent,
        landingPage: (profile?.landing_page as Page) ?? cachedWorkspace?.profile?.landingPage ?? defaultWorkspace.profile.landingPage,
        helperMode: profile?.helper_mode ?? cachedWorkspace?.profile?.helperMode ?? defaultWorkspace.profile.helperMode,
        offlineCache: profile?.offline_cache ?? cachedWorkspace?.profile?.offlineCache ?? defaultWorkspace.profile.offlineCache,
        publicProfile: profile?.public_profile ?? cachedWorkspace?.profile?.publicProfile ?? defaultWorkspace.profile.publicProfile,
        publicFavourites: profile?.public_favourites ?? cachedWorkspace?.profile?.publicFavourites ?? defaultWorkspace.profile.publicFavourites,
      },
      manualImports: (cachedWorkspace?.manualImports as Gif[] | undefined) ?? favourites.filter((gif) => gif.username === 'manual-import'),
    };

    setWorkspace(nextWorkspace);
    localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(nextWorkspace));
    setPage(getPreferredPage(route, nextWorkspace.profile.landingPage));
    setWorkspaceOffline(false);
    setLastSyncAt(new Date().toISOString());
    setWorkspaceLoading(false);
  }, [user, favourites, route]);

  const saveProfile = useCallback(async (profile: ProfileSettings) => {
    if (!user) return;
    await supabase.from('profiles').upsert({
      user_id: user.id,
      display_name: profile.displayName,
      avatar_url: normalizeAvatarUrl(profile.avatarUrl),
      accent: profile.accent,
      landing_page: profile.landingPage,
      helper_mode: profile.helperMode,
      offline_cache: profile.offlineCache,
      public_profile: profile.publicProfile,
      public_favourites: profile.publicFavourites,
    }, { onConflict: 'user_id' });
  }, [user]);

  const saveCollection = useCallback(async (collection: Collection) => {
    if (!user || [DEFAULT_COLLECTION_ID, QUEUE_COLLECTION_ID].includes(collection.id)) return;
    await supabase.from('collections').upsert({ id: collection.id, user_id: user.id, name: collection.name, description: collection.description, color: collection.color, is_public: collection.isPublic }, { onConflict: 'id' });
    await supabase.from('collection_items').delete().eq('user_id', user.id).eq('collection_id', collection.id);
    if (collection.gifIds.length > 0) await supabase.from('collection_items').insert(collection.gifIds.map((gifId, index) => ({ collection_id: collection.id, user_id: user.id, gif_id: gifId, position: index })));
  }, [user]);

  const saveGifMeta = useCallback(async (gifId: string, meta: GifMeta) => {
    if (!user) return;
    await supabase.from('gif_metadata').upsert({ user_id: user.id, gif_id: gifId, notes: meta.notes, tags: meta.tags, use_later: meta.useLater, imported: meta.imported, custom_source_url: meta.customSourceUrl ?? null }, { onConflict: 'user_id,gif_id' });
  }, [user]);

  const saveGifAsset = useCallback(async (gif: Gif) => {
    if (!user) return;
    await supabase.from('gif_assets').upsert({ user_id: user.id, gif_id: gif.id, gif_data: gif }, { onConflict: 'user_id,gif_id' });
  }, [user]);

  const saveHistory = useCallback(async (gifId: string) => {
    if (!user) return;
    await supabase.from('view_history').insert({ user_id: user.id, gif_id: gifId });
  }, [user]);

  const loadFavourites = useCallback(async () => {
    if (!user) {
      setFavourites([]);
      setMigrationChecked(false);
      return;
    }
    setFavouritesLoading(true);
    const { data, error } = await supabase.from('favourites').select('gif_id, gif_data').eq('user_id', user.id).order('created_at', { ascending: false });
    if (error) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        setFavourites(cached ? JSON.parse(cached) as Gif[] : []);
      } catch {
        setFavourites([]);
      }
      const cachedWorkspace = readWorkspaceCache();
      if (cachedWorkspace) {
        setWorkspace((current) => ({
          ...current,
          collections: cachedWorkspace.collections ?? current.collections,
          gifMeta: cachedWorkspace.gifMeta ?? current.gifMeta,
          history: cachedWorkspace.history ?? current.history,
          profile: cachedWorkspace.profile ? { ...current.profile, ...cachedWorkspace.profile } : current.profile,
          manualImports: cachedWorkspace.manualImports ?? current.manualImports,
        }));
      }
      setFavouritesOffline(true);
      showToast('Loaded offline cache because Supabase was unavailable.', 'info');
      setFavouritesLoading(false);
      setMigrationChecked(true);
      return;
    }
    const rows = (data ?? []) as FavouriteRow[];
    const nextFavourites = rows.map((row) => row.gif_data);
    setFavourites(nextFavourites);
    localStorage.setItem(CACHE_KEY, JSON.stringify(nextFavourites));
    setFavouritesOffline(false);
    setLastSyncAt(new Date().toISOString());
    setFavouritesLoading(false);
    setMigrationChecked(true);
  }, [user]);

  const searchUsers = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setUserResults([]);
      return;
    }
    setUserSearchLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url, accent, public_profile, public_favourites')
      .eq('public_profile', true)
      .or(`display_name.ilike.%${trimmed}%,user_id.ilike.%${trimmed}%`)
      .limit(20);
    setUserResults(((data ?? []) as Array<{ user_id: string; display_name: string | null; avatar_url: string | null; accent: string | null; public_favourites: boolean | null }>).map((row) => ({
      userId: row.user_id,
      displayName: row.display_name ?? 'Creator',
      avatarUrl: normalizeAvatarUrl(row.avatar_url ?? ''),
      accent: row.accent ?? '#a855f7',
      publicFavourites: row.public_favourites ?? false,
    })));
    setUserSearchLoading(false);
  }, []);

  const loadPublicCollection = useCallback(async (collectionId: string) => {
    setPublicCollectionLoading(true);
    const { data: collectionRow } = await supabase.from('collections').select('id, name, description, color, is_public').eq('id', collectionId).eq('is_public', true).maybeSingle();
    if (!collectionRow) {
      setPublicCollection(null);
      setPublicCollectionGifs([]);
      setPublicCollectionLoading(false);
      return;
    }
    const { data: itemRows } = await supabase.from('collection_items').select('gif_id, position').eq('collection_id', collectionId).order('position', { ascending: true });
    const gifIds = (itemRows ?? []).map((item) => item.gif_id as string);
    const [{ data: favouriteRows }, { data: assetRows }] = await Promise.all([
      supabase.from('favourites').select('gif_id, gif_data').in('gif_id', gifIds),
      supabase.from('gif_assets').select('gif_id, gif_data').in('gif_id', gifIds),
    ]);
    const favouriteMap = new Map<string, Gif>();
    ((favouriteRows ?? []) as FavouriteRow[]).forEach((row) => favouriteMap.set(row.gif_id, row.gif_data));
    ((assetRows ?? []) as GifAssetRow[]).forEach((row) => {
      if (!favouriteMap.has(row.gif_id)) favouriteMap.set(row.gif_id, row.gif_data);
    });
    setPublicCollection({ id: collectionRow.id, name: collectionRow.name, description: collectionRow.description ?? '', color: collectionRow.color ?? '#a855f7', isPublic: true, gifIds });
    setPublicCollectionGifs(gifIds.map((gifId) => favouriteMap.get(gifId)).filter(Boolean) as Gif[]);
    setPublicCollectionLoading(false);
  }, []);

  const loadPublicUser = useCallback(async (userId: string) => {
    setSelectedUserLoading(true);
    const { data: profile } = await supabase.from('profiles').select('user_id, display_name, avatar_url, accent, public_profile, public_favourites').eq('user_id', userId).eq('public_profile', true).maybeSingle();
    if (!profile) {
      setSelectedUserProfile(null);
      setSelectedUserCollections([]);
      setSelectedUserFavourites([]);
      setSelectedUserLoading(false);
      return;
    }
    const publicProfile: PublicUserProfile = {
      userId: profile.user_id,
      displayName: profile.display_name ?? 'Creator',
      avatarUrl: normalizeAvatarUrl(profile.avatar_url ?? ''),
      accent: profile.accent ?? '#a855f7',
      publicFavourites: profile.public_favourites ?? false,
    };
    setSelectedUserProfile(publicProfile);
    const { data: collectionsRows } = await supabase.from('collections').select('id, name, description, color, is_public').eq('user_id', userId).eq('is_public', true);
    const collectionList = (collectionsRows ?? []) as CollectionRow[];
    const publicIds = collectionList.map((item) => item.id);
    const { data: itemRows } = publicIds.length > 0 ? await supabase.from('collection_items').select('collection_id, gif_id, position').eq('user_id', userId).in('collection_id', publicIds).order('position', { ascending: true }) : { data: [] };
    const collectionMap = new Map<string, string[]>();
    ((itemRows ?? []) as CollectionItemRow[]).forEach((item) => {
      const existing = collectionMap.get(item.collection_id) ?? [];
      collectionMap.set(item.collection_id, [...existing, item.gif_id]);
    });
    setSelectedUserCollections(collectionList.map((row) => ({ id: row.id, name: row.name, description: row.description ?? '', color: row.color ?? '#a855f7', isPublic: true, gifIds: collectionMap.get(row.id) ?? [] })));
    if (publicProfile.publicFavourites) {
      const { data: favouriteRows } = await supabase.from('favourites').select('gif_id, gif_data').eq('user_id', userId).order('created_at', { ascending: false }).limit(60);
      setSelectedUserFavourites(((favouriteRows ?? []) as FavouriteRow[]).map((row) => row.gif_data));
    } else {
      setSelectedUserFavourites([]);
    }
    setSelectedUserLoading(false);
  }, []);

  useEffect(() => {
    if (user) fetchGifs('', '', 0);
  }, [user, fetchGifs]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!user) return;
      setOffset(0);
      fetchGifs(searchQuery, activeCategory, 0);
    }, 450);
    return () => window.clearTimeout(timer);
  }, [searchQuery, activeCategory, user, fetchGifs]);

  useEffect(() => { loadFavourites(); }, [loadFavourites]);
  useEffect(() => { if (user) loadWorkspace(); }, [user, loadWorkspace]);

  useEffect(() => {
    if (!user || !migrationChecked || favourites.length > 0) return;
    if (localStorage.getItem(MIGRATION_FLAG_KEY) === 'true') return;
    let legacyFavourites: Gif[] = [];
    try {
      const stored = localStorage.getItem(LEGACY_FAVOURITES_KEY);
      legacyFavourites = stored ? JSON.parse(stored) as Gif[] : [];
    } catch {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return;
    }
    if (legacyFavourites.length === 0) {
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      return;
    }
    void supabase.from('favourites').upsert(legacyFavourites.map((gif) => ({ user_id: user.id, gif_id: gif.id, gif_data: gif })), { onConflict: 'user_id,gif_id' }).then(({ error }) => {
      if (error) {
        showToast('Failed to migrate local favourites.', 'error');
        return;
      }
      setFavourites(legacyFavourites);
      localStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      showToast(`Migrated ${legacyFavourites.length} local favourites`, 'success');
    });
  }, [user, migrationChecked, favourites]);

  useEffect(() => {
    const handleHashChange = () => {
      const nextRoute = parseHashRoute();
      if (nextRoute.type === 'public-collection') {
        void loadPublicCollection(nextRoute.id);
        return;
      }
      if (nextRoute.type === 'public-user') {
        void loadPublicUser(nextRoute.id);
        return;
      }
      if (nextRoute.type === 'page') {
        setPage(nextRoute.id);
      }
      setPublicCollection(null);
      setPublicCollectionGifs([]);
      setSelectedUserProfile(null);
      setSelectedUserCollections([]);
      setSelectedUserFavourites([]);
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [loadPublicCollection, loadPublicUser]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!syncPanelRef.current) return;
      if (!syncPanelRef.current.contains(event.target as Node)) setShowSyncDetails(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (workspace.profile.offlineCache) localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(workspace));
  }, [workspace]);

  const retrySync = async () => {
    if (!user) return;
    setRetryingSync(true);
    try {
      await Promise.all([loadFavourites(), loadWorkspace()]);
    } finally {
      setRetryingSync(false);
    }
  };

  const ensureMeta = useCallback((gif: Gif) => {
    setWorkspace((current) => {
      if (current.gifMeta[gif.id]) return current;
      return { ...current, gifMeta: { ...current.gifMeta, [gif.id]: { tags: [], notes: '', addedAt: new Date().toISOString(), useLater: false, imported: gif.username === 'manual-import', customSourceUrl: gif.username === 'manual-import' ? gif.images.original.url : undefined, collectionIds: [DEFAULT_COLLECTION_ID] } } };
    });
  }, []);

  const gifMap = useMemo(() => Object.fromEntries([...favourites, ...workspace.manualImports].map((gif) => [gif.id, gif])), [favourites, workspace.manualImports]);
  const allTags = useMemo(() => Array.from(new Set(Object.values(workspace.gifMeta).flatMap((meta) => meta.tags))).sort(), [workspace.gifMeta]);
  const allUsernames = useMemo(() => Array.from(new Set(favourites.map((gif) => gif.username).filter(Boolean))).sort(), [favourites]);
  const filteredFavourites = useMemo(() => {
    const ids = filterCollectionId === 'all' ? null : workspace.collections.find((collection) => collection.id === filterCollectionId)?.gifIds ?? [];
    return favourites.filter((gif) => {
      const meta = workspace.gifMeta[gif.id];
      const haystack = `${gif.title} ${gif.username} ${meta?.notes ?? ''} ${(meta?.tags ?? []).join(' ')}`.toLowerCase();
      if (favouriteSearch && !haystack.includes(favouriteSearch.toLowerCase())) return false;
      if (filterTag !== 'all' && !(meta?.tags ?? []).includes(filterTag)) return false;
      if (filterRating !== 'all' && gif.rating !== filterRating) return false;
      if (filterUsername !== 'all' && gif.username !== filterUsername) return false;
      if (ids && !ids.includes(gif.id)) return false;
      return true;
    });
  }, [favourites, workspace, favouriteSearch, filterTag, filterRating, filterUsername, filterCollectionId]);
  const queuedGifs = useMemo(() => favourites.filter((gif) => workspace.gifMeta[gif.id]?.useLater), [favourites, workspace.gifMeta]);
  const recentHistory = useMemo(() => workspace.history.map((entry) => gifMap[entry.gifId]).filter(Boolean).slice(0, 12), [workspace.history, gifMap]);
  const publicCollections = useMemo(() => workspace.collections.filter((collection) => collection.isPublic), [workspace.collections]);
  const analytics = useMemo(() => ({ totalSaved: favourites.length, queued: queuedGifs.length, importedCount: Object.values(workspace.gifMeta).filter((meta) => meta.imported).length, topTag: allTags[0] ?? 'none' }), [favourites.length, queuedGifs.length, workspace.gifMeta, allTags]);
  const syncStatus: SyncStatus = workspaceOffline && favouritesOffline ? 'offline' : workspaceOffline || favouritesOffline ? 'partial' : 'live';

  const updateProfileField = async (nextProfile: ProfileSettings) => {
    const normalizedProfile = { ...nextProfile, avatarUrl: normalizeAvatarUrl(nextProfile.avatarUrl) };
    setWorkspace((current) => ({ ...current, profile: normalizedProfile }));
    await saveProfile(normalizedProfile);
  };

  const updateMeta = async (gif: Gif, updater: (meta: GifMeta) => GifMeta) => {
    ensureMeta(gif);
    const nextMeta = updater(workspace.gifMeta[gif.id] ?? { tags: [], notes: '', addedAt: new Date().toISOString(), useLater: false, imported: false, collectionIds: [DEFAULT_COLLECTION_ID] });
    setWorkspace((current) => ({ ...current, gifMeta: { ...current.gifMeta, [gif.id]: nextMeta } }));
    await saveGifMeta(gif.id, nextMeta);
  };

  const addHistory = async (gif: Gif) => {
    ensureMeta(gif);
    setWorkspace((current) => ({ ...current, history: [{ gifId: gif.id, viewedAt: new Date().toISOString() }, ...current.history.filter((item) => item.gifId !== gif.id)].slice(0, 30) }));
    setSelectedGif(gif);
    await saveHistory(gif.id);
  };

  const handleCopy = (text: string, label = 'Copied') => navigator.clipboard.writeText(text).then(() => showToast(`${label} copied to clipboard!`, 'success')).catch(() => showToast('Failed to copy', 'error'));
  const isFavourited = (id: string) => favourites.some((gif) => gif.id === id);
  const isQueued = (id: string) => workspace.gifMeta[id]?.useLater ?? false;
  const currentLabel = searchQuery ? `Results for "${searchQuery}"` : activeCategory ? CATEGORIES.find((category) => category.value === activeCategory)?.label || 'GIFs' : '🔥 Trending Now';

  const syncCollection = async (collectionId: string, gifIds: string[]) => {
    const collection = workspace.collections.find((item) => item.id === collectionId);
    if (!collection) return;
    await saveCollection({ ...collection, gifIds });
  };

  const updateCollectionIds = async (gifId: string, ids: string[]) => {
    const meta = workspace.gifMeta[gifId];
    if (!meta) return;
    await saveGifMeta(gifId, { ...meta, collectionIds: ids });
  };

  const handleToggleFavourite = async (gif: Gif) => {
    if (!user) return;
    const exists = favourites.some((item) => item.id === gif.id);
    if (exists) {
      const previous = favourites;
      setFavourites((current) => current.filter((item) => item.id !== gif.id));
      setWorkspace((current) => ({ ...current, collections: current.collections.map((collection) => collection.id === DEFAULT_COLLECTION_ID ? { ...collection, gifIds: collection.gifIds.filter((id) => id !== gif.id) } : collection) }));
      const { error } = await supabase.from('favourites').delete().eq('user_id', user.id).eq('gif_id', gif.id);
      if (error) {
        setFavourites(previous);
        showToast('Failed to remove favourite.', 'error');
        return;
      }
      showToast('Removed from Favourites', 'info');
      return;
    }
    setFavourites((current) => [gif, ...current]);
    ensureMeta(gif);
    const nextDefaultIds = Array.from(new Set([gif.id, ...(workspace.collections.find((item) => item.id === DEFAULT_COLLECTION_ID)?.gifIds ?? [])]));
    setWorkspace((current) => ({ ...current, collections: current.collections.map((collection) => collection.id === DEFAULT_COLLECTION_ID ? { ...collection, gifIds: nextDefaultIds } : collection) }));
    await supabase.from('favourites').upsert({ user_id: user.id, gif_id: gif.id, gif_data: gif }, { onConflict: 'user_id,gif_id' });
    showToast('Added to Favourites ♥', 'heart');
  };

  const handleQueueToggle = async (gif: Gif) => {
    ensureMeta(gif);
    const wasQueued = workspace.gifMeta[gif.id]?.useLater ?? false;
    const queueIds = workspace.collections.find((collection) => collection.id === QUEUE_COLLECTION_ID)?.gifIds ?? [];
    const nextQueueIds = wasQueued ? queueIds.filter((id) => id !== gif.id) : [gif.id, ...queueIds.filter((id) => id !== gif.id)];
    setWorkspace((current) => ({ ...current, collections: current.collections.map((collection) => collection.id === QUEUE_COLLECTION_ID ? { ...collection, gifIds: nextQueueIds } : collection), gifMeta: { ...current.gifMeta, [gif.id]: { ...(current.gifMeta[gif.id] ?? { tags: [], notes: '', addedAt: new Date().toISOString(), useLater: false, imported: false, collectionIds: [] }), useLater: !wasQueued } } }));
    await syncCollection(QUEUE_COLLECTION_ID, nextQueueIds);
    await saveGifMeta(gif.id, { ...(workspace.gifMeta[gif.id] ?? { tags: [], notes: '', addedAt: new Date().toISOString(), useLater: false, imported: false, collectionIds: [] }), useLater: !wasQueued });
  };

  const addCollection = async () => {
    if (!newCollectionName.trim()) return;
    const next: Collection = { id: crypto.randomUUID(), name: newCollectionName.trim(), description: newCollectionDescription.trim(), isPublic: newCollectionPublic, color: workspace.profile.accent, gifIds: [] };
    setWorkspace((current) => ({ ...current, collections: [...current.collections, next] }));
    setNewCollectionName('');
    setNewCollectionDescription('');
    setNewCollectionPublic(false);
    await saveCollection(next);
    showToast('Collection created', 'success');
  };

  const updateCollectionVisibility = async (collectionId: string, isPublic: boolean) => {
    setWorkspace((current) => ({ ...current, collections: current.collections.map((collection) => collection.id === collectionId ? { ...collection, isPublic } : collection) }));
    const collection = workspace.collections.find((item) => item.id === collectionId);
    if (collection) await saveCollection({ ...collection, isPublic });
  };

  const addGifToCollection = async (gif: Gif, collectionId: string) => {
    ensureMeta(gif);
    const collection = workspace.collections.find((item) => item.id === collectionId);
    if (!collection) return;
    const nextGifIds = Array.from(new Set([gif.id, ...collection.gifIds]));
    const nextCollectionIds = Array.from(new Set([collectionId, ...(workspace.gifMeta[gif.id]?.collectionIds ?? [DEFAULT_COLLECTION_ID])]));
    setWorkspace((current) => ({ ...current, collections: current.collections.map((item) => item.id === collectionId ? { ...item, gifIds: nextGifIds } : item), gifMeta: { ...current.gifMeta, [gif.id]: { ...(current.gifMeta[gif.id] ?? { tags: [], notes: '', addedAt: new Date().toISOString(), useLater: false, imported: false, collectionIds: [] }), collectionIds: nextCollectionIds } } }));
    await syncCollection(collectionId, nextGifIds);
    await updateCollectionIds(gif.id, nextCollectionIds);
    showToast(`Added to ${collection.name}`, 'success');
  };

  const reorderQueue = async (direction: 'up' | 'down', gifId: string) => {
    const queue = workspace.collections.find((item) => item.id === QUEUE_COLLECTION_ID);
    if (!queue) return;
    const index = queue.gifIds.indexOf(gifId);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index === -1 || target < 0 || target >= queue.gifIds.length) return;
    const nextIds = [...queue.gifIds];
    const [moved] = nextIds.splice(index, 1);
    nextIds.splice(target, 0, moved);
    setWorkspace((current) => ({ ...current, collections: current.collections.map((item) => item.id === QUEUE_COLLECTION_ID ? { ...item, gifIds: nextIds } : item) }));
    await syncCollection(QUEUE_COLLECTION_ID, nextIds);
  };

  const importExternalGif = async () => {
    if (!manualImportUrl.trim()) return;
    const id = `import-${crypto.randomUUID()}`;
    const gif: Gif = { id, title: manualImportTitle.trim() || 'Imported GIF', username: 'manual-import', rating: 'g', images: { fixed_height: { url: manualImportUrl, width: '320', height: '240' }, original: { url: manualImportUrl, width: '320', height: '240' }, fixed_width: { url: manualImportUrl, width: '320', height: '240' }, downsized: { url: manualImportUrl, width: '320', height: '240' } } };
    const meta: GifMeta = { tags: ['imported'], notes: 'Imported from external URL', addedAt: new Date().toISOString(), useLater: false, imported: true, customSourceUrl: manualImportUrl, collectionIds: [SHARED_COLLECTION_ID] };
    const sharedIds = [gif.id, ...(workspace.collections.find((item) => item.id === SHARED_COLLECTION_ID)?.gifIds ?? [])];
    setWorkspace((current) => ({ ...current, manualImports: [gif, ...current.manualImports], gifMeta: { ...current.gifMeta, [gif.id]: meta }, collections: current.collections.map((collection) => collection.id === SHARED_COLLECTION_ID ? { ...collection, gifIds: sharedIds } : collection) }));
    setManualImportUrl('');
    setManualImportTitle('');
    await saveGifAsset(gif);
    await syncCollection(SHARED_COLLECTION_ID, sharedIds);
    await saveGifMeta(gif.id, meta);
    showToast('External GIF imported', 'success');
  };

  const handleClearAll = async () => {
    if (!user || favourites.length === 0) return;
    const { error } = await supabase.from('favourites').delete().eq('user_id', user.id);
    if (error) {
      showToast('Failed to clear favourites.', 'error');
      return;
    }
    setFavourites([]);
    showToast('All favourites cleared', 'info');
  };

  const handleLogout = async () => {
    await signOut();
    setSelectedGif(null);
    setPublicCollection(null);
    setPublicCollectionGifs([]);
    showToast('Signed out successfully', 'info');
  };

  const aiSuggestions = useMemo(() => searchQuery.trim() ? [`${searchQuery.toLowerCase()} reaction gif`, `${searchQuery.toLowerCase()} meme response`, `${searchQuery.toLowerCase()} dramatic reaction`] : [], [searchQuery]);

  const navigateToPage = (nextPage: Page) => {
    setPage(nextPage);
    window.location.hash = `#/${nextPage}`;
  };

  if (authLoading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="flex flex-col items-center gap-4 text-zinc-400"><div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /><p className="text-sm">Loading your session...</p></div></div>;

  if (route.type === 'public-collection') {
    return <div className="min-h-screen bg-zinc-950 text-white"><main className="max-w-6xl mx-auto px-4 py-10 space-y-6"><div className="flex items-center justify-between gap-4 flex-wrap"><div><h1 className="text-3xl font-bold text-white">{publicCollection?.name ?? 'Public Collection'}</h1><p className="text-zinc-500 text-sm mt-1">{publicCollection?.description ?? 'Shared collection view'}</p></div><a href="#/" className="secondary-btn no-underline">Back to app</a></div>{publicCollectionLoading && <div className="masonry-grid">{Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} height={[160, 200, 140, 220, 180][index % 5]} />)}</div>}{!publicCollectionLoading && publicCollection && <div className="masonry-grid">{publicCollectionGifs.map((gif, index) => <GifCard key={gif.id} gif={gif} index={index} onSelect={() => {}} isFavourited={false} onToggleFavourite={() => {}} notePreview="" isQueued={false} onQueueToggle={() => {}} />)}</div>}{!publicCollectionLoading && !publicCollection && <div className="empty-state"><div className="text-6xl mb-4">🔗</div><h3 className="text-xl font-bold text-zinc-300 mb-2">Collection not found</h3><p className="text-zinc-500 text-sm">This public collection does not exist or is no longer shared.</p></div>}</main><Toast {...toast} /></div>;
  }

  if (route.type === 'public-user') {
    return <div className="min-h-screen bg-zinc-950 text-white"><main className="max-w-6xl mx-auto px-4 py-10 space-y-6"><div className="flex items-center justify-between gap-4 flex-wrap"><div><h1 className="text-3xl font-bold text-white">{selectedUserProfile?.displayName ?? 'Public profile'}</h1><p className="text-zinc-500 text-sm mt-1">Shared favourites and public collections</p></div><a href="#/" className="secondary-btn no-underline">Back to app</a></div><UsersPage selectedUserProfile={selectedUserProfile} selectedUserCollections={selectedUserCollections} selectedUserFavourites={selectedUserFavourites} selectedUserLoading={selectedUserLoading} selectedUserPublicView /></main><Toast {...toast} /></div>;
  }

  if (!user) return <AuthPage />;

  return (
    <div className="min-h-screen bg-zinc-950 text-white" style={{ ['--accent' as string]: workspace.profile.accent }}>
      <header className="sticky top-0 z-40 bg-zinc-950/85 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center shadow-lg float-anim"><SparkleIcon /></div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight gradient-text leading-none">GIF Studio</h1>
                <p className="text-zinc-500 text-xs">Instagram GIF Favouriter for creators</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <div className="relative" ref={syncPanelRef}>
                <button type="button" onClick={() => setShowSyncDetails((current) => !current)} className={`flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold border ${syncStatus === 'live' ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200' : syncStatus === 'partial' ? 'border-sky-400/20 bg-sky-500/10 text-sky-200' : 'border-amber-400/20 bg-amber-500/10 text-amber-200'}`}><span className={`h-2 w-2 rounded-full ${syncStatus === 'live' ? 'bg-emerald-300' : syncStatus === 'partial' ? 'bg-sky-300' : 'bg-amber-300'}`} />{syncStatus === 'live' ? 'Live sync active' : syncStatus === 'partial' ? 'Partially synced' : 'Offline cache mode'}</button>
                {showSyncDetails && <div className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-white/10 bg-zinc-900/95 p-4 text-xs shadow-2xl backdrop-blur-xl z-50"><p className="text-white font-semibold mb-3">Sync details</p><div className="space-y-2"><div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Favourites</span><span className={favouritesOffline ? 'text-amber-300' : 'text-emerald-300'}>{favouritesOffline ? 'Cached' : 'Live'}</span></div><div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Collections</span><span className={workspaceOffline ? 'text-amber-300' : 'text-emerald-300'}>{workspaceOffline ? 'Cached' : 'Live'}</span></div><div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Metadata</span><span className={workspaceOffline ? 'text-amber-300' : 'text-emerald-300'}>{workspaceOffline ? 'Cached' : 'Live'}</span></div><div className="flex items-center justify-between gap-3"><span className="text-zinc-400">History</span><span className={workspaceOffline ? 'text-amber-300' : 'text-emerald-300'}>{workspaceOffline ? 'Cached' : 'Live'}</span></div><div className="flex items-center justify-between gap-3"><span className="text-zinc-400">Profile</span><span className={workspaceOffline ? 'text-amber-300' : 'text-emerald-300'}>{workspaceOffline ? 'Cached' : 'Live'}</span></div></div><div className="mt-3 flex items-center justify-between gap-3"><span className="text-zinc-500">Last sync</span><span className="text-zinc-300">{lastSyncAt ? new Date(lastSyncAt).toLocaleTimeString() : 'Not yet'}</span></div><p className="text-zinc-500 mt-3 leading-relaxed">Cached data appears when Supabase is unavailable. Live mode means the app is currently reading from Supabase.</p><button type="button" onClick={() => { void retrySync(); }} disabled={retryingSync} className="secondary-btn w-full mt-3 disabled:opacity-60 disabled:cursor-not-allowed">{retryingSync ? <><span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />Retrying...</> : 'Retry sync now'}</button></div>}
              </div>
              <nav className="flex items-center gap-1.5 bg-zinc-900 border border-white/10 rounded-2xl p-1 flex-wrap">
                {(['discover', 'favourites', 'toolbox', 'users', 'profile'] as Page[]).map((item) => <button key={item} onClick={() => navigateToPage(item)} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${page === item ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg shadow-violet-500/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>{item === 'discover' && <DiscoverIcon />}{item === 'favourites' && <FavouriteNavIcon />}{item === 'users' && <UsersIcon />}<span className="capitalize">{item}</span></button>)}
              </nav>
              <div className="flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-2xl px-3 py-2.5 min-w-[240px] max-w-full">
                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center text-xs font-bold text-white">{workspace.profile.avatarUrl ? <img src={workspace.profile.avatarUrl} alt="avatar" className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} /> : (workspace.profile.displayName || user.email || 'U').slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0"><p className="text-white text-sm font-semibold truncate">{workspace.profile.displayName || user.email || 'Signed in'}</p><p className="text-zinc-500 text-xs truncate">{user.email ?? 'Supabase account'}</p></div>
                <button onClick={handleLogout} className="ml-auto flex items-center gap-2 text-xs text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl transition-all duration-200"><LogoutIcon /><span className="hidden sm:inline">Logout</span></button>
              </div>
            </div>
          </div>
          {page === 'discover' && <div className="flex flex-col gap-3 lg:flex-row lg:items-center"><div className="flex items-center gap-3 bg-zinc-900 border border-white/10 rounded-2xl px-4 py-3 search-glow transition-all duration-300 flex-1"><span className="text-zinc-400 flex-shrink-0"><SearchIcon /></span><input ref={inputRef} type="text" placeholder="Search millions of GIFs or describe a reaction..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent text-white placeholder-zinc-500 text-sm font-medium outline-none" />{searchQuery && <button onClick={() => { setSearchQuery(''); inputRef.current?.focus(); }} className="text-zinc-500 hover:text-white transition-colors flex-shrink-0 hover:bg-white/10 p-1 rounded-full"><XIcon /></button>}{loading && <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />}</div><select value={moodFilter} onChange={(e) => setMoodFilter(e.target.value as MoodFilter)} className="bg-zinc-900 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white outline-none min-w-48">{MOOD_PRESETS.map((mood) => <option key={mood.value} value={mood.value}>{mood.label}</option>)}</select></div>}
          {page === 'discover' && aiSuggestions.length > 0 && <div className="flex gap-2 overflow-x-auto mt-3 pb-1 no-scrollbar">{aiSuggestions.map((suggestion) => <button key={suggestion} onClick={() => setSearchQuery(suggestion)} className="chip hover:bg-violet-500/20">Try: {suggestion}</button>)}</div>}
          {page === 'discover' && <div className="flex gap-2 overflow-x-auto mt-3 pb-1 no-scrollbar">{CATEGORIES.map((category) => <button key={category.value} onClick={() => { setActiveCategory(category.value); setSearchQuery(''); setOffset(0); }} className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105 ${activeCategory === category.value && !searchQuery ? 'pill-active' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-white/5'}`}>{category.label}</button>)}</div>}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {(workspaceLoading || favouritesLoading) && <div className="masonry-grid">{Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} height={[160, 200, 140, 220, 180][index % 5]} />)}</div>}
        {!workspaceLoading && page === 'discover' && <DiscoverPage currentLabel={currentLabel} analytics={analytics} loading={loading} gifs={gifs} hasMore={hasMore} loadingMore={loadingMore} fetchGifs={fetchGifs} searchQuery={searchQuery} activeCategory={activeCategory} offset={offset} addHistory={addHistory} isFavourited={isFavourited} handleToggleFavourite={handleToggleFavourite} workspace={workspace} isQueued={isQueued} handleQueueToggle={handleQueueToggle} recentHistory={recentHistory} manualImportTitle={manualImportTitle} setManualImportTitle={setManualImportTitle} manualImportUrl={manualImportUrl} setManualImportUrl={setManualImportUrl} importExternalGif={importExternalGif} />}
        {!workspaceLoading && page === 'favourites' && <FavouritesPage favouriteSearch={favouriteSearch} setFavouriteSearch={setFavouriteSearch} filterCollectionId={filterCollectionId} setFilterCollectionId={setFilterCollectionId} filterTag={filterTag} setFilterTag={setFilterTag} filterRating={filterRating} setFilterRating={setFilterRating} filterUsername={filterUsername} setFilterUsername={setFilterUsername} workspace={workspace} allTags={allTags} allUsernames={allUsernames} filteredFavourites={filteredFavourites} queuedGifs={queuedGifs} handleClearAll={handleClearAll} addHistory={addHistory} handleToggleFavourite={handleToggleFavourite} isQueued={isQueued} handleQueueToggle={handleQueueToggle} addGifToCollection={addGifToCollection} newCollectionName={newCollectionName} setNewCollectionName={setNewCollectionName} newCollectionDescription={newCollectionDescription} setNewCollectionDescription={setNewCollectionDescription} newCollectionPublic={newCollectionPublic} setNewCollectionPublic={setNewCollectionPublic} addCollection={addCollection} updateCollectionVisibility={updateCollectionVisibility} reorderQueue={reorderQueue} handleCopy={handleCopy} />}
        {!workspaceLoading && page === 'toolbox' && <ToolboxPage publicCollections={publicCollections} workspace={workspace} analytics={analytics} updateProfileField={updateProfileField} setPage={navigateToPage} handleCopy={handleCopy} />}
        {!workspaceLoading && page === 'users' && <UsersPage userSearch={userSearch} setUserSearch={setUserSearch} userSearchLoading={userSearchLoading} searchUsers={searchUsers} userResults={userResults} selectedUserProfile={selectedUserProfile} selectedUserCollections={selectedUserCollections} selectedUserFavourites={selectedUserFavourites} selectedUserLoading={selectedUserLoading} loadPublicUser={loadPublicUser} />}
        {!workspaceLoading && page === 'profile' && <ProfilePage workspace={workspace} updateProfileField={updateProfileField} user={user} gifMap={gifMap} giphyUsage={giphyUsage} />}
      </main>

      <footer className="border-t border-white/5 py-6 mt-10"><div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2"><p className="text-zinc-600 text-xs">GIF data provided by <span className="text-zinc-400 font-semibold">GIPHY</span></p><p className="text-zinc-700 text-xs">Profiles, collections, metadata, history, public sharing, and queue now persist through Supabase</p></div></footer>
      {selectedGif && <GifModal gif={selectedGif} onClose={() => setSelectedGif(null)} onCopy={handleCopy} isFavourited={isFavourited(selectedGif.id)} onToggleFavourite={handleToggleFavourite} note={workspace.gifMeta[selectedGif.id]?.notes ?? ''} tags={workspace.gifMeta[selectedGif.id]?.tags ?? []} onUpdateNote={(gif, note) => { void updateMeta(gif, (meta) => ({ ...meta, notes: note })); }} onAddTag={(gif, tag) => { void updateMeta(gif, (meta) => ({ ...meta, tags: Array.from(new Set([...meta.tags, tag.trim().toLowerCase()])) })); }} />}
      <Toast {...toast} />
    </div>
  );
}
