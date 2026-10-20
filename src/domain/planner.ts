import type { Entry, Ingredient, PlannerState, SaveProfile, Season } from './models';
import { entryById, entriesFor, guideFor, knowledge, versionFamily } from './knowledge';
import { achievementProgress, achievementTier } from './achievements';
import { calculateProgress, entryProgress } from './progress';
import { fishProfiles, routesFor, routeChecks, timeLabel } from './fishing';
import type { ArtworkData } from '../components/Artwork';
import {
  runtimeGuide,
  acquisition,
  itemName,
  materialId,
  itemId,
  recipeUnlock,
  installedRecipe,
} from './installed';
import { installedMaterials, recipeRouteId } from './materials';
import { queryConditions, conditionsMet } from './conditions';
import {
  bundleProgress,
  museumProgress,
  walnutProgress,
  storyRoute,
  remainingOfferings,
} from './completion';
import { buildingCount, selectedFarmer, detectedSupply } from './supplies';
import { polycultureCrops, monocultureCrops, powerBooks } from './achievement-guidance';
import { stardrops, monsterGoals } from './knowledge';
import { allGifts } from './gifts';
import { villagerProfiles, birthdayDistance } from './social';
import { monsterLocations } from './monsters';

export type GraphNode = { id: string; dependencies: string[]; alternatives?: string[][] };
export function expandGraph(
  nodes: Map<string, GraphNode>,
  roots: string[],
  completed: Set<string> = new Set(),
): string[] {
  const result: string[] = [],
    visiting = new Set<string>(),
    visited = new Set<string>();
  function visit(id: string) {
    if (completed.has(id) || visited.has(id)) return;
    if (visiting.has(id)) throw new Error(`Dependency cycle at ${id}`);
    const n = nodes.get(id);
    if (!n) throw new Error(`Unknown dependency ${id}`);
    visiting.add(id);
    let deps = [...n.dependencies];
    if (n.alternatives?.length) {
      const route = [...n.alternatives].sort(
        (a, b) =>
          a.filter((x) => !completed.has(x)).length - b.filter((x) => !completed.has(x)).length,
      )[0];
      deps = [...deps, ...route];
    }
    for (const d of deps) visit(d);
    visiting.delete(id);
    visited.add(id);
    result.push(id);
  }
  roots.forEach(visit);
  return result;
}
export type Task = {
  id: string;
  title: string;
  goalIds: string[];
  dependencies: string[];
  category:
    | 'Available Now'
    | 'Almost Complete'
    | 'Check Conditions'
    | 'Seasonal'
    | 'Missing Materials'
    | 'Locked Behind Prerequisites'
    | 'Long-Term Goals'
    | 'Achievement Goals';
  reason: string;
  sources: string[];
  entryId?: string;
  manualDone: boolean;
  discrepancy: boolean;
};
export type Material = {
  id: string;
  name: string;
  required: number;
  available: number;
  missing: number;
  manual: boolean;
  acquire: string;
  sources: string[];
  seasons?: Season[];
  goals: string[];
  planned?: number;
  quantityKnown?: boolean;
};
export function availability(seasons: Season[] | undefined, season: Season, weather?: string) {
  if (seasons && !seasons.includes(season))
    return {
      state: 'seasonal' as const,
      reason: `Standard route: ${seasons.join(', ')}. Alternative routes may apply; check the guide.`,
    };
  if (weather && weather !== 'any')
    return {
      state: 'conditional' as const,
      reason: `Requires ${weather}; weather is unknown. Check in game.`,
    };
  return {
    state: 'available' as const,
    reason: 'Season matches the documented route; time and access conditions still apply.',
  };
}

