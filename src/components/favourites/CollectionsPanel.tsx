import type { Workspace } from "../../types";
import { SectionCard } from "../CardComponents";

interface CollectionsPanelProps {
  workspace: Workspace;
  newCollectionName: string;
  setNewCollectionName: (value: string) => void;
  newCollectionDescription: string;
  setNewCollectionDescription: (value: string) => void;
  newCollectionPublic: boolean;
  setNewCollectionPublic: (value: boolean) => void;
  addCollection: (name: string, desc: string, isPublic: boolean) => void;
  updateCollectionVisibility: (collectionId: string, isPublic: boolean) => void;
  handleCopy: (text: string, label?: string) => void;
}

export function CollectionsPanel({
  workspace,
  newCollectionName,
  setNewCollectionName,
  newCollectionDescription,
  setNewCollectionDescription,
  newCollectionPublic,
  setNewCollectionPublic,
  addCollection,
  updateCollectionVisibility,
  handleCopy,
}: CollectionsPanelProps) {
  return (
    <SectionCard title="Collections" subtitle="These collections now persist in Supabase.">
      <div className="space-y-3">
        <input
          value={newCollectionName}
          onChange={(e) => setNewCollectionName(e.target.value)}
          placeholder="Collection name"
          className="field"
        />
        <input
          value={newCollectionDescription}
          onChange={(e) => setNewCollectionDescription(e.target.value)}
          placeholder="Description"
          className="field"
        />
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={newCollectionPublic}
            onChange={(e) => setNewCollectionPublic(e.target.checked)}
          />{" "}
          Make public/shareable
        </label>
        <button
          onClick={() => addCollection(newCollectionName, newCollectionDescription, newCollectionPublic)}
          className="primary-btn w-full"
        >
          Create collection
        </button>
        <div className="space-y-2 max-h-80 overflow-auto pr-1">
          {workspace.collections.map((collection) => (
            <div key={collection.id} className="collection-card">
              <div>
                <p className="text-sm font-semibold text-white">{collection.name}</p>
                <p className="text-xs text-zinc-500">
                  {collection.description || "No description"} · {collection.gifIds.length} GIFs
                </p>
                <label className="mt-2 flex items-center gap-2 text-xs text-zinc-300">
                  <input
                    type="checkbox"
                    checked={collection.isPublic}
                    disabled={["all-favourites", "queue"].includes(collection.id)}
                    onChange={(e) => updateCollectionVisibility(collection.id, e.target.checked)}
                  />{" "}
                  Public
                </label>
              </div>
              <button
                onClick={() =>
                  handleCopy(
                    `${window.location.origin}${window.location.pathname}#/collections/${collection.id}`,
                    "Collection link"
                  )
                }
                className="secondary-btn"
              >
                Copy link
              </button>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
