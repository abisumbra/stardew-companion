import { localize } from '../lib/locale';
import { Check, Plus, X, MapPin, Clock, CloudSun, AlertCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  emptyPlanner,
  type AccountState,
  type SaveProfile,
  type PlannerState,
} from '../domain/models';
import { entryById, guideFor, knowledge, versionFamily } from '../domain/knowledge';
import { calculateProgress, entryProgress, type ProgressItem } from '../domain/progress';
import { achievementProgress } from '../domain/achievements';
import { availability } from '../domain/planner';
import { Sources, Tag } from './common';
import { Sprite, useArtwork } from './Artwork';
import { FishGuide } from './FishGuide';
import { SocialGuide } from './SocialGuide';
import { fishProfiles } from '../domain/fishing';
import { villagerProfiles } from '../domain/social';
import { runtimeGuide, itemName } from '../domain/installed';
import { MonsterGuide } from './MonsterGuide';
import { InstalledGuide } from './InstalledGuide';
import { MachineGuide } from './MachineGuide';
import { detectedSupply, selectedFarmer } from '../domain/supplies';
import { ObjectiveGuide } from './ObjectiveGuide';
import { goalLabel, objectiveEvidence } from '../domain/objectives';
import { locationName } from '../domain/locations';
import { displayText } from '../domain/display-text';
import { WikiLink } from './WikiLink';
import { animalLabel } from '../domain/animals';
import { ItemPrices } from './ItemPrices';
export function DetailPanel({
  id,
  save,
  account,
  goals,
  onClose,
  onAdd,
  onError,
  socialFarmerId,
  onSocialFarmer,
  initialFishingRoute = 0,
  initialMagicBait = false,
  farmerId,
  planner = emptyPlanner(),
  onPlannerChange = () => {},
}: {
  id: string;
  save: SaveProfile | null;
  account: AccountState;
  goals: string[];
  onClose: () => void;
  onAdd: (id: string, plan?: { routeIndex: number; magicBait: boolean }) => void;
  onError: (e: unknown) => void;
  socialFarmerId: string;
  onSocialFarmer: (id: string) => void;
  initialFishingRoute?: number;
  initialMagicBait?: boolean;
  farmerId?: string | null;
  planner?: PlannerState;
  onPlannerChange?: (state: PlannerState) => void;
}) {
  const { data: art } = useArtwork();
  const farmer = save ? selectedFarmer(save, farmerId) : null;
  const farmerSave = save && farmer ? { ...save, players: [farmer] } : null;
  const [fishPlan, setFishPlan] = useState({
    routeIndex: initialFishingRoute,
    magicBait: initialMagicBait,
  });
  const entity = [...art.items, ...art.characters, ...art.monsters, ...(art.world ?? [])].find(
    (e) => e.id === id,
  );
  const recipe = art.recipes[id] ?? Object.values(art.recipes).find((r) => r.output === id);
  const fish =
    fishProfiles[id] ??
    (id.startsWith('object:') ? fishProfiles[id.replace('object:', 'fishing:')] : undefined);
  const npcName =
    id.startsWith('character:') || id.startsWith('friendship:')
      ? id.split(':').slice(1).join(':').split('_')[0]
      : null;
  const npc = npcName
    ? (villagerProfiles[npcName] ??
      (art.gameData?.characters?.[npcName]
        ? { name: npcName, source: 'wiki-villagers' }
        : undefined))
    : undefined;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>('button[aria-label="Close details"]')?.focus();
    const key = (e: KeyboardEvent) => {
      if(document.querySelector('dialog.map-workspace-dialog[open]'))return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const all = [
          ...ref.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input, select',
          ),
        ].filter((el) => el.getClientRects().length > 0 && !el.hasAttribute('disabled'));
        const first = all[0],
          last = all[all.length - 1];
        if (!all.length) {
          e.preventDefault();
          ref.current.focus();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current ||
            !ref.current.contains(document.activeElement))
        ) {
          e.preventDefault();
          last?.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last || !ref.current.contains(document.activeElement))
        ) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [id, onClose]);
  const entry = entryById.get(id),
    achievement = knowledge.steam.achievements.find((a) => a.id === id);
  const p =
      entry && save
        ? entryProgress(entry, farmer!, versionFamily(save.gameVersion) !== null)
        : null,
    g =
      entry && save
        ? (runtimeGuide(entry, art, farmerSave) ?? guideFor(entry, save.gameVersion))
        : entry
          ? (runtimeGuide(entry, art, null) ?? guideFor(entry, '1.6'))
          : undefined;
  const special: ProgressItem | undefined = save
    ? calculateProgress(farmerSave!)
        .criteria.flatMap((c) => c.items)
        .find((i) => i.id === id)
    : undefined;
  const ap = achievement ? achievementProgress(achievement, save, account, farmer?.id) : null;
  const [installedType, installedKey] = id.split(':');
  const installed = ['crop', 'location', 'building'].includes(installedType);
  const objective = ['museum', 'bundle', 'walnut', 'quest'].includes(installedType);
  const objectiveState = objectiveEvidence(id, save, art);
  const installedName =
    installedType === 'crop'
      ? itemName(art.gameData?.crops?.[installedKey]?.HarvestItemId ?? installedKey, art)
      : installedType === 'building'
        ? displayText(art.gameData?.buildings?.[installedKey]?.Name, installedKey)
        : installedType === 'location'
          ? locationName(installedKey, art)
          : undefined;
  const name =
    entry?.name ??
    achievement?.name ??
    special?.name ??
    (entity?.kind === 'animal' ? animalLabel(entity.name) : entity?.name) ??
    npc?.name ??
    installedName ??
    goalLabel(id, save, art);
  return localize(
    <div
      className="drawer-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside
        className={`drawer ${fish ? 'fishing-drawer' : npc ? 'social-drawer' : installed || id.startsWith('monster:') ? 'reference-drawer' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-name"
        tabIndex={-1}
        ref={ref}
      >
        <div className="drawer-top">
          <span className="eyebrow">FIELD NOTES</span>
          <div className="drawer-header-actions">
            {installedType !== 'quest' && Boolean(entry || achievement || special || objective) && (
              <button
                className="button primary detail-plan-action"
                disabled={
                  !save ||
                  !Boolean(entry || achievement || special || objective) ||
                  Boolean(entity && !entry && !special) ||
                  (goals.includes(id) && !fish) ||
                  p?.done === true ||
                  special?.done === true ||
                  objectiveState?.done === true
                }
                onClick={() => onAdd(id, fish ? fishPlan : undefined)}
              >
                {goals.includes(id) ? <Check size={17} /> : <Plus size={17} />}{' '}
                {goals.includes(id)
                  ? fish
                    ? 'Update fishing plan'
                    : 'In your planner'
                  : !entry && !achievement && !special && !objective
                    ? 'View-only profile'
                    : !save
                      ? 'Select a farm to plan'
                      : 'Add to Planner'}
              </button>
            )}
            <button className="icon-button" onClick={onClose} aria-label="Close details">
              <X size={21} />
            </button>
          </div>
        </div>
        <div className={`detail-symbol ${entry?.type ?? 'special'}`}>
          <Sprite id={id} name={name} size={entity?.kind === 'character' ? 128 : 72} decorative />
        </div>
        <Tag>
          {entry?.type ??
            entity?.kind ??
            (npc ? 'Villager' : null) ??
            (achievement ? 'Steam achievement' : 'Perfection objective')}
        </Tag>
        <h2 id="detail-name">{name}</h2>
        {save && save.players.length > 1 && !npc && (
          <label className="farmer-picker">
            Saved farmer
            <select
              aria-label="Detail farmer"
              value={farmer!.id}
              onChange={(e) => onSocialFarmer(e.target.value)}
            >
              {save.players.map((f) => (
                <option key={f.id} value={f.id} data-l10n="off">
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {entity?.description && (
          <p className="item-description">{displayText(entity.description)}</p>
        )}
        <ItemPrices id={id} save={save} farmerId={farmer?.id} />
        {entity?.kind === 'character' && art.sprites[`walking:${name}`] && (
          <div className="character-sprite-preview">
            <Sprite id={`walking:${name}`} name={`${name} character sprite`} size={96} />
            <span>In-game character sprite</span>
          </div>
        )}
        {!npc && (
          <div className="detail-status">
            {ap ? (
              <Tag tone={ap.status === 'Save Requirements Met' ? 'green' : 'amber'}>
                {ap.status}
              </Tag>
            ) : p?.done === true || special?.done === true || objectiveState?.done === true ? (
              <Tag tone="green">Confirmed complete</Tag>
            ) : p?.done === false || special?.done === false || objectiveState?.done === false ? (
              <Tag tone="amber">Missing from saved progress</Tag>
            ) : (
              <Tag>Progress unknown</Tag>
            )}
            {p?.known !== undefined && (
              <Tag>
                {p.known === null
                  ? 'Recipe knowledge unknown'
                  : p.known
                    ? 'Recipe learned'
                    : 'Recipe not learned'}
              </Tag>
            )}
          </div>
        )}
        {fish && (
          <FishGuide
            profile={fish}
            save={farmerSave}
            onError={onError}
            initialRoute={initialFishingRoute}
            initialMagicBait={initialMagicBait}
            onPlanChange={setFishPlan}
          />
        )}
        {id.startsWith('monster:') && (
          <MonsterGuide
            name={id.slice(8)}
            save={save}
            farmerId={farmer?.id}
            onFarmer={onSocialFarmer}
            onError={onError}
          />
        )}
        {(installed || id.startsWith('object:')) && (
          <InstalledGuide
            id={id}
            save={save}
            onAdd={onAdd}
            planner={planner}
            onPlannerChange={onPlannerChange}
          />
        )}
        <MachineGuide id={id} />
        {objective && save && (
          <ObjectiveGuide id={id} save={save} planner={planner} onChange={onPlannerChange} />
        )}
        {npc && (
          <SocialGuide
            name={npc.name}
            save={save}
            farmerId={socialFarmerId}
            onFarmer={onSocialFarmer}
            onError={onError}
          />
        )}
        {achievement && (
          <p className="muted">
            {achievement.description ?? 'Official description hidden in the public listing.'}
          </p>
        )}
        <details className="evidence-details">
          <summary>Saved progress & evidence</summary>
          <p>
            {p?.evidence.reason ??
              ap?.evidence.reason ??
              special?.evidence.reason ??
              objectiveState?.reason ??
              (entity
                ? 'Artwork and identity loaded from your installed Stardew Valley game. This gallery entry does not infer saved progress.'
                : 'Select a supported save to inspect this objective.')}
          </p>
          {special?.detail && <p>{special.detail}</p>}
        </details>
        {!fish && !npc && (g?.location || g?.time || g?.weather) && (
          <div className="detail-facts">
            {g.location && (
              <span>
                <MapPin size={16} />
                {g.location}
              </span>
            )}
            {g.time && (
              <span>
                <Clock size={16} />
                {g.time}
              </span>
            )}
            {g.weather && (
              <span>
                <CloudSun size={16} />
                {g.weather === 'any'
                  ? 'Any weather'
                  : `${g.weather} required · actual weather unknown`}
              </span>
            )}
            {g.seasons && (
              <p>
                {g.seasons.join(' · ')}
                {save && ` — ${availability(g.seasons, save.season, g.weather).reason}`}
              </p>
            )}
          </div>
        )}
        {!fish && !npc && !installed && !objective && !id.startsWith('monster:') && (
          <section>
            <h3>What to do next</h3>
            {g ? (
              <ol className="guide-steps">
                {g.steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            ) : ap ? (
              <ol className="guide-steps">
                {ap.guide.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            ) : special?.detail ? (
              <p>{special.detail}</p>
            ) : (
              <div className="notice">
                <AlertCircle size={18} />
                <p>
                  Collection membership is cataloged. A detailed, verified guide for this entry is
                  not yet bundled. Open the source below for gameplay instructions.
                </p>
              </div>
            )}
            {ap?.route && <div className="notice amber">{ap.route}</div>}
          </section>
        )}
        {g?.ingredients && (
          <section>
            <h3>Required ingredients</h3>
            <div className="ingredient-list">
              {g.ingredients.map((i) => {
                const stock = save && farmer ? detectedSupply(save, farmer, i.id, art) : null;
                const n = stock?.count ?? null;
                return localize(
                  <div key={i.id}>
                    <Sprite id={i.alternatives?.[0] ?? i.id} name={i.name} size={32} decorative />
                    <div>
                      <strong>
                        {i.quantity} × {i.name}
                      </strong>
                      <small>{i.acquire}</small>
                    </div>
                    <Tag tone={n !== null && n >= i.quantity ? 'green' : 'amber'}>
                      {n === null
                        ? 'Unknown'
                        : !stock?.known
                          ? `${n}+ detected · total unknown`
                          : `${n} detected`}
                    </Tag>
                  </div>,
                );
              })}
            </div>
            <p className="fine-print">
              Detected supplies exclude unsupported storage. World chest contents may need moving to
              your inventory or refrigerator.
            </p>
          </section>
        )}
        {!g?.ingredients && recipe && (
          <section>
            <h3>Recipe ingredients</h3>
            <div className="ingredient-list">
              {recipe.ingredients.map((i) => {
                const item = art.items.find((e) => e.id === `object:${i.id}`);
                const groups: Record<string, string> = {
                  '-6': 'Any milk',
                  '-5': 'Any egg',
                  '-4': 'Any fish',
                  '-75': 'Any vegetable',
                  '-80': 'Any forage greens',
                };
                const materialName = item?.name ?? groups[i.id] ?? `Ingredient category ${i.id}`;
                return localize(
                  <div key={i.id}>
                    <Sprite id={i.id} name={materialName} size={32} decorative />
                    <div>
                      <strong>
                        {i.quantity} × {materialName}
                      </strong>
                    </div>
                  </div>,
                );
              })}
            </div>
            <p className="fine-print">
              Produces {recipe.quantity}. Read from this game installation; recipe learning and
              completion are checked separately against your save.
            </p>
          </section>
        )}
        <section>
          <h3>Sources & verification</h3>
          <WikiLink id={id} name={name} onError={onError} />
          {entity && (
            <p className="fine-print">
              Original artwork © ConcernedApe. Read locally from your installed game; artwork is not
              bundled with Stardew Companion.
            </p>
          )}
          <Sources
            ids={
              (npc
                ? [
                    npc.source,
                    'wiki-friendship',
                    'wiki-event-data',
                    'wiki-marriage',
                    'wiki-stardrop-tea',
                  ]
                : fish
                  ? [
                      ...fish.sources,
                      fish.method === 'crab-pot' ? 'wiki-crab-pot' : 'wiki-magic-bait',
                      ...(fish.method === 'rod' ? ['wiki-training-rod'] : []),
                    ]
                  : undefined) ??
              g?.sources ??
              entry?.sources ??
              (achievement
                ? [
                    ...achievement.sources,
                    'wiki-achievements',
                    ...(achievement.name === 'Well-Read' ? ['wiki-books'] : []),
                    ...(achievement.name === 'Good Neighbors' ? ['wiki-giant-stump'] : []),
                  ]
                : undefined) ??
              special?.sources ??
              (objectiveState ? [objectiveState.source] : [])
            }
            onError={onError}
          />
          <p className="fine-print">
            {npc
              ? 'Character data comes from the installed game; social progress comes from the selected farmer’s disk save.'
              : g
                ? `Guide checked ${g.verifiedAt} · game ${g.versions.join(' / ')}`
                : entry
                  ? `Catalog checked ${entry.verifiedAt}; detailed guide coverage is incomplete.`
                  : achievement
                    ? 'Save requirements do not verify a Steam account unlock.'
                    : 'Reference data from the connected game installation.'}
          </p>
        </section>
      </aside>
    </div>,
  );
}