export function buildPlan(save: SaveProfile, state: PlannerState, art?: ArtworkData) {
  const tasks = new Map<string, Task>(),
    materials = new Map<string, Material>(),
    f = selectedFarmer(save, state.farmerId);
  const farmerSave = { ...save, players: [f] };
  const specialItems = calculateProgress(farmerSave).criteria.flatMap((c) => c.items);
  const buildingTargets: Record<string, number> = {};
  for (const goal of state.goals.filter((g) => g.startsWith('building:'))) {
    let key = goal.slice(9);
    const count = Math.max(1, state.buildingTargets[key] ?? 1),
      seen = new Set<string>();
    while (key && !seen.has(key)) {
      seen.add(key);
      buildingTargets[key] = Math.max(buildingTargets[key] ?? 0, count);
      key = art?.gameData?.buildings?.[key]?.BuildingToUpgrade ?? '';
    }
  }
  const rootProductions = new Map<string, { entry: Entry; quantity: number }>();
  const qualityRequests = new Map<string, { id: string; quality: number }>();
  const supply: Record<string, number> = { ...save.storage };
  if (f.money !== null) supply['currency:gold'] = f.money;
  for (const [id, n] of Object.entries(f.inventory)) supply[id] = (supply[id] ?? 0) + n;
  // Overrides replace the confirmed total for a pool; never change game data.
  for (const [id, n] of Object.entries(state.resources)) supply[id] = n;
  const usedEntries = new Map<string, Set<string>>();
  const task = (
    id: string,
    title: string,
    goalId: string,
    category: Task['category'],
    reason: string,
    sources: string[],
    dependencies: string[] = [],
    entryId?: string,
  ) => {
    const existing = tasks.get(id);
    if (existing) {
      if (!existing.goalIds.includes(goalId)) existing.goalIds.push(goalId);
      existing.dependencies = [...new Set([...existing.dependencies, ...dependencies])];
      return existing;
    }
    const manualDone = state.completedSteps.includes(id);
    const t = {
      id,
      title,
      goalIds: [goalId],
      category,
      reason,
      sources,
      dependencies,
      entryId,
      manualDone,
      discrepancy: manualDone && id.startsWith('action:'),
    };
    tasks.set(id, t);
    return t;
  };
  const addMaterial = (i: Ingredient, goalId: string) => {
    const existing = materials.get(i.id);
    if (existing) {
      existing.required += i.quantity;
      if (!existing.goals.includes(goalId)) existing.goals.push(goalId);
    } else
      materials.set(i.id, {
        id: i.id,
        name: i.name,
        required: i.quantity,
        available: 0,
        missing: 0,
        manual: i.id in state.resources,
        acquire: i.acquire,
        sources: i.sources,
        seasons: i.seasons,
        goals: [goalId],
      });
  };
  const expandEntry = (entry: Entry, goalId: string) => {
    const p = entryProgress(entry, f, versionFamily(save.gameVersion) !== null);
    if (p.done === true) return;
    const used = usedEntries.get(entry.id);
    if (used) {
      used.add(goalId);
      for (const t of tasks.values())
        if (t.entryId === entry.id && !t.goalIds.includes(goalId)) t.goalIds.push(goalId);
      for (const dependency of tasks.get(`action:${entry.id}`)?.dependencies ?? []) {
        const material = dependency.startsWith('material:')
          ? materials.get(dependency.slice(9))
          : undefined;
        if (material && !material.goals.includes(goalId)) material.goals.push(goalId);
      }
      return;
    }
    usedEntries.set(entry.id, new Set([goalId]));
    if (p.done === null) {
      task(
        `action:${entry.id}`,
        `Verify ${entry.name} in game`,
        goalId,
        'Long-Term Goals',
        'Completion cannot be verified because the save section or game-version rule is unavailable. No missing-action claim is made.',
        entry.sources,
        [],
        entry.id,
      );
      return;
    }
    const g =
        (art ? runtimeGuide(entry, art, { ...save, players: [f] }) : undefined) ??
        guideFor(entry, save.gameVersion),
      deps: string[] = [];
    const fish = fishProfiles[entry.id];
    if (fish) {
      const preference = state.fishing?.[entry.id],
        magic = preference?.magicBait ?? false;
      const allRoutes = routesFor(fish, save.gameVersion);
      const routes = allRoutes.filter((r) => magic || !r.magicOnly);
      const seasonal = routes.filter(
        (r) => routeChecks(fish, r, { ...save, players: [f] }, magic).season === true,
      );
      const dated = seasonal.filter(
        (r) => !r.days || (save.day >= r.days[0] && save.day <= r.days[1]),
      );
      const route =
        (preference ? allRoutes[preference.routeIndex] : undefined) ??
        dated[0] ??
        seasonal[0] ??
        routes[0];
      const checks = routeChecks(fish, route, { ...save, players: [f] }, magic);
      task(
        `action:${entry.id}`,
        `${fish.method === 'crab-pot' ? 'Trap' : 'Catch'} ${entry.name}`,
        goalId,
        checks.season && checks.date !== false ? 'Check Conditions' : 'Seasonal',
        `Route: ${route.area}. ${route.directions.join(' ')} ${magic ? 'Equip Magic Bait; ordinary season, weather and time restrictions are waived. Festival access dates remain.' : `${timeLabel(route)}; ${route.weather === 'any' ? 'any weather' : route.weather + ' required'}.`} ${route.requirements.join(' ')}${checks.level ? ` Effective Fishing level ${checks.level}; buffs may contribute.` : ''} ${fish.method === 'crab-pot' ? 'Bait a Crab Pot in the correct water type and collect it the next day.' : 'Check the in-game clock, weather and equipment before travelling.'} Access is not automatically verified.`,
        fish.sources,
        [],
        entry.id,
      );
      return;
    }
    if (!g) {
      task(
        `action:${entry.id}`,
        `${{ cooking: 'Cook', crafting: 'Craft', fishing: 'Catch', shipping: 'Ship' }[entry.type]} ${entry.name}`,
        goalId,
        'Long-Term Goals',
        'The action is missing from this farmer’s save. Detailed acquisition guidance is not yet bundled.',
        entry.sources,
        [],
        entry.id,
      );
      return;
    }
    if ((entry.type === 'cooking' || entry.type === 'crafting') && p.known !== true) {
      const id = `unlock:${entry.id}`;
      deps.push(id);
      task(
        id,
        `Learn ${entry.name}`,
        goalId,
        'Locked Behind Prerequisites',
        g.unlock ?? 'Recipe unlock details are unavailable.',
        g.sources,
        [],
        entry.id,
      );
    }
    if (entry.type === 'cooking' && (f.houseUpgrade ?? 0) < 1) {
      deps.push('access:cooking');
      task(
        'access:cooking',
        'Arrange cooking access',
        goalId,
        'Locked Behind Prerequisites',
        'Upgrade the farmhouse for a kitchen, or use an available Cookout Kit. A placed kit is not detected.',
        g.sources,
      );
    }
    for (const i of g.ingredients ?? []) {
      addMaterial(i, goalId);
      deps.push(`material:${i.id}`);
    }
    const a = availability(g.seasons, save.season, g.weather);
    const recipe = art && installedRecipe(entry, art);
    if (recipe && (entry.type === 'cooking' || entry.type === 'crafting'))
      rootProductions.set(itemId(recipe.output), { entry, quantity: recipe.quantity });
    task(
      `action:${entry.id}`,
      `${{ cooking: 'Cook', crafting: 'Craft', fishing: 'Catch', shipping: 'Ship' }[entry.type]} ${entry.name}`,
      goalId,
      a.state === 'seasonal'
        ? 'Seasonal'
        : deps.some((d) => d.startsWith('unlock:') || d.startsWith('access:'))
          ? 'Locked Behind Prerequisites'
          : 'Available Now',
      g.steps.join(' ') + (entry.type === 'fishing' ? ` ${a.reason}` : ''),
      g.sources,
      deps,
      entry.id,
    );
  };
  const jobs = [...new Set(state.goals)].map((id) => ({ id, owner: id }));
  const attachOwner = (id: string, owner: string, seen = new Set<string>()): boolean => {
    if (seen.has(id)) return false;
    seen.add(id);
    if (id.startsWith('material:')) {
      const m = materials.get(id.slice(9));
      if (m && !m.goals.includes(owner)) m.goals.push(owner);
    }
    const t = tasks.get(id);
    if (!t) return false;
    if (!t.goalIds.includes(owner)) t.goalIds.push(owner);
    t.dependencies.forEach((dep) => attachOwner(dep, owner, seen));
    return true;
  };
  for (const { id: goalId, owner: goalOwner } of jobs) {
    if (attachOwner(`action:${goalId}`, goalOwner)) continue;
    if (art && goalId.startsWith('building:')) {
      const key = goalId.slice(9),
        b = art.gameData?.buildings?.[key];
      const target = buildingTargets[key] ?? 1;
      const current = buildingCount(save, key, art);
      if (!b || (current !== null && current >= target)) continue;
      if (!save.gameVersion?.startsWith('1.6')) {
        task(
          `action:${goalId}`,
          `Verify construction: ${b.Name ?? key}`,
          goalOwner,
          'Check Conditions',
          'Connected construction rules are for game 1.6; verify requirements for this older save.',
          ['wiki-buildings'],
        );
        continue;
      }
      const deps: string[] = [];
      for (const m of [
        ...(b.BuildMaterials ?? []),
        ...(b.BuildCost > 0 ? [{ ItemId: 'currency:gold', Amount: b.BuildCost }] : []),
      ]) {
        const id = itemId(m.ItemId);
        addMaterial(
          {
            id,
            name: id === 'currency:gold' ? 'Gold' : itemName(id, art),
            quantity: m.Amount * Math.max(1, target - (current ?? 0)),
            acquire: id === 'currency:gold' ? 'Earn gold.' : acquisition(id, art).join(' '),
            sources: ['wiki-buildings'],
          },
          goalOwner,
        );
        deps.push(`material:${id}`);
      }
      if (b.BuildingToUpgrade && (buildingCount(save, b.BuildingToUpgrade, art) ?? 0) < target) {
        const prereq = `action:building:${b.BuildingToUpgrade}`;
        deps.push(prereq);
        jobs.push({ id: `building:${b.BuildingToUpgrade}`, owner: goalOwner });
      }
      task(
        `action:${goalId}`,
        `Construct ${Math.max(1, target - (current ?? 0))} × ${b.Name ?? key}`,
        goalOwner,
        'Check Conditions',
        `Visit ${b.Builder ?? 'the builder'}. Construction takes ${b.BuildDays} day(s). ${b.BuildCondition ?? 'Verify space and construction access in game.'}`,
        ['wiki-buildings'],
        deps,
      );
      continue;
    }
    if (art && goalId.startsWith('museum:')) {
      const id = goalId.slice(7),
        donation = museumProgress(save, art).find((m) => m.id === id);
      if (donation?.done === true) continue;
      if (donation?.done === false)
        addMaterial(
          {
            id,
            name: itemName(id, art),
            quantity: 1,
            acquire: acquisition(id, art).join(' '),
            sources: ['wiki-museum'],
          },
          goalOwner,
        );
      task(
        `action:${goalId}`,
        `Donate ${itemName(id, art)} to the museum`,
        goalOwner,
        donation?.done === false ? 'Missing Materials' : 'Check Conditions',
        'Bring the item to Gunther and place it in the museum display. Only a saved donation confirms completion.',
        ['wiki-museum'],
        donation?.done === false ? [`material:${id}`] : [],
      );
      continue;
    }
    if (art && goalId.startsWith('bundle:')) {
      const id = goalId.slice(7),
        bundle = bundleProgress(save, art).find((b) => b.id === id);
      if (!bundle || bundle.done === true) continue;
      const choices = remainingOfferings(bundle, state.bundleChoices?.[id] ?? []),
        deps: string[] = [];
      if (storyRoute(save) === 'Joja') {
        task(
          `action:${goalId}`,
          `Route conflict: ${bundle.name}`,
          goalOwner,
          'Locked Behind Prerequisites',
          'Joja membership prevents finishing this Community Center bundle on the current route.',
          ['wiki-bundles'],
        );
        continue;
      }
      if (
        !bundle.fromSave ||
        bundle.items.some((i) => i.done === null) ||
        choices.length < bundle.required - bundle.current
      ) {
        task(
          `action:${goalId}`,
          `Choose offerings for ${bundle.name}`,
          goalOwner,
          'Check Conditions',
          'Open Completionist → Community Center, choose the remaining offerings and verify the saved bundle definition.',
          ['wiki-bundles'],
        );
        continue;
      }
      for (const i of bundle.items.filter((i) => !i.done && choices.includes(i.index))) {
        const material =
          i.id === '-1' ? 'currency:gold' : i.quality > 0 ? `quality:${i.quality}:${i.id}` : i.id;
        if (i.quality > 0 && i.id !== '-1')
          qualityRequests.set(material, { id: i.id, quality: i.quality });
        addMaterial(
          {
            id: material,
            name:
              i.id === '-1'
                ? 'Gold'
                : `${i.quality > 0 ? `${i.quality === 1 ? 'Silver' : i.quality === 2 ? 'Gold' : 'Iridium'}: ` : ''}${itemName(i.id, art)}`,
            quantity: i.quantity,
            acquire:
              i.id === '-1' ? 'Earn gold for the Vault payment.' : acquisition(i.id, art).join(' '),
            sources: ['wiki-bundles'],
          },
          goalOwner,
        );
        deps.push(`material:${material}`);
        if (i.quality > 0 && i.id !== '-1') {
          const stock = detectedSupply(save, f, i.id, art, i.quality);
          if (stock.known && stock.count >= i.quantity) continue;
          const check = `quality:${id}:${i.index}`;
          deps.push(check);
          task(
            check,
            `Check ${itemName(i.id, art)} quality`,
            goalOwner,
            'Check Conditions',
            `Requires ${i.quantity} at quality ${i.quality === 2 ? 'Gold' : i.quality === 1 ? 'Silver' : 'Iridium'} or better. ${stock.count} suitable saved items detected${stock.known ? '.' : '; some storage or quality data is unknown.'}`,
            ['wiki-bundles'],
          );
        }
      }
      task(
        `action:${goalId}`,
        `Complete ${bundle.name} in ${bundle.room}`,
        goalOwner,
        'Check Conditions',
        'Take the selected offerings to the Community Center and donate them; save and rescan.',
        ['wiki-bundles'],
        deps,
      );
      continue;
    }
    if (goalId.startsWith('walnut:')) {
      const w = walnutProgress(save).find((w) => w.id === goalId.slice(7));
      if (!w || w.done === true) continue;
      task(
        `action:${goalId}`,
        w.name,
        goalOwner,
        'Check Conditions',
        `${w.hint || w.name}. ${w.recorded === null ? 'Evidence is unavailable; verify this reward in game.' : `${w.count - w.recorded} remaining in this reward group.`}${w.method === 'limited' ? ' Random drops may take multiple attempts.' : ''}`,
        w.sources,
      );
      continue;
    }
    if (goalId.startsWith('quest:')) {
      const [, farmerId, id] = goalId.split(':'),
        owner = save.players.find((p) => p.id === farmerId),
        q = owner?.quests?.find((q) => q.id === id);
      if (q?.completed === true) continue;
      task(
        `action:${goalId}`,
        q?.title ?? `Check quest ${id}`,
        goalOwner,
        'Check Conditions',
        q
          ? `${q.description ?? ''} ${q.objective ?? ''}${q.daysLeft && q.daysLeft > 0 ? ` ${q.daysLeft} day(s) remaining.` : ''}`
          : 'This quest is no longer in the saved journal; completion is unknown.',
        ['wiki-quests'],
      );
      continue;
    }
    const e = entryById.get(goalId);
    if (e) {
      expandEntry(e, goalOwner);
      continue;
    }
    const a = knowledge.steam.achievements.find((a) => a.id === goalId);
    if (a) {
      const ap = achievementProgress(a, save, { version: 1, manuallyMarked: [] }, f.id);
      if (ap.status === 'Save Requirements Met') continue;
      const tier = achievementTier(a.name);
      let entries: Entry[] = [];
      if (tier) {
        entries = entriesFor(tier.type, save.gameVersion).filter(
          (e) => entryProgress(e, f).done !== true,
        );
        if (tier.total !== 'all')
          entries.sort(
            (x, y) =>
              Number(Boolean(guideFor(y, save.gameVersion))) -
              Number(Boolean(guideFor(x, save.gameVersion))),
          );
        entries = entries.slice(
          0,
          tier.total === 'all' ? undefined : Math.max(0, tier.total - (ap.current ?? 0)),
        );
      }
      if (a.name === 'Full Shipment')
        entries = entriesFor('shipping', save.gameVersion).filter(
          (e) => entryProgress(e, f).done !== true,
        );
      entries.forEach((e) => expandEntry(e, goalOwner));
      const children: string[] = [];
      const child = (id: string) => {
        jobs.push({ id, owner: goalOwner });
        children.push(`action:${id}`);
      };
      if (['A Complete Collection', 'Treasure Trove'].includes(a.name) && art) {
        const remaining = museumProgress(save, art).filter((m) => m.done === false);
        const count =
          a.name === 'Treasure Trove' ? Math.max(0, 40 - (ap.current ?? 0)) : remaining.length;
        remaining.slice(0, count).forEach((m) => child(`museum:${m.id}`));
      }
      if (a.name === 'Local Legend' && art && storyRoute(save) !== 'Joja')
        bundleProgress(save, art)
          .filter((b) => b.done !== true)
          .forEach((b) => child(`bundle:${b.id}`));
      if (a.name === 'Polyculture' || a.name === 'Monoculture') {
        const ids =
          a.name === 'Polyculture'
            ? polycultureCrops
            : [
                [...monocultureCrops].sort(
                  (x, y) => (f.shipped?.[y] ?? 0) - (f.shipped?.[x] ?? 0),
                )[0],
              ];
        const target = a.name === 'Polyculture' ? 15 : 300;
        for (const id of ids) {
          const missing = Math.max(0, target - (f.shipped?.[id] ?? 0));
          if (!missing) continue;
          const action = `shipment:${a.id}:${id}`;
          children.push(action);
          if (art)
            addMaterial(
              {
                id,
                name: itemName(id, art),
                quantity: missing,
                acquire: acquisition(id, art).join(' '),
                sources: ['wiki-collections'],
              },
              goalOwner,
            );
          task(
            action,
            `Ship ${missing} × ${art ? itemName(id, art) : id}`,
            goalOwner,
            'Missing Materials',
            'Use the shipping bin; the target is a shipped quantity, not ownership.',
            ['wiki-collections'],
            art ? [`material:${id}`] : [],
            `shipping:${id}`,
          );
        }
      }
      if (a.name === 'Mystery Of The Stardrops')
        specialItems
          .filter((i) => i.id.startsWith('stardrop:') && i.done !== true)
          .forEach((i) => child(i.id));
      if (a.name === 'Protector Of The Valley')
        specialItems
          .filter((i) => i.id.startsWith('monster:') && i.done !== true)
          .forEach((i) => child(i.id));
      if (a.name === 'Master Of The Five Ways' || a.name === 'Singular Talent')
        specialItems
          .filter((i) => i.id.startsWith('skill:') && i.done !== true)
          .slice(0, a.name === 'Singular Talent' ? 1 : undefined)
          .forEach((i) => child(i.id));
      if (a.name === 'Perfection')
        specialItems.filter((i) => i.done !== true).forEach((i) => child(i.id));
      if (a.name === 'Well-Read' && art)
        for (const id of powerBooks.filter((id) => (f.booksRead?.[id] ?? f.stats[id] ?? 0) === 0)) {
          const action = `read:${id}`;
          children.push(action);
          addMaterial(
            {
              id,
              name: itemName(id, art),
              quantity: 1,
              acquire: acquisition(id, art).join(' '),
              sources: ['wiki-books'],
            },
            goalOwner,
          );
          task(
            action,
            `Read ${itemName(id, art)}`,
            goalOwner,
            'Check Conditions',
            'Use the book from the inventory; owning it does not grant the permanent power.',
            ['wiki-books'],
            [`material:${id}`],
          );
        }
      task(
        `achievement:${a.id}`,
        a.name,
        goalOwner,
        'Achievement Goals',
        ap.guide.join(' '),
        a.sources,
        [...entries.map((e) => `action:${e.id}`), ...children],
      );
      continue;
    }
    const special = specialItems.find((i) => i.id === goalId);
    if (special && special.done !== true) {
      const deps: string[] = [];
      if (goalId.startsWith('skill:')) {
        const skill = goalId.slice(6),
          steps: Record<string, string[]> = {
            farming: [
              'Plant crops suited to the current season and water them until harvest.',
              'Harvest the crops yourself and care for farm animals.',
            ],
            fishing: [
              'Use a fishing rod at an accessible shore and land catches.',
              'Choose fish routes suitable for your current fishing level.',
            ],
            foraging: [
              'Collect forage and chop mature trees; replant a renewable supply.',
              'Use an upgraded axe when larger wood sources are available.',
            ],
            mining: [
              'Enter unlocked mine floors and break ore nodes and rocks.',
              'Prepare food and a pickaxe before descending.',
            ],
            combat: [
              'Fight monsters on suitable mine floors.',
              'Bring healing food and a weapon suited to the enemy.',
            ],
          };
        (steps[skill] ?? []).forEach((reason, index) => {
          const step = `practice:${skill}:${index}`;
          deps.push(step);
          task(
            step,
            `${skill}: level ${f.skills[skill] ?? '?'} → 10`,
            goalOwner,
            'Long-Term Goals',
            reason,
            ['wiki-skills'],
          );
        });
      }
      if (goalId.startsWith('friendship:')) {
        const name = goalId.slice(11),
          detail = f.friendshipDetails?.[name];
        if (detail?.talkedToToday !== true) {
          const step = `talk:${name}`;
          deps.push(step);
          task(
            step,
            `Talk to ${name}`,
            goalOwner,
            'Check Conditions',
            'Find the villager using their saved-date schedule. Unsaved conversations are not visible.',
            ['wiki-friendship'],
            [],
            `friendship:${name}`,
          );
        }
        const gifts = art
          ? allGifts(name, art)
              .filter((g) => g.taste === 'love')
              .sort(
                (a, b) =>
                  Number((f.inventory[b.id.replace('object:', '')] ?? 0) > 0) -
                  Number((f.inventory[a.id.replace('object:', '')] ?? 0) > 0),
              )
          : [];
        const gift = gifts[0],
          step = `gift:${name}`;
        deps.push(step);
        const birthday =
          villagerProfiles[name] && birthdayDistance(villagerProfiles[name], save) === 0;
        const allowed =
          (detail?.giftsToday ?? 0) < 1 &&
          ((detail?.giftsThisWeek ?? 0) < 2 || birthday || f.spouse === name);
        task(
          step,
          allowed ? `Give ${name} a loved gift` : `Wait for the next gift opportunity: ${name}`,
          goalOwner,
          'Check Conditions',
          `${gift ? `Suggested gift: ${gift.name}. ` : ''}Check the daily and weekly gift limits.${birthday ? ' Birthday on the saved day.' : ''} Repeat conversations and suitable gifts until the saved heart target is met.`,
          ['wiki-friendship'],
          [],
          `friendship:${name}`,
        );
      }
      if (goalId.startsWith('monster:')) {
        const g = monsterGoals.find((g) => g.name === goalId.slice(8));
        if (g) {
          const n = g.types.reduce((n, id) => n + (f.monsters?.[id] ?? 0), 0),
            target =
              g.name === 'Cave Insects' && save.gameVersion?.startsWith('1.5') ? 125 : g.total,
            step = `combat:${g.name}`;
          deps.push(step);
          task(
            step,
            `Defeat ${Math.max(0, target - n)} more ${g.name}`,
            goalOwner,
            'Check Conditions',
            `${g.types.join(' / ')}. Regions: ${[...new Set(g.types.map((t) => monsterLocations[t]).filter(Boolean))].join(' / ')}. Prepare healing and suitable equipment; consult the monster combat guide.`,
            ['wiki-monsters'],
            [],
            goalId,
          );
        }
      }
      if (goalId === 'stardrop:CF_Fish')
        for (const e of entriesFor('fishing', save.gameVersion).filter(
          (e) => entryProgress(e, f).done !== true,
        )) {
          jobs.push({ id: e.id, owner: goalOwner });
          deps.push(`action:${e.id}`);
        }
      if (goalId === 'stardrop:museumComplete' && art)
        for (const m of museumProgress(save, art).filter((m) => m.done === false)) {
          jobs.push({ id: `museum:${m.id}`, owner: goalOwner });
          deps.push(`action:museum:${m.id}`);
        }
      if (goalId === 'walnuts:remaining')
        for (const w of walnutProgress(save).filter((w) => w.done !== true)) {
          jobs.push({ id: `walnut:${w.id}`, owner: goalOwner });
          deps.push(`action:walnut:${w.id}`);
        }
      if (art && ['stardrop:CF_Statue', 'stardrop:CF_Sewer'].includes(goalId)) {
        const id = goalId === 'stardrop:CF_Statue' ? '417' : 'currency:gold',
          quantity = id === '417' ? 1 : 20000;
        addMaterial(
          {
            id,
            name: id === '417' ? itemName(id, art) : 'Gold',
            quantity,
            acquire:
              id === '417' ? acquisition(id, art).join(' ') : 'Earn gold for Krobus’s Stardrop.',
            sources: ['wiki-stardrop'],
          },
          goalOwner,
        );
        deps.push(`material:${id}`);
      }
      task(
        `action:${special.id}`,
        `Complete ${special.name}`,
        goalOwner,
        'Long-Term Goals',
        goalId.startsWith('stardrop:')
          ? (stardrops.find((s) => `stardrop:${s.id}` === goalId)?.steps ?? special.evidence.reason)
          : (special.detail ?? special.evidence.reason),
        special.sources,
        deps,
      );
    }
  }
  const qualityStacks = [...(f.inventoryStacks ?? []), ...(save.storageStacks ?? [])].map((s) => ({
    ...s,
  }));
  for (const [key, requirement] of [...qualityRequests].sort(
    ([, a], [, b]) => b.quality - a.quality,
  )) {
    let left = materials.get(key)?.required ?? 0,
      available = 0;
    for (const stack of qualityStacks
      .filter((s) => s.id === requirement.id && s.quality >= requirement.quality)
      .sort((a, b) => a.quality - b.quality)) {
      const take = Math.min(left, stack.quantity);
      available += take;
      left -= take;
      stack.quantity -= take;
    }
    supply[key] = state.resources[key] ?? available;
    supply[requirement.id] = Math.max(0, (supply[requirement.id] ?? 0) - available);
  }
  let materialsResolved = false;
  let acquisitionOptions: {
    id: string;
    name: string;
    selected: string;
    options: { id: string; label: string }[];
  }[] = [];
  if (art && save.gameVersion?.startsWith('1.6') && Object.keys(art.recipes).length) {
    const original = new Map(materials),
      demand: Record<string, number> = {};
    for (const m of materials.values())
      demand[materialId(m.id)] = (demand[materialId(m.id)] ?? 0) + m.required;
    try {
      const resolved = installedMaterials(demand, supply, art, state.resolveIntermediate, {
        owners: Object.fromEntries([...materials.values()].map((m) => [materialId(m.id), m.goals])),
        planned: Object.fromEntries(
          [...rootProductions].map(([output, r]) => [output, r.quantity]),
        ),
        routes: {
          ...state.acquisitionRoutes,
          ...Object.fromEntries(
            [...rootProductions].flatMap(([id, root]) => {
              const recipe = installedRecipe(root.entry, art);
              return recipe ? [[id, recipeRouteId(recipe)]] : [];
            }),
          ),
        },
        learned: (r) => {
          const e = knowledge.entries.find(
            (e) =>
              e.type === r.kind &&
              (e.type === 'crafting'
                ? e.key.toLowerCase() === r.name?.toLowerCase()
                : e.key === itemId(r.output)),
          );
          return e ? (entryProgress(e, f).known ?? null) : null;
        },
        accessible: (r) => conditionsMet(queryConditions(r.accessCondition, save, f)),
      });
      materialsResolved = true;
      materials.clear();
      acquisitionOptions = [
        ...new Set([...Object.keys(demand), ...Object.keys(resolved.crafts)]),
      ].flatMap((id) => {
        const alternatives = resolved.alternatives.get(id) ?? [];
        if (!alternatives.length || rootProductions.has(id)) return [];
        return [
          {
            id,
            name: itemName(id, art),
            selected: resolved.recipes.has(id)
              ? recipeRouteId(resolved.recipes.get(id)!)
              : 'gather',
            options: [
              { id: 'gather', label: 'Acquire the finished item' },
              ...alternatives.map((r) => ({
                id: recipeRouteId(r),
                label: `${r.kind === 'purchase' ? 'Buy' : r.kind === 'machine' ? 'Process' : 'Make'}: ${r.name ?? itemName(id, art)} · ${r.ingredients.map((i) => `${i.quantity} × ${itemName(i.id, art)}`).join(' + ')}`,
              })),
            ],
          },
        ];
      });
      for (const [id, leaf] of Object.entries(resolved.leaves)) {
        const old = original.get(id);
        materials.set(id, {
          id,
          name: old?.name ?? itemName(id, art),
          ...leaf,
          manual: id in state.resources,
          acquire: old?.acquire ?? acquisition(id, art).join(' '),
          sources: old?.sources ?? ['wiki-recipe-data'],
          goals: resolved.owners[id] ?? old?.goals ?? [],
        });
      }
      for (const [output, batches] of Object.entries(resolved.crafts)) {
        const recipe = resolved.recipes.get(output)!;
        const catalog = knowledge.entries.find(
          (e) =>
            recipe.kind === e.type &&
            (e.type === 'crafting'
              ? e.key.toLowerCase() === recipe.name?.toLowerCase()
              : e.key === output),
        );
        const learned =
          recipe.kind === 'machine' || recipe.kind === 'purchase'
            ? true
            : catalog
              ? entryProgress(catalog, f).known
              : null;
        const root = rootProductions.get(output);
        const unlock = catalog ? `unlock:${catalog.id}` : `unlock:intermediate:${output}`,
          action = root ? `action:${root.entry.id}` : `produce:${output}`;
        for (const owner of resolved.owners[output] ?? []) {
          if (recipe.machineId)
            task(
              `machine:${recipe.machineId}`,
              `Arrange ${recipe.name} access`,
              owner,
              'Check Conditions',
              'Verify that this machine is available and accessible. Placed machine ownership and its processing queue are not inferred.',
              ['wiki-machines'],
            );
          if (recipe.shopId)
            task(
              `shop:${recipe.shopId}`,
              `Visit ${recipe.shopId}`,
              owner,
              'Check Conditions',
              `Verify shop access, current stock and the listed price. ${queryConditions(
                recipe.accessCondition,
                save,
                f,
              )
                .map((c) => c.text)
                .join(' · ')}`,
              ['wiki-collections'],
            );
          if (learned !== true)
            task(
              unlock,
              `Learn ${recipe.name}`,
              owner,
              'Locked Behind Prerequisites',
              recipeUnlock(recipe, art).join(' '),
              ['wiki-recipe-data'],
            );
          if (recipe.kind === 'cooking' && (f.houseUpgrade ?? 0) < 1)
            task(
              'access:cooking',
              'Arrange cooking access',
              owner,
              'Locked Behind Prerequisites',
              'Use a kitchen or an accessible Cookout Kit.',
              ['wiki-cooking'],
            );
          task(
            action,
            recipe.kind === 'purchase'
              ? `Buy ${batches * recipe.quantity} × ${itemName(output, art)} from ${recipe.shopId}`
              : recipe.kind === 'machine'
                ? `Process ${batches} batch(es) in ${recipe.name}`
                : `${recipe.kind === 'cooking' ? 'Cook' : 'Craft'} ${batches} batch(es) of ${recipe.name}`,
            owner,
            learned === true ? 'Missing Materials' : 'Locked Behind Prerequisites',
            `Produces ${batches * recipe.quantity}. ${recipe.ingredients.map((i) => `${batches * i.quantity} × ${itemName(i.id, art)}`).join(' · ')}`,
            ['wiki-recipe-data'],
            [
              ...(learned !== true ? [unlock] : []),
              ...(recipe.machineId ? [`machine:${recipe.machineId}`] : []),
              ...(recipe.shopId ? [`shop:${recipe.shopId}`] : []),
              ...(recipe.kind === 'cooking' && (f.houseUpgrade ?? 0) < 1 ? ['access:cooking'] : []),
              ...recipe.ingredients.map((i) =>
                resolved.crafts[materialId(i.id)]
                  ? rootProductions.has(materialId(i.id))
                    ? `action:${rootProductions.get(materialId(i.id))!.entry.id}`
                    : `produce:${materialId(i.id)}`
                  : `material:${materialId(i.id)}`,
              ),
            ],
            catalog?.id,
          );
        }
        if (root)
          tasks.get(action)!.title =
            `${recipe.kind === 'cooking' ? 'Cook' : 'Craft'} ${batches + 1} batch(es) of ${recipe.name}`;
        for (const t of tasks.values())
          t.dependencies = t.dependencies.map((d) => (d === `material:${output}` ? action : d));
      }
      for (const [output, root] of rootProductions) {
        if (!(resolved.plannedUsed[output] > 0)) continue;
        for (const t of tasks.values())
          if (t.id !== `action:${root.entry.id}`)
            t.dependencies = t.dependencies.map((d) =>
              d === `material:${output}` ? `action:${root.entry.id}` : d,
            );
      }
    } catch (error) {
      task(
        'material:resolver-error',
        'Check intermediate recipe dependencies',
        state.goals[0] ?? 'manual',
        'Long-Term Goals',
        String(error),
        ['wiki-recipe-data'],
      );
    }
  }
  // Aggregate first, then consume concrete stacks once across alternative ingredient pools.
  const reserved: Record<string, number> = {};
  for (const m of materials.values()) {
    m.quantityKnown =
      m.id in state.resources ||
      (m.id === 'currency:gold'
        ? f.money !== null
        : f.inventoryKnown &&
          save.storageKnown &&
          (!qualityRequests.has(m.id) ||
            (f.inventoryStacks !== null && save.storageStacks !== null)));
    if (!m.quantityKnown && m.missing > 0) {
      for (const goal of m.goals)
        task(
          `material:${m.id}`,
          `Verify stock: ${m.name}`,
          goal,
          'Check Conditions',
          `${m.required} required; at least ${m.available} recorded. Inventory or storage is unavailable. Confirm the total or enter a manual total.`,
          m.sources,
        );
      continue;
    }
    if (materialsResolved) {
      if (m.missing > 0)
        for (const goal of m.goals)
          task(
            `material:${m.id}`,
            `Gather ${m.missing} ${m.name}`,
            goal,
            'Missing Materials',
            `${m.required} required; ${m.available} confirmed or manually supplied. ${m.acquire}`,
            m.sources,
          );
      continue;
    }
    const alternatives =
      m.id === 'milk'
        ? ['184', '186', '436', '438']
        : m.id === 'egg'
          ? ['176', '174', '180', '182', '442', '305', '928', '289']
          : [m.id];
    if (m.id in state.resources) {
      m.available = state.resources[m.id];
    } else
      for (const id of alternatives) {
        const remaining = Math.max(0, (supply[id] ?? 0) - (reserved[id] ?? 0));
        const take = Math.min(Math.max(0, m.required - m.available), remaining);
        m.available += take;
        reserved[id] = (reserved[id] ?? 0) + take;
      }
    m.missing = Math.max(0, m.required - m.available);
    if (!m.quantityKnown && m.missing > 0) {
      for (const goal of m.goals)
        task(
          `material:${m.id}`,
          `Verify stock: ${m.name}`,
          goal,
          'Check Conditions',
          `${m.required} required; at least ${m.available} recorded. Inventory or storage is unavailable. Confirm the total or enter a manual total.`,
          m.sources,
        );
      continue;
    }
    if (m.missing > 0) {
      for (const goal of m.goals)
        task(
          `material:${m.id}`,
          `Gather ${m.missing} ${m.name}`,
          goal,
          m.seasons && !m.seasons.includes(save.season) ? 'Seasonal' : 'Missing Materials',
          `${m.required} required; ${m.available} confirmed or manually supplied. ${m.acquire}`,
          m.sources,
        );
    }
  }
  for (const t of tasks.values()) {
    t.dependencies = t.dependencies.filter((id) => tasks.has(id));
    if (
      t.id.startsWith('action:') &&
      t.category === 'Available Now' &&
      t.dependencies.some((d) => d.startsWith('material:'))
    )
      t.category = 'Missing Materials';
    if (t.entryId) {
      const owners = usedEntries.get(t.entryId);
      if (owners) t.goalIds = [...new Set([...t.goalIds, ...owners])];
    }
  }
  const graph = new Map(
    [...tasks.values()].map((t) => [t.id, { id: t.id, dependencies: t.dependencies }]),
  );
  const order = expandGraph(graph, [...tasks.keys()]);
  for (const id of order) {
    const t = tasks.get(id)!;
    if (!['action:', 'produce:', 'shipment:', 'read:'].some((prefix) => t.id.startsWith(prefix)))
      continue;
    if (
      ['Seasonal', 'Long-Term Goals', 'Achievement Goals', 'Locked Behind Prerequisites'].includes(
        t.category,
      )
    )
      continue;
    const deps = t.dependencies.map((id) => tasks.get(id)!);
    if (deps.some((d) => d.category === 'Locked Behind Prerequisites'))
      t.category = 'Locked Behind Prerequisites';
    else if (
      deps.some((d) => ['Missing Materials', 'Almost Complete', 'Seasonal'].includes(d.category))
    ) {
      const remaining = deps.filter((d) =>
        ['Missing Materials', 'Almost Complete', 'Seasonal'].includes(d.category),
      );
      const material =
        remaining.length === 1 && remaining[0].id.startsWith('material:')
          ? materials.get(remaining[0].id.slice(9))
          : null;
      t.category =
        material?.quantityKnown && material.missing / material.required <= 0.2
          ? 'Almost Complete'
          : 'Missing Materials';
    } else if (deps.length) t.category = 'Check Conditions';
    else if (t.category === 'Missing Materials') t.category = 'Available Now';
  }
  return {
    tasks: order.map((id) => tasks.get(id)!),
    materials: [...materials.values()],
    acquisitionOptions,
    completedGoals: state.goals.filter((id) => {
      if (art && id.startsWith('museum:'))
        return museumProgress(save, art).some((m) => m.id === id.slice(7) && m.done === true);
      if (art && id.startsWith('bundle:'))
        return bundleProgress(save, art).some((b) => b.id === id.slice(7) && b.done === true);
      if (id.startsWith('walnut:'))
        return walnutProgress(save).some((w) => w.id === id.slice(7) && w.done === true);
      if (id.startsWith('building:'))
        return (
          (buildingCount(save, id.slice(9), art) ?? -1) >=
          Math.max(1, state.buildingTargets?.[id.slice(9)] ?? 1)
        );
      if (id.startsWith('quest:')) {
        const [, owner, ...parts] = id.split(':'),
          key = parts.join(':');
        return (
          save.players
            .find((p) => p.id === owner)
            ?.quests?.some((q) => q.id === key && q.completed === true) ?? false
        );
      }
      const e = entryById.get(id);
      if (specialItems.some((i) => i.id === id && i.done === true)) return true;
      return e
        ? entryProgress(e, f, versionFamily(save.gameVersion) !== null).done === true
        : knowledge.steam.achievements.some(
            (a) =>
              a.id === id &&
              achievementProgress(a, save, { version: 1, manuallyMarked: [] }, f.id).status ===
                'Save Requirements Met',
          );
    }),
  };
}

