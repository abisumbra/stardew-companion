import { localize } from '../lib/locale';
import { BookOpen, Check, ChevronRight } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { Sprite, useArtwork } from '../components/Artwork';
import { Tag } from '../components/common';
import { FishingBrowser } from '../components/FishingBrowser';
import { SocialBrowser } from '../components/SocialGuide';
import { MonsterBrowser } from '../components/MonsterGuide';
import { InstalledBrowser } from '../components/InstalledGuide';
import { guides, knowledge, versionFamily } from '../domain/knowledge';
import { entryProgress } from '../domain/progress';
import { selectedFarmer } from '../domain/supplies';

import type { CompanionContext } from '../companion';
import { titleCase } from '../companion';
import { encyclopediaCategories } from '../domain/categories';
import { displayText } from '../domain/display-text';
import { catalogLocations } from '../domain/locations';
import { animalLabel } from '../domain/animals';
import { auditArtwork } from '../domain/artwork-audit';
import { PricePreview } from '../components/ItemPrices';

export function EncyclopediaView({
  setDetail,
  encyclopediaType,
  setEncyclopediaType,
  save,
  matches,
  socialFarmerId,
  setSocialFarmerId,
}: Pick<
  CompanionContext,
  | 'setDetail'
  | 'encyclopediaType'
  | 'setEncyclopediaType'
  | 'save'
  | 'matches'
  | 'socialFarmerId'
  | 'setSocialFarmerId'
>) {
  const { data: art, loading } = useArtwork();
  const artworkAudit = useMemo(() => auditArtwork(art), [art]);
  const [galleryPage, setGalleryPage] = useState(0),
    [itemKind, setItemKind] = useState('all');
  const entities =
    encyclopediaType === 'characters'
      ? art.characters
      : encyclopediaType === 'monsters'
        ? art.monsters
        : encyclopediaType === 'items'
          ? art.items
          : encyclopediaType === 'world'
            ? (art.world ?? []).filter((e) => e.kind === 'animal')
            : null;
  const filtered = entities?.filter(
    (e) =>
      matches(e.kind === 'animal' ? animalLabel(e.name) : e.name) &&
      (encyclopediaType !== 'items' || itemKind === 'all' || e.kind === itemKind),
  );
  const pages = Math.max(1, Math.ceil((filtered?.length ?? 0) / 96));
  const visible = filtered?.slice(
    Math.min(galleryPage, pages - 1) * 96,
    (Math.min(galleryPage, pages - 1) + 1) * 96,
  );
  const catalogEntries = knowledge.entries.filter(
    (e) =>
      e.versions.includes(versionFamily(save?.gameVersion ?? null) ?? '1.6') &&
      (encyclopediaType === 'all' || e.type === encyclopediaType) &&
      matches(e.name),
  );
  useEffect(() => {
    setGalleryPage(0);
  }, [encyclopediaType, itemKind, filtered?.length]);
  return localize(
    <>
      <div className="view-intro">
        <div>
          <span className="eyebrow">KNOW A LITTLE, GROW A LOT</span>
          <h1>
            {encyclopediaCategories[encyclopediaType] ?? 'Encyclopedia'}
            {encyclopediaType === 'items' && itemKind !== 'all' ? ' · ' + titleCase(itemKind) : ''}
          </h1>
          <p>
            Items, recipes and the faces of the valley. Original artwork comes from your installed
            game.
          </p>
        </div>
        <Tag tone="green">
          <BookOpen size={13} />
          {Object.keys(guides).length} detailed guides
        </Tag>
      </div>
      {encyclopediaType === 'items' && (
        <div className="gallery-controls">
          <label>
            Item category{' '}
            <select
              aria-label="Item category"
              value={itemKind}
              onChange={(e) => setItemKind(e.target.value)}
            >
              <option value="all">All items</option>
              {[...new Set(art.items.map((e) => e.kind))].sort().map((kind) => (
                <option key={kind} value={kind}>
                  {titleCase(kind)}
                </option>
              ))}
            </select>
          </label>
          <span>{filtered?.length ?? 0} matching items</span>
        </div>
      )}
      {art.root && (
        <details className="artwork-audit">
          <summary>
            Artwork matching{' '}
            <b>
              {artworkAudit.matched} / {artworkAudit.total}
            </b>
          </summary>
          <p>
            All installed entries, collection items, recipe outputs and ingredients are checked
            together.
          </p>
          {artworkAudit.issues.length === 0 ? (
            <p>All available pictures are matched.</p>
          ) : (
            <ul>
              {artworkAudit.issues.map((e) => (
                <li key={e.id}>
                  {e.name} · {e.reason}
                </li>
              ))}
            </ul>
          )}
          {artworkAudit.unavailable.length > 0 && (
            <p>
              <span>Some unused game entries have no picture in the original assets:</span>{' '}
              {artworkAudit.unavailable.map((e) => (
                <span key={e.id}>{e.name} </span>
              ))}
            </p>
          )}
        </details>
      )}
      <div className="filter-tabs">
        {[
          'all',
          'fishing',
          'cooking',
          'crafting',
          'shipping',
          'crops',
          'forage',
          'locations',
          'buildings',
          'items',
          'characters',
          'monsters',
          'world',
        ].map((t) => (
          <button
            key={t}
            className={encyclopediaType === t ? 'active' : ''}
            onClick={() => setEncyclopediaType(t)}
          >
            {encyclopediaCategories[t]}
            <span>
              {t === 'locations'
                ? catalogLocations(art).length
                : ['crops', 'buildings'].includes(t)
                  ? Object.keys(art.gameData?.[t] ?? {}).length
                  : t === 'forage'
                    ? '↗'
                    : t === 'items'
                      ? art.items.length
                      : t === 'characters'
                        ? art.characters.length
                        : t === 'monsters'
                          ? art.monsters.length
                          : t === 'world'
                            ? (art.world?.filter((e) => e.kind === 'animal').length ?? 0)
                            : knowledge.entries.filter(
                                (e) =>
                                  e.versions.includes(
                                    versionFamily(save?.gameVersion ?? null) ?? '1.6',
                                  ) &&
                                  (t === 'all' || e.type === t),
                              ).length}
            </span>
          </button>
        ))}
      </div>
      {!art.root && (
        <div className="notice artwork-notice">
          {loading
            ? 'Loading installed game artwork…'
            : 'Connect your Stardew Valley game folder in Settings to see original item icons, portraits and monsters.'}
        </div>
      )}
      {encyclopediaType === 'fishing' ? (
        <FishingBrowser
          save={save}
          farmerId={socialFarmerId}
          matches={matches}
          onDetail={setDetail}
        />
      ) : encyclopediaType === 'characters' ? (
        <SocialBrowser
          save={save}
          matches={matches}
          onDetail={setDetail}
          farmerId={socialFarmerId}
          onFarmer={setSocialFarmerId}
        />
      ) : encyclopediaType === 'monsters' ? (
        <MonsterBrowser
          matches={matches}
          onDetail={setDetail}
          save={save}
          farmerId={socialFarmerId}
        />
      ) : ['crops', 'forage', 'locations', 'buildings'].includes(encyclopediaType) ? (
        <InstalledBrowser type={encyclopediaType} matches={matches} onDetail={setDetail} />
      ) : (
        <div className="encyclopedia-grid">
          {visible
            ? visible.map((e) => (
                <button
                  className={`encyclopedia-card entity-card ${e.kind}`}
                  key={e.id}
                  onClick={() => setDetail(e.id)}
                >
                  <Sprite
                    id={e.id}
                    name={e.name}
                    size={e.kind === 'character' ? 64 : 48}
                    decorative
                  />
                  <div>
                    <strong>
                      {displayText(
                        e.kind === 'animal' ? animalLabel(e.name) : e.name,
                        e.id,
                      ).replace(/_/g, ' · ')}
                    </strong>
                    <small>
                      {e.kind === 'character'
                        ? 'Portrait · ' +
                          (art.sprites[`walking:${e.name}`]
                            ? 'character sprite'
                            : 'installed artwork')
                        : e.kind === 'monster'
                          ? 'Monster · installed artwork'
                          : titleCase(e.kind)}
                    </small>
                    <PricePreview id={e.id} />
                  </div>
                  <ChevronRight size={15} />
                </button>
              ))
            : catalogEntries.map((e) => {
                const done = save
                  ? entryProgress(
                      e,
                      selectedFarmer(save, socialFarmerId),
                      versionFamily(save.gameVersion) !== null,
                    ).done
                  : null;
                return localize(
                  <button className="encyclopedia-card" key={e.id} onClick={() => setDetail(e.id)}>
                    <span className={`category-icon ${e.type}`}>
                      <Sprite id={e.id} name={e.name} size={40} decorative />
                    </span>
                    <div>
                      <strong>{e.name}</strong>
                      <small>
                        {titleCase(e.type)} · {guides[e.id] ? 'Detailed guide' : 'Catalog entry'}
                      </small>
                      <PricePreview id={e.id} />
                    </div>
                    {done === true ? (
                      <Check className="green-text" size={16} />
                    ) : (
                      <ChevronRight size={15} />
                    )}
                  </button>,
                );
              })}
        </div>
      )}
      {filtered?.length === 0 && !['characters', 'monsters'].includes(encyclopediaType) && (
        <div className="empty">
          <h3>
            {art.root
              ? 'No entries match your search'
              : loading
                ? 'Loading artwork…'
                : 'Game artwork is not connected'}
          </h3>
          <p>
            {art.root
              ? 'Try a different search or item category.'
              : 'Select your installed game folder in Settings to load the gallery.'}
          </p>
        </div>
      )}
      {!entities &&
        ['all', 'cooking', 'crafting', 'shipping'].includes(encyclopediaType) &&
        catalogEntries.length === 0 && (
          <div className="empty">
            <h3>No entries match your search</h3>
            <p>Try a different name or collection category.</p>
          </div>
        )}
      {filtered && pages > 1 && encyclopediaType !== 'characters' && (
        <div className="gallery-pagination">
          <button
            className="button"
            disabled={galleryPage === 0}
            onClick={() => setGalleryPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>
            Page {Math.min(galleryPage, pages - 1) + 1} of {pages}
          </span>
          <button
            className="button"
            disabled={galleryPage >= pages - 1}
            onClick={() => setGalleryPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </>,
  );
}
