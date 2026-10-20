import { entriesFor, knowledge, versionFamily } from './knowledge';
import { calculateProgress, entryProgress } from './progress';
import type { AccountState, Evidence, SaveProfile } from './models';
import records from '../../data/achievement-records.json';
import museum from '../../data/museum-items.json';
import {
  achievementGuidance,
  powerBooks,
  polycultureCrops,
  monocultureCrops,
} from './achievement-guidance';
import { selectedFarmer } from './supplies';
export type Achievement = (typeof knowledge.steam.achievements)[number];
export type AchievementStatus =
  'Steam Verified' | 'Save Requirements Met' | 'In Progress' | 'Unknown' | 'Manually Marked';
export type AchievementProgress = {
  status: AchievementStatus;
  current: number | null;
  total: number | null;
  evidence: Evidence;
  guide: string[];
  related: string[];
  route?: string;
};
const money: Record<string, number> = {
  Greenhorn: 15000,
  Cowpoke: 50000,
  Homesteader: 250000,
  Millionaire: 1000000,
  Legend: 10000000,
};
const tiers: Record<string, { type: 'cooking' | 'crafting' | 'fishing'; total: number | 'all' }> = {
  Cook: { type: 'cooking', total: 10 },
  'Sous Chef': { type: 'cooking', total: 25 },
  'Gourmet Chef': { type: 'cooking', total: 'all' },
  'D.I.Y.': { type: 'crafting', total: 15 },
  Artisan: { type: 'crafting', total: 30 },
  'Craft Master': { type: 'crafting', total: 'all' },
  Fisherman: { type: 'fishing', total: 10 },
  "Ol' Mariner": { type: 'fishing', total: 24 },
  'Master Angler': { type: 'fishing', total: 'all' },
};
export const achievementTier = (name: string) => tiers[name];
export function achievementProgress(
  a: Achievement,
  save: SaveProfile | null,
  account: AccountState,
  farmerId?: string | null,
): AchievementProgress {
  let current: number | null = null,
    total: number | null = null,
    reason = 'This action is not reliably detected from the supported save fields.';
  let guide = [
    a.description ??
      'The public Steam listing hides this description. Detailed requirements are not bundled yet.',
    'Check the linked source for the complete conditions. A manual record can be kept separately from save evidence.',
  ];
  const related: string[] = [];
  if (save && versionFamily(save.gameVersion)) {
    const f = selectedFarmer(save, farmerId);
    const stat = (key: string) =>
      Object.entries(f.stats).find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1] ??
      (f.statsKnown ? 0 : null);
    const t = tiers[a.name];
    if (a.name in money) {
      current = f.totalMoneyEarned;
      total = money[a.name];
      reason = 'Selected farmer totalMoneyEarned; spending gold does not reduce lifetime earnings.';
      guide = [
        `Earn a total of ${total.toLocaleString()}g on this farm.`,
        `${Math.max(0, total - (current ?? 0)).toLocaleString()}g remains in the lifetime earnings record.`,
      ];
      related.push(...Object.keys(money).filter((n) => n !== a.name));
    } else if (t) {
      const entries = entriesFor(t.type, save.gameVersion),
        items = entries.map((e) => entryProgress(e, f));
      current = items.every((i) => i.done !== null) ? items.filter((i) => i.done).length : null;
      total = t.total === 'all' ? entries.length : t.total;
      reason = `Selected farmer ${t.type} action records; items owned and recipe knowledge do not count.`;
      guide = [
        `Complete ${total} distinct ${t.type} collection entries.`,
        `Use the missing-entry list to choose your next ${Math.max(0, total - (current ?? 0))} actions.`,
        'The planner expands supported collection requirements and merges shared ingredients.',
      ];
      related.push(...Object.keys(tiers).filter((n) => tiers[n].type === t.type && n !== a.name));
    } else if (a.name === 'Full Shipment') {
      const items = entriesFor('shipping', save.gameVersion).map((e) => entryProgress(e, f));
      current = items.every((i) => i.done !== null) ? items.filter((i) => i.done).length : null;
      total = items.length;
      reason =
        'Selected farmer basicShipped records; selling to a shop does not substitute for shipping.';
      guide = [
        'Ship each required item through the shipping bin.',
        'Open the shipping collection to see every missing entry.',
      ];
    } else if (
      [
        'A New Friend',
        'Cliques',
        'Networking',
        'Popular',
        'Best Friends',
        'The Beloved Farmer',
      ].includes(a.name)
    ) {
      const hearts = ['Best Friends', 'The Beloved Farmer'].includes(a.name) ? 10 : 5;
      total = (
        {
          'A New Friend': 1,
          Cliques: 4,
          Networking: 10,
          Popular: 20,
          'Best Friends': 1,
          'The Beloved Farmer': 8,
        } as Record<string, number>
      )[a.name];
      current =
        f.friendship === null
          ? null
          : Object.values(f.friendship).filter((p) => p >= hearts * 250).length;
      reason = `friendshipData points at ${hearts * 250} or more. Includes only relationships represented in this farmer record.`;
      guide = [
        `Reach ${hearts} hearts with ${total} villagers.`,
        `Talk to villagers and select gifts from their verified preference guides.`,
      ];
    } else if (a.name === 'Moving Up' || a.name === 'Living Large') {
      current = f.houseUpgrade;
      total = a.name === 'Moving Up' ? 1 : 2;
      reason = 'houseUpgradeLevel (Living Large requires the second main house upgrade).';
      guide = [
        'Visit Robin and complete the relevant farmhouse upgrade.',
        'Material and gold costs are not yet bundled for this guide.',
      ];
    } else if (a.name === 'Master Of The Five Ways' || a.name === 'Singular Talent') {
      const names = ['farming', 'fishing', 'foraging', 'mining', 'combat'];
      current = names.every((n) => n in f.skills)
        ? names.filter((n) => f.skills[n] >= 10).length
        : null;
      total = a.name === 'Singular Talent' ? 1 : 5;
      reason = 'Five permanent skill levels, excluding temporary buffs.';
      guide = [
        `Reach level 10 in ${total === 1 ? 'one skill' : 'all five skills'}.`,
        'Use the skill panel to choose the remaining skills.',
      ];
    } else if (a.name === 'Mystery Of The Stardrops' || a.name === 'Protector Of The Valley') {
      const c = calculateProgress({ ...save, players: [f] }).criteria.find(
        (c) => c.id === (a.name === 'Mystery Of The Stardrops' ? 'stardrops' : 'monsters'),
      )!;
      current = c.ratio !== null ? c.current : null;
      total = c.total;
      reason = c.evidence.reason;
      guide = [
        'Complete every entry in the corresponding Perfection category.',
        'Open the category to see the remaining named objectives.',
      ];
    } else if (a.name === 'Mother Catch') {
      current = f.fish === null ? null : Object.values(f.fish).reduce((x, y) => x + y, 0);
      total = 100;
      reason = 'Sum of catch counts in fishCaught; no inventory inference.';
      guide = ['Catch 100 fish in total. Repeat catches count.'];
    } else if (a.name === 'Treasure Trove' || a.name === 'A Complete Collection') {
      const donated = save.completion?.museum;
      current = donated ? museum.ids.filter((id) => donated.includes(id)).length : null;
      total = a.name === 'Treasure Trove' ? 40 : museum.ids.length;
      reason = 'Distinct vanilla museum donations from the saved display.';
    } else if (a.name === 'Gofer' || a.name === 'A Big Help') {
      current = stat('questsCompleted');
      total = a.name === 'Gofer' ? 10 : 40;
      reason = 'Selected farmer questsCompleted statistic.';
    } else if (a.name === 'Monoculture' || a.name === 'Polyculture') {
      current =
        f.shipped === null
          ? null
          : a.name === 'Monoculture'
            ? Math.max(0, ...monocultureCrops.map((id) => f.shipped?.[id] ?? 0))
            : polycultureCrops.filter((id) => (f.shipped?.[id] ?? 0) >= 15).length;
      total = a.name === 'Monoculture' ? 300 : polycultureCrops.length;
      reason = 'Versioned eligible crop IDs and selected farmer basicShipped quantities.';
    } else if (a.name === 'The Bottom') {
      current = f.deepestMineLevel === null ? null : Math.min(120, f.deepestMineLevel);
      total = 120;
      reason = 'Selected farmer deepestMineLevel, capped at the ordinary mine bottom.';
    } else if (a.name === 'A Distant Shore' || a.name === 'Prairie King') {
      const flag = a.name === 'A Distant Shore' ? 'Visited_Island' : 'Beat_PK';
      current = f.mail === null ? null : Number(f.mail.includes(flag));
      total = 1;
      reason = `Selected farmer mailReceived: ${flag}.`;
    } else if (a.name === 'Well-Read' && save.gameVersion?.startsWith('1.6')) {
      current =
        f.statsKnown || f.booksRead !== null
          ? powerBooks.filter((id) => (f.booksRead?.[id] ?? f.stats[id] ?? 0) > 0).length
          : null;
      total = powerBooks.length;
      reason = 'Nineteen permanent power-book records; XP books and ownership are excluded.';
    } else if (a.name === 'Full House') {
      current =
        f.children === null || (f.spouse && !f.friendshipDetails?.[f.spouse])
          ? null
          : Math.min(2, f.children) +
            Number(
              Boolean(
                f.spouse &&
                f.spouse !== 'Krobus' &&
                f.friendshipDetails?.[f.spouse]?.status === 'Married',
              ),
            );
      total = 3;
      reason = 'Selected farmer parent IDs, two children and confirmed married relationship.';
    } else if (a.name === 'Local Legend' || a.name === 'Joja Co. Member Of The Year') {
      const mail = save.players[0].mail;
      current =
        mail === null
          ? null
          : Number(
              mail.includes('ccIsComplete') &&
                (a.name === 'Local Legend'
                  ? !mail.includes('JojaMember')
                  : mail.includes('JojaMember')),
            );
      total = 1;
      reason = 'Host world completion and membership flags, evaluated together.';
    }
    const gameRecord = (records.ids as Record<string, string>)[a.name.toLowerCase()];
    if (gameRecord && f.achievements?.includes(gameRecord)) {
      total ??= 1;
      current = Math.max(total, current ?? 0);
      reason = `The selected farmer has in-game achievement record ${gameRecord}. This is a saved game record, not Steam verification.`;
    }
  }
  guide = achievementGuidance(a.name) ?? guide;
  const status: AchievementStatus = account.steam?.unlocked.includes(a.id) ? 'Steam Verified' : account.manuallyMarked.includes(a.id)
    ? 'Manually Marked'
    : current === null || total === null
      ? 'Unknown'
      : current >= total
        ? 'Save Requirements Met'
        : 'In Progress';
  const route =
    a.name === 'Local Legend' || a.name === 'Joja Co. Member Of The Year'
      ? 'Community Center restoration and the Joja development route conflict in a normal single playthrough. Track the alternative route on another farm.'
      : undefined;
  return {
    status,
    current,
    total,
    evidence: status === 'Steam Verified' ? { status: 'confirmed', reason: `Public Steam achievement record for ${account.steam!.profileId}, fetched ${new Date(account.steam!.fetchedAt*1000).toISOString()}. Save requirements are evaluated separately.` } : { status: current === null ? 'unknown' : 'confirmed', reason },
    guide,
    related,
    route,
  };
}