// General multi-step material engine: shared demands are accumulated before stock is consumed.
export type MaterialRecipe = {
  output: string;
  quantity: number;
  ingredients: { id: string; quantity: number }[];
};
export function resolveMaterials(
  demand: Record<string, number>,
  stock: Record<string, number>,
  recipes: MaterialRecipe[],
) {
  const byOutput = new Map(recipes.map((r) => [r.output, r]));
  const need = new Map<string, number>();
  const visiting = new Set<string>(),
    visited = new Set<string>(),
    ordered: string[] = [];
  function visit(id: string) {
    if (visiting.has(id)) throw new Error(`Material cycle at ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    const recipe = byOutput.get(id);
    if (recipe) {
      if (recipe.quantity <= 0) throw new Error('Recipe output must be positive');
      for (const i of recipe.ingredients) visit(i.id);
    }
    visiting.delete(id);
    visited.add(id);
    ordered.push(id);
  }
  Object.keys(demand).forEach(visit);
  for (const [id, n] of Object.entries(demand)) {
    if (!Number.isFinite(n) || n < 0) throw new Error('Invalid demand');
    need.set(id, n);
  }
  const shortages: Record<string, number> = {},
    crafts: Record<string, number> = {};
  for (const id of ordered.reverse()) {
    const n = Math.max(0, (need.get(id) ?? 0) - (stock[id] ?? 0));
    if (!n) continue;
    const recipe = byOutput.get(id);
    if (!recipe) {
      shortages[id] = n;
      continue;
    }
    const batches = Math.ceil(n / recipe.quantity);
    crafts[id] = batches;
    for (const i of recipe.ingredients) {
      if (i.quantity <= 0) throw new Error('Ingredient quantity must be positive');
      need.set(i.id, (need.get(i.id) ?? 0) + batches * i.quantity);
    }
  }
  return { shortages, crafts };
}
