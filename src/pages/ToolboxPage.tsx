import { Collection, Page, SectionCard } from '../App';

interface ToolboxPageProps {
  publicCollections: Collection[];
  workspace: { history: unknown[]; profile: { helperMode: boolean } };
  analytics: { importedCount: number; queued: number };
  updateProfileField: (nextProfile: { helperMode: boolean } & Record<string, unknown>) => void;
  setPage: (page: Page) => void;
  handleCopy: (text: string, label?: string) => void;
}

export function ToolboxPage({ publicCollections, workspace, analytics, updateProfileField, setPage, handleCopy }: ToolboxPageProps) {
  return (
    <div className="grid xl:grid-cols-2 gap-6">
      <SectionCard title="Synced Creator Toolbox" subtitle="Helper mode, public collections, and persistent analytics signals.">
        <div className="grid md:grid-cols-2 gap-4"><div className="panel-muted">Public collections: {publicCollections.length}</div><div className="panel-muted">Recent history items: {workspace.history.length}</div><div className="panel-muted">Imported GIFs: {analytics.importedCount}</div><div className="panel-muted">Queue size: {analytics.queued}</div></div>
        <div className="mt-4 flex items-center gap-3 flex-wrap"><button onClick={() => updateProfileField({ ...workspace.profile, helperMode: !workspace.profile.helperMode })} className="primary-btn">{workspace.profile.helperMode ? 'Disable' : 'Enable'} helper mode</button><button onClick={() => setPage('favourites')} className="secondary-btn">Open library</button></div>
      </SectionCard>
      <SectionCard title="Public Collections" subtitle="These can be opened directly from shared hash URLs.">
        <div className="space-y-3">{publicCollections.map((collection) => <div key={collection.id} className="collection-card"><div><p className="text-sm font-semibold text-white">{collection.name}</p><p className="text-xs text-zinc-500">{window.location.origin}{window.location.pathname}#/collections/{collection.id}</p></div><button onClick={() => handleCopy(`${window.location.origin}${window.location.pathname}#/collections/${collection.id}`, 'Collection link')} className="secondary-btn">Copy link</button></div>)}</div>
      </SectionCard>
    </div>
  );
}
