import { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Fence, Save, Undo2, Redo2, Trash2, Plus, Copy, House } from 'lucide-react';
import { MapWorkspace } from '../components/MapWorkspace';
import { downloadJson } from '../lib/downloads';
import { paintDesign } from '../domain/design-tools';
import { FarmCanvas } from '../components/FarmCanvas';
import { Sprite, useArtwork } from '../components/Artwork';
import type { CompanionContext } from '../companion';
import {
  blankDesign,
  updateLibrary,
  portableDesign,
  SharedDesignSchema,
  reconcileTransfer,
  moveGroup,
  type DesignLibrary,
  FarmDesignsSchema,
  FarmDesignSchema,
  qualifiedDesignItem,
  designObjectSupported,
  farmLayouts,
  homeLayouts,
  furnitureBrush,
  placementIssue,
  designMaterials,
  type DesignItem,
  type FarmDesign,
} from '../domain/farm-design';
import { TileMapSchema, type TileMap } from '../domain/tilemap';
import { getPersisted, setPersisted, desktop } from '../lib/backend';
import { localize, translate, useLocale } from '../lib/locale';
import { itemName } from '../domain/installed';
export function FarmDesignerView({
  save,
  search,
  mode = 'farm',
}: Pick<CompanionContext, 'save' | 'search'> & { mode?: 'farm' | 'home' }) {
  const [reloadLibrary, setReloadLibrary] = useState(0);
  const home = mode === 'home',
    scope = home ? 'home-designs' : 'farm-designs';
  const layouts = home ? homeLayouts : farmLayouts;
  const { data: art } = useArtwork();
  const locale = useLocale();
  const [design, setDesign] = useState(() =>
      blankDesign(
        home
          ? homeLayouts[Math.min(2, save?.players[0]?.houseUpgrade ?? 0)].name
          : farmLayouts.find((l) => l.name === save?.farmType)?.name,
      ),
    ),
    [saved, setSaved] = useState<FarmDesign[]>([]),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [confirmed, setConfirmed] = useState(false),
    [requestId, setRequestId] = useState<string | null>(null);
  const library = useRef<FarmDesign[]>([]);
  const pendingDraft = useRef<DesignLibrary | null>(null);
  const archive = useRef<DesignLibrary>(FarmDesignsSchema.parse({ version: 1, designs: [] }));
  const [archiveView, setArchiveView] = useState(archive.current);
  const sentDesign = useRef<FarmDesign | null>(null);
  const currentDesign = useRef(design);
  currentDesign.current = design;
  const [group, setGroup] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]),
    [locked, setLocked] = useState<string[]>([]);
  const [offsetX, setOffsetX] = useState(1),
    [offsetY, setOffsetY] = useState(0);
  const editable = (i: DesignItem) => !locked.includes(i.kind) && !hidden.includes(i.kind);
  const [map, setMap] = useState<TileMap | null>(null),
    [selected, setSelected] = useState<string | null>(null),
    [brush, setBrush] = useState<Omit<DesignItem, 'id' | 'x' | 'y'> | null>(null),
    [tool, setTool] = useState('select'),
    [zoom, setZoom] = useState(0),
    [grid, setGrid] = useState(true),
    [x, setX] = useState(0),
    [y, setY] = useState(0),
    [past, setPast] = useState<FarmDesign[]>([]),
    [future, setFuture] = useState<FarmDesign[]>([]),
    [dirty, setDirty] = useState(false),
    [palette, setPalette] = useState(home ? 'furniture' : 'objects'),
    [paletteSearch, setPaletteSearch] = useState(''),
    [paletteLimit, setPaletteLimit] = useState(100),
    [coverage, setCoverage] = useState(false),
    [furnitureType, setFurnitureType] = useState('all');
  useEffect(() => {
    let active = true;
    setError('');
    void getPersisted(scope)
      .then((raw) => {
        if (active) {
          archive.current = FarmDesignsSchema.parse(raw ?? { version: 1, designs: [] });
          setArchiveView(archive.current);
          const designs = archive.current.designs;
          setSaved(designs);
          library.current = designs;
          if (designs.length) setDesign(designs[designs.length - 1]);
          if (archive.current.pendingTransfer) {
            sentDesign.current = archive.current.pendingTransfer.sent;
            setRequestId(archive.current.pendingTransfer.requestId);
          }
          setReady(true);
        }
      })
      .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [reloadLibrary]);
  useEffect(() => {
    if (!ready || !dirty || !FarmDesignSchema.safeParse(design).success) return;
    const timer = setTimeout(() => {
      let value: DesignLibrary;
      try {
        value = updateLibrary(archive.current, [
          ...library.current.filter((d) => d.id !== design.id),
          design,
        ]);
      } catch (e) {
        setError(String(e));
        return;
      }
      const parsed = { data: value };
      archive.current = value;
      setArchiveView(value);
      const designs = parsed.data.designs;
      library.current = designs;
      pendingDraft.current = null;
      void setPersisted(scope, parsed.data)
        .then(() => {
          setSaved(library.current);
          if (currentDesign.current === design) setDirty(false);
        })
        .catch((e) => setError(String(e)));
    }, 800);
    try {
      pendingDraft.current = updateLibrary(archive.current, [
        ...library.current.filter((d) => d.id !== design.id),
        design,
      ]);
    } catch (e) {
      setError(String(e));
    }
    return () => clearTimeout(timer);
  }, [ready, dirty, design, saved]);
  // Flush the last valid draft when navigating away, before its debounce has elapsed.
  useEffect(
    () => () => {
      if (pendingDraft.current) void setPersisted(scope, pendingDraft.current).catch(() => {});
    },
    [],
  );
  useEffect(() => {
    setConfirmed(false);
  }, [design.updatedAt, save?.id]);
  useEffect(() => {
    if (!requestId) return;
    let active = true;
    const start = archive.current.pendingTransfer?.at ?? Date.now();
    const timer = setInterval(() => {
      void invoke<{
        requestId: string;
        state: string;
        applied: string[];
        error: string | null;
      } | null>('farm_layout_result')
        .then((result) => {
          if (!active) return;
          if (result?.requestId === requestId) {
            if (sentDesign.current) {
              const next = reconcileTransfer(
                currentDesign.current,
                sentDesign.current,
                result.applied,
              );
              setDesign(next);
              setDirty(true);
              setPast((p) =>
                p.map((d) => reconcileTransfer(d, sentDesign.current!, result.applied)),
              );
              setFuture((p) =>
                p.map((d) => reconcileTransfer(d, sentDesign.current!, result.applied)),
              );
              library.current = library.current.map((d) =>
                reconcileTransfer(d, sentDesign.current!, result.applied),
              );
              if (!library.current.some((d) => d.id === next.id)) library.current.push(next);
              archive.current = {
                ...archive.current,
                designs: library.current,
                history: archive.current.history.map((d) =>
                  reconcileTransfer(d, sentDesign.current!, result.applied),
                ),
              };
            }
            archive.current = {
              ...archive.current,
              pendingTransfer: null,
              transfers: [...archive.current.transfers, { ...result, at: Date.now() }].slice(-30),
            };
            pendingDraft.current = null;
            setArchiveView(archive.current);
            void setPersisted(scope, archive.current).catch((e) => setError(String(e)));
            setRequestId(null);
            setConfirmed(false);
            if (result.state === 'applied')
              setNotice(
                `${result.applied.length} placements applied in game. Review your farm before saving.`,
              );
            else
              setError(
                `${result.applied.length} placements applied. ${result.error ?? 'Transfer rejected.'}`,
              );
          } else if (Date.now() - start > 65000) {
            archive.current = { ...archive.current, pendingTransfer: null };
            void setPersisted(scope, archive.current).catch((e) => setError(String(e)));
            setRequestId(null);
            setError('No layout result was received. The request expired; no success is assumed.');
          }
        })
        .catch((e) => {
          if (active) {
            setRequestId(null);
            setError(String(e));
          }
        });
    }, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [requestId]);
  useEffect(() => {
    let active = true;
    setMap(null);
    if (desktop)
      void invoke('get_location_map', {
        location: layouts.find((l) => l.name === design.layout)?.map ?? layouts[0].map,
        season: save?.season ?? 'spring',
      })
        .then((raw) => active && setMap(TileMapSchema.parse(raw)))
        .catch((e) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [design.layout, art.root, save?.season]);
  function change(next: FarmDesign) {
    if (!ready) return;
    if (next.items.length > 1500) {
      setError('A design supports at most 1500 placements.');
      return;
    }
    if (next.id !== design.id && pendingDraft.current) {
      archive.current = pendingDraft.current;
      setArchiveView(archive.current);
      library.current = pendingDraft.current.designs;
      setSaved(library.current);
      void setPersisted(scope, pendingDraft.current).catch((e) => setError(String(e)));
      pendingDraft.current = null;
    }
    setPast((p) => [...p.slice(-49), design]);
    setFuture([]);
    setDesign({ ...next, updatedAt: Date.now() });
    setDirty(true);
    setNotice('');
  }
  const chosen = design.items.find((i) => i.id === selected);
  function tile(tx: number, ty: number) {
    if (
      !Number.isInteger(tx) ||
      !Number.isInteger(ty) ||
      tx < 0 ||
      ty < 0 ||
      tx > 255 ||
      ty > 255
    ) {
      setError('Enter whole tile coordinates between 0 and 255.');
      return;
    }
    setX(tx);
    setY(ty);
    setError('');
    if (tool === 'place' && brush) {
      const item = { ...brush, id: crypto.randomUUID(), x: tx, y: ty };
      const issue = placementIssue(item, design.items, map);
      if (issue?.includes('outside') || issue?.includes('overlaps')) {
        setError(issue);
        return;
      }
      change({ ...design, items: [...design.items, item] });
      setSelected(item.id);
    } else if (tool === 'move' && chosen) {
      const item = { ...chosen, x: tx, y: ty };
      const issue = placementIssue(item, design.items, map);
      if (issue?.includes('outside') || issue?.includes('overlaps')) {
        setError(issue);
        return;
      }
      change({ ...design, items: design.items.map((i) => (i.id === item.id ? item : i)) });
    }
  }
  const paletteQuery = (paletteSearch || search).toLocaleLowerCase();
  const furniture = useMemo(
    () =>
      art.items
        .filter(
          (i) =>
            i.kind === 'furniture' &&
            (furnitureType === 'all' ||
              String(art.gameData?.furniture?.[i.id.replace('furniture:', '')] ?? '').split(
                '/',
              )[1] === furnitureType) &&
            `${i.name} ${translate(i.name)}`.toLocaleLowerCase().includes(paletteQuery),
        )
        .map((i) => furnitureBrush(i.id, art))
        .filter((i): i is NonNullable<typeof i> => !!i)
        .sort((a, b) => {
          const types = ['bed', 'bed double', 'chair', 'table', 'couch', 'rug', 'decor'];
          const type = (id: string) =>
            String(art.gameData?.furniture?.[id.replace('furniture:', '')] ?? '').split('/')[1];
          const rank = (id: string) => {
            const n = types.indexOf(type(id));
            return n < 0 ? 99 : n;
          };
          return rank(a.itemId) - rank(b.itemId) || a.name.localeCompare(b.name);
        }),
    [art, paletteQuery, furnitureType, locale],
  );
  const recipes = Object.entries(art.recipes).filter(
    ([, r]) =>
      r.kind === 'crafting' &&
      designObjectSupported(r.output, art) &&
      r.name &&
      `${r.name} ${translate(r.name)}`.toLocaleLowerCase().includes(paletteQuery),
  );
  const buildings = Object.entries(art.gameData?.buildings ?? {}).filter(([id, b]) =>
    `${id} ${b.Name ?? ''} ${translate(b.Name ?? id)}`.toLocaleLowerCase().includes(paletteQuery),
  );
  const costs = useMemo(() => designMaterials(design, art), [design, art]);
  async function persist(designs: FarmDesign[]) {
    const value = updateLibrary(archive.current, designs);
    archive.current = value;
    setArchiveView(value);
    pendingDraft.current = null;
    library.current = value.designs;
    await setPersisted(scope, value);
    setSaved(library.current);
  }
  async function store() {
    setError('');
    try {
      await persist([...library.current.filter((d) => d.id !== design.id), design]);
      if (currentDesign.current === design) setDirty(false);
      setNotice(home ? 'Home design saved.' : 'Farm design saved.');
    } catch (e) {
      setError(String(e));
    }
  }
  const incompatible = home || Boolean(save && save.farmType !== design.layout);
  async function apply() {
    if (sending || requestId) return;
    setSending(true);
    setError('');
    setNotice('');
    try {
      // Validate storage capacity before sending a request that can change the world.
      updateLibrary(
        {
          ...archive.current,
          pendingTransfer: { requestId: 'preflight', sent: design, at: Date.now() },
        },
        [...library.current.filter((d) => d.id !== design.id), design],
      );
      sentDesign.current = design;
      const id = await invoke<string>('request_farm_layout', {
        path: save!.path,
        fingerprint: save!.fingerprint,
        farmerId: save!.players[0].id,
        design,
      });
      archive.current = updateLibrary(
        { ...archive.current, pendingTransfer: { requestId: id, sent: design, at: Date.now() } },
        [...library.current.filter((d) => d.id !== design.id), design],
      );
      library.current = archive.current.designs;
      setArchiveView(archive.current);
      setRequestId(id);
      await setPersisted(scope, archive.current);
      setNotice(
        'Layout request sent. Stand on your farm with the live connection active. Check the transfer result before saving.',
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setSending(false);
    }
  }
  return localize(
    <>
      <div className="view-intro">
        <div>
          <span className="eyebrow">
            {home ? 'ARRANGE YOUR OWN CORNER OF HOME' : 'PLAN YOUR OWN PATCH OF THE VALLEY'}
          </span>
          <h1>{home ? 'Home Designer' : 'Farm Designer'}</h1>
          <p>
            {home
              ? 'Arrange furniture on original home layouts. Home designs are saved separately in Companion.'
              : 'Design all eight original farms. Saved designs stay separate from your game save.'}
          </p>
        </div>
        {home ? <House size={32} /> : <Fence size={32} />}
      </div>
      {!ready && <p>Loading saved designs…</p>}
      {!ready && error && (
        <button className="button" onClick={() => setReloadLibrary((n) => n + 1)}>
          Retry saved data
        </button>
      )}
      <fieldset className="design-controls" disabled={!ready}>
        <div className="panel design-library">
          <label>
            Saved designs{' '}
            <select
              aria-label={home ? 'Saved home designs' : 'Saved farm designs'}
              value={saved.some((d) => d.id === design.id) ? design.id : ''}
              onChange={(e) => {
                const next = saved.find((d) => d.id === e.target.value);
                if (next) {
                  change(next);
                  setSelected(null);
                }
              }}
            >
              <option value="">Unsaved design</option>
              {saved.map((d) => (
                <option key={d.id} value={d.id} data-l10n="off">
                  {d.name} · {d.layout}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button"
            disabled={!ready}
            onClick={() => {
              change(blankDesign(design.layout));
              setSelected(null);
            }}
          >
            <Plus size={16} />
            New design
          </button>
          <button
            className="button"
            disabled={!ready}
            onClick={() => {
              change({ ...portableDesign(design), name: design.name.slice(0, 90) + ' (copy)' });
            }}
          >
            <Copy size={16} />
            Duplicate
          </button>
          <button
            className="button"
            disabled={!ready || !saved.some((d) => d.id === design.id)}
            onClick={() => {
              setDirty(false);
              void persist(saved.filter((d) => d.id !== design.id))
                .then(() => {
                  change(blankDesign(design.layout));
                  setSelected(null);
                })
                .catch((e) => setError(String(e)));
            }}
          >
            <Trash2 size={16} />
            Delete saved design
          </button>
        </div>
        <div className="toolbar design-toolbar">
          <label>
            Design name{' '}
            <input
              aria-label="Design name"
              maxLength={100}
              value={design.name}
              onChange={(e) => change({ ...design, name: e.target.value })}
            />
          </label>
          <label>
            {home ? 'Home layout' : 'Farm type'}{' '}
            <select
              aria-label={home ? 'Home design type' : 'Farm design type'}
              value={design.layout}
              onChange={(e) => {
                change({ ...design, layout: e.target.value as FarmDesign['layout'] });
                setSelected(null);
                setZoom(0);
              }}
            >
              {layouts.map((l) => (
                <option key={l.name} value={l.name}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button primary"
            disabled={!ready || !design.name.trim()}
            onClick={() => void store()}
          >
            <Save size={16} />
            Save design
          </button>
          <span>
            {dirty
              ? 'Unsaved changes'
              : saved.some((d) => d.id === design.id)
                ? 'Saved in Companion'
                : 'Unsaved design'}
          </span>
        </div>
        <section className="panel design-extras">
          <h2>Design library tools</h2>
          <button
            className="button"
            onClick={() =>
              downloadJson('companion-design.json', {
                format: 'stardew-companion-design',
                version: 1,
                design: portableDesign(design),
              })
            }
          >
            Export this design
          </button>
          <label className="button file-picker">
            Import a design{' '}
            <input
              type="file"
              accept=".json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  if (file.size > 1_000_000) throw Error('Design file exceeds limit');
                  const imported = portableDesign(
                    SharedDesignSchema.parse(JSON.parse(await file.text())).design,
                  );
                  if (home !== homeLayouts.some((l) => l.name === imported.layout))
                    throw Error('Open the matching home or farm designer first.');
                  change(imported);
                } catch (error) {
                  setError(String(error));
                }
              }}
            />
          </label>
          <details>
            <summary>Version history and deleted designs</summary>
            <p>Recent versions are kept within the library storage limit.</p>
            {archiveView.history
              .filter((d) => d.id === design.id)
              .slice()
              .reverse()
              .map((d, i) => (
                <button
                  className="button"
                  key={i}
                  onClick={() => change({ ...d, updatedAt: Date.now() })}
                >
                  Restore version {new Date(d.updatedAt).toLocaleString()}
                </button>
              ))}
            {archiveView.trash.map((d, i) => (
              <button
                className="button"
                key={i}
                onClick={() => {
                  archive.current = {
                    ...archive.current,
                    trash: archive.current.trash.filter((_, n) => n !== i),
                  };
                  setArchiveView(archive.current);
                  change({ ...d, id: crypto.randomUUID() });
                }}
              >
                Recover deleted design: <span data-l10n="off">{d.name}</span>
              </button>
            ))}
          </details>
          <details>
            <summary>Layers and group selection</summary>
            {(home ? ['furniture'] : ['object', 'building', 'crop', 'tree']).map((kind) => (
              <div key={kind}>
                <span>{kind}</span>
                <label>
                  <input
                    type="checkbox"
                    checked={!hidden.includes(kind)}
                    onChange={(e) => {
                      setHidden(
                        e.target.checked ? hidden.filter((k) => k !== kind) : [...hidden, kind],
                      );
                      setGroup([]);
                      setSelected(null);
                    }}
                  />
                  Visible
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={locked.includes(kind)}
                    onChange={(e) => {
                      setLocked(
                        e.target.checked ? [...locked, kind] : locked.filter((k) => k !== kind),
                      );
                      setGroup([]);
                      setSelected(null);
                    }}
                  />
                  Locked
                </label>
              </div>
            ))}
            <p>Shift-click or Shift-drag to select a group. Arrow keys move the selection.</p>
            <button
              className="button"
              onClick={() => setGroup(design.items.filter(editable).map((i) => i.id))}
            >
              Select editable items
            </button>
            <button className="button" onClick={() => setGroup([])}>
              Clear selection
            </button>
            <label>
              Group X offset{' '}
              <input
                type="number"
                value={offsetX}
                onChange={(e) => setOffsetX(Number(e.target.value))}
              />
            </label>
            <label>
              Group Y offset{' '}
              <input
                type="number"
                value={offsetY}
                onChange={(e) => setOffsetY(Number(e.target.value))}
              />
            </label>
            {[false, true].map((copy) => (
              <button
                key={String(copy)}
                className="button"
                disabled={!group.length}
                onClick={() => {
                  try {
                    change(moveGroup(design, group, offsetX, offsetY, copy, map));
                  } catch (e) {
                    setError(String(e));
                  }
                }}
              >
                {copy ? 'Copy selected group' : 'Move selected group'}
              </button>
            ))}
          </details>
        </section>
        <MapWorkspace
          title={translate(home ? 'Home Designer' : 'Farm Designer')}
          className="designer-workspace-shell"
        >
          <div className="design-workspace">
            <aside className="panel design-palette">
              <h2>Placement palette</h2>
              <div className="filter-tabs">
                {(home ? ['furniture'] : ['objects', 'buildings', 'plants']).map((p) => (
                  <button
                    key={p}
                    className={palette === p ? 'active' : ''}
                    onClick={() => setPalette(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <input
                className="palette-search"
                aria-label="Search placement palette"
                placeholder={translate('Search items…')}
                value={paletteSearch}
                onChange={(e) => {
                  setPaletteSearch(e.target.value);
                  setPaletteLimit(100);
                }}
              />
              <p className="fine-print">
                Drag items to move. Hold and drag to paint paths or crops. Right-drag erases planned
                items.
              </p>
              {home && (
                <select
                  aria-label="Furniture type"
                  value={furnitureType}
                  onChange={(e) => {
                    setFurnitureType(e.target.value);
                    setPaletteLimit(100);
                  }}
                >
                  <option value="all">All furniture</option>
                  {[
                    ...new Set(
                      Object.values(art.gameData?.furniture ?? {})
                        .filter((v): v is string => typeof v === 'string')
                        .map((v) => v.split('/')[1]),
                    ),
                  ]
                    .sort()
                    .map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                </select>
              )}
              <div className="palette-items">
                {home
                  ? furniture.slice(0, paletteLimit).map((b) => (
                      <button
                        key={b.itemId}
                        className={brush?.itemId === b.itemId ? 'selected' : ''}
                        onClick={() => {
                          setBrush(b);
                          setTool('place');
                        }}
                      >
                        <Sprite id={b.itemId} size={32} decorative />
                        <span>
                          {b.name}
                          <small>
                            {b.width} × {b.height}
                          </small>
                        </span>
                      </button>
                    ))
                  : palette === 'objects'
                    ? recipes.map(([id, r]) => (
                        <button
                          key={id}
                          className={brush?.recipe === id ? 'selected' : ''}
                          onClick={() => {
                            setBrush({
                              name: r.name!,
                              itemId: qualifiedDesignItem(r.output),
                              recipe: id,
                              kind: 'object',
                              width: 1,
                              height: 1,
                            });
                            setTool('place');
                          }}
                        >
                          <Sprite id={r.output} size={28} decorative />
                          <span>{r.name}</span>
                        </button>
                      ))
                    : palette === 'buildings'
                      ? buildings.map(([id, b]) => (
                          <button
                            key={id}
                            onClick={() => {
                              setBrush({
                                name: b.Name ?? id,
                                itemId: `building:${id}`,
                                kind: 'building',
                                width: b.Size?.X ?? 4,
                                height: b.Size?.Y ?? 4,
                              });
                              setTool('place');
                            }}
                          >
                            <Sprite id={`building:${id}`} size={36} decorative />
                            <span>{b.Name ?? id}</span>
                          </button>
                        ))
                      : Object.entries(art.gameData?.crops ?? {})
                          .filter(
                            ([, c]) =>
                              c.HarvestItemId &&
                              `${itemName(c.HarvestItemId, art)} ${translate(itemName(c.HarvestItemId, art))}`
                                .toLocaleLowerCase()
                                .includes(paletteQuery),
                          )
                          .map(([id, c]) => (
                            <button
                              key={id}
                              onClick={() => {
                                setBrush({
                                  name: itemName(c.HarvestItemId, art),
                                  itemId: `crop:${id}`,
                                  kind: 'crop',
                                  width: 1,
                                  height: 1,
                                });
                                setTool('place');
                              }}
                            >
                              <Sprite id={`crop:${id}`} size={28} decorative />
                              <span>{itemName(c.HarvestItemId, art)}</span>
                            </button>
                          ))}
              </div>
              {home && furniture.length > paletteLimit && (
                <button className="button" onClick={() => setPaletteLimit((n) => n + 100)}>
                  Show more furniture
                </button>
              )}
              {home && !furniture.length && (
                <p>Connect the installed game to load furniture and its footprints.</p>
              )}
            </aside>
            <section className="panel design-board">
              <div className="toolbar">
                <label>
                  Tool{' '}
                  <select
                    aria-label="Design tool"
                    value={tool}
                    onChange={(e) => setTool(e.target.value)}
                  >
                    <option value="select">Select / drag</option>
                    <option value="pan">Hand / pan</option>
                    <option value="erase">Eraser</option>
                    <option value="place">Place</option>
                    <option value="move">Move selected</option>
                  </select>
                </label>
                <button
                  className="icon-button"
                  aria-label="Undo design change"
                  disabled={!past.length}
                  onClick={() => {
                    setFuture((f) => [design, ...f]);
                    setDesign(past[past.length - 1]);
                    setPast((p) => p.slice(0, -1));
                    setDirty(true);
                  }}
                >
                  <Undo2 size={17} />
                </button>
                <button
                  className="icon-button"
                  aria-label="Redo design change"
                  disabled={!future.length}
                  onClick={() => {
                    setPast((p) => [...p, design]);
                    setDesign(future[0]);
                    setFuture((f) => f.slice(1));
                    setDirty(true);
                  }}
                >
                  <Redo2 size={17} />
                </button>
                <label>
                  <input
                    type="checkbox"
                    checked={grid}
                    onChange={(e) => setGrid(e.target.checked)}
                  />
                  Grid
                </label>
                {!home && (
                  <label>
                    <input
                      type="checkbox"
                      checked={coverage}
                      onChange={(e) => setCoverage(e.target.checked)}
                    />
                    Sprinkler coverage
                  </label>
                )}
              </div>
              {!map && (
                <p className="notice amber">
                  Original map unavailable. This is a planning grid; connect the installed game for
                  the real terrain.
                </p>
              )}
              <FarmCanvas
                map={map}
                tool={tool}
                brush={brush}
                onZoom={setZoom}
                coverage={coverage}
                hidden={hidden}
                locked={locked}
                selectedIds={group}
                onGroup={setGroup}
                onNudge={(dx, dy) => {
                  try {
                    change(
                      moveGroup(
                        design,
                        group.length ? group : selected ? [selected] : [],
                        dx,
                        dy,
                        false,
                        map,
                      ),
                    );
                  } catch (e) {
                    setError(String(e));
                  }
                }}
                onStroke={(cells, erase) => {
                  if (
                    !erase &&
                    brush &&
                    (locked.includes(brush.kind) || hidden.includes(brush.kind))
                  )
                    return;
                  const painted = paintDesign(design, cells, brush, erase, map);
                  const next = erase
                    ? {
                        ...painted,
                        items: design.items.filter(
                          (i) => !editable(i) || painted.items.some((n) => n.id === i.id),
                        ),
                      }
                    : painted;
                  if (next !== design) change(next);
                }}
                onMove={(id, tx, ty) => {
                  const original = design.items.find((i) => i.id === id);
                  if (!original || !editable(original) || (original.x === tx && original.y === ty))
                    return;
                  if (group.includes(id) && group.length > 1) {
                    try {
                      change(
                        moveGroup(
                          design,
                          group.filter((key) =>
                            design.items.some((i) => i.id === key && editable(i)),
                          ),
                          tx - original.x,
                          ty - original.y,
                          false,
                          map,
                        ),
                      );
                    } catch (e) {
                      setError(String(e));
                    }
                    return;
                  }
                  const item = { ...original, x: tx, y: ty };
                  const issue = placementIssue(item, design.items, map);
                  if (issue?.includes('outside') || issue?.includes('overlaps')) {
                    setError(issue);
                    return;
                  }
                  change({ ...design, items: design.items.map((i) => (i.id === id ? item : i)) });
                  setX(tx);
                  setY(ty);
                }}
                onDelete={() => {
                  if (chosen && editable(chosen)) {
                    change({ ...design, items: design.items.filter((i) => i.id !== selected) });
                    setSelected(null);
                  }
                }}
                onUndo={() => {
                  if (past.length) {
                    setFuture((f) => [design, ...f]);
                    setDesign(past[past.length - 1]);
                    setPast((p) => p.slice(0, -1));
                    setDirty(true);
                  }
                }}
                onRedo={() => {
                  if (future.length) {
                    setPast((p) => [...p, design]);
                    setDesign(future[0]);
                    setFuture((f) => f.slice(1));
                    setDirty(true);
                  }
                }}
                onCancel={() => {
                  setBrush(null);
                  setTool('select');
                }}

                design={design}
                zoom={zoom}
                grid={grid}
                selected={selected}
                onSelect={(id) => {
                  setSelected(id);
                  const item = design.items.find((i) => i.id === id)!;
                  setX(item.x);
                  setY(item.y);
                  setTool('move');
                }}
              />
              <div className="toolbar">
                <label>
                  X{' '}
                  <input
                    aria-label="Placement X"
                    type="number"
                    min="0"
                    max="255"
                    value={x}
                    onChange={(e) => setX(+e.target.value)}
                  />
                </label>
                <label>
                  Y{' '}
                  <input
                    aria-label="Placement Y"
                    type="number"
                    min="0"
                    max="255"
                    value={y}
                    onChange={(e) => setY(+e.target.value)}
                  />
                </label>
                <button
                  className="button"
                  disabled={
                    tool === 'select' ||
                    (tool === 'place' && !brush) ||
                    (tool === 'move' && !chosen)
                  }
                  onClick={() => tile(x, y)}
                >
                  Apply at coordinates
                </button>
                <button
                  className="button"
                  disabled={!chosen}
                  onClick={() => {
                    change({ ...design, items: design.items.filter((i) => i.id !== selected) });
                    setSelected(null);
                  }}
                >
                  Remove selected
                </button>
              </div>
              <p>
                {chosen?.name ?? brush?.name ?? translate('Select an item to begin')} ·{' '}
                {design.items.length} planned placements
              </p>
            </section>
          </div>
        </MapWorkspace>
        {home && (
          <section className="panel">
            <h2>Saved home design</h2>
            <p>
              Furniture uses original game artwork and tile footprints. Rugs may sit beneath other
              furniture. These are base home layouts; renovations, spouse decorations and existing
              furniture are not reconstructed. Designs are saved in Companion; furniture is not
              transferred into the game.
            </p>
          </section>
        )}
        {!home && (
          <section className="panel">
            <h2>Materials and game transfer</h2>
            <p>
              New crafted objects require the learned recipe and actual ingredients in the host
              farmer’s inventory. Existing farm objects can be moved without losing their contents.
              Buildings and plants remain design-only in this version.
            </p>
            <div className="design-costs">
              {Object.entries(costs.materials).map(([id, count]) => (
                <span key={id}>
                  <Sprite id={id} size={24} decorative />
                  {itemName(id, art)} × {count}
                </span>
              ))}
            </div>
            <p>
              {costs.unsupported} <span>placements without a crafting estimate</span>
            </p>
            <button
              className="button"
              disabled={!save || incompatible || !save.farmObjects?.length || !ready}
              onClick={() => {
                if (!save?.farmObjects) return;
                change({
                  ...design,
                  items: [
                    ...design.items,
                    ...save.farmObjects
                      .filter(
                        (o) =>
                          !design.items.some(
                            (i) =>
                              i.sourceTile?.[0] === o.tile[0] && i.sourceTile?.[1] === o.tile[1],
                          ),
                      )
                      .map((o) => ({
                        id: crypto.randomUUID(),
                        name: itemName(o.id, art),
                        itemId: o.id,
                        kind: 'object' as const,
                        width: 1,
                        height: 1,
                        x: o.tile[0],
                        y: o.tile[1],
                        sourceTile: o.tile,
                      })),
                  ],
                });
              }}
            >
              Import existing farm objects
            </button>
            {incompatible && (
              <p className="notice amber">
                The selected save has a different farm type. A design cannot change the save’s farm
                type.
              </p>
            )}
            <details>
              <summary>Transfer preview</summary>
              <p>
                Material totals are estimates. The game checks actual inventory and placement rules
                before applying.
              </p>
              <ul>
                {design.items.map((i) => (
                  <li key={i.id}>
                    {i.name}: {i.sourceTile?.join(', ') ?? 'New'} → {i.x}, {i.y} ·{' '}
                    {i.kind !== 'object'
                      ? 'Design only'
                      : i.sourceTile?.[0] === i.x && i.sourceTile?.[1] === i.y
                        ? 'Unchanged'
                        : 'Send'}
                  </li>
                ))}
              </ul>
            </details>
            <details>
              <summary>Transfer history</summary>
              {archiveView.transfers
                .slice()
                .reverse()
                .map((t) => (
                  <p key={t.requestId}>
                    {new Date(t.at).toLocaleString()} · {t.state} · {t.applied.length} · {t.error}
                  </p>
                ))}
            </details>
            <div className="design-transfer">
              <label className="checkbox-label">
                <input
                  id="design-confirm"
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                I understand this uses real inventory and changes the farm during play.
              </label>
              <button
                className="button primary"
                disabled={
                  !desktop ||
                  !confirmed ||
                  !save ||
                  incompatible ||
                  !!requestId ||
                  sending ||
                  !design.items.some((i) => i.kind === 'object')
                }
                onClick={() => void apply()}
              >
                Send supported placements to game
              </button>
            </div>
            <p className="fine-print">
              The game must be running through Companion. Stand on the farm, close menus and check
              the result. Occupied, blocked, unknown or unsupported placements are rejected; nothing
              is erased to make room.
            </p>
          </section>
        )}
      </fieldset>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="notice amber" role="alert">
          {error}
        </p>
      )}
    </>,
  );
}
