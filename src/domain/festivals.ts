import { catalogPair } from '../locales/catalog';
import type { Season, SaveProfile } from './models';
export type FestivalText = { en: string; tr: string };
export type FestivalStep = { icon: string; title: FestivalText; body: FestivalText };
export type Festival = {
  id: string;
  name: FestivalText;
  season: Season;
  days: number[];
  start: number;
  end: number;
  returns: number | null;
  location: string;
  map: string;
  evenMap?: string;
  since: '1.5' | '1.6';
  icon: string;
  summary: FestivalText;
  steps: FestivalStep[];
  warning: FestivalText;
  source: string;
};
const t = catalogPair;
const s = (icon: string, en: string, enBody: string): FestivalStep => ({
  icon,
  title: t(en),
  body: t(enBody),
});
export const festivals: Festival[] = [
  {
    id: 'egg',
    name: t('Egg Festival'),
    season: 'spring',
    days: [13],
    start: 900,
    end: 1400,
    returns: 2200,
    location: 'Town',
    map: 'Town-EggFestival',
    evenMap: 'Town-EggFestival2',
    since: '1.5',
    icon: 'Strawberry Seeds',
    source: 'Egg_Festival',
    summary: t(
      'Shop, socialize, then compete in the egg hunt. Plan the shopping before asking Lewis to start.',
    ),
    steps: [
      s(
        'Strawberry Seeds',
        'Prepare the seed budget',
        'Strawberry Seeds cost 100g each. Prepare watered planting space before attending if you want to plant after returning at 22:00.',
      ),
      s(
        'character:Lewis',
        'Finish shopping first',
        'Buy seeds and talk to villagers before starting the hunt; its ending sends you home.',
      ),
      s(
        'object:176',
        'Choose the right year layout',
        'The hunt lasts 50 real seconds. Solo play needs 9 eggs; with 2/3/4+ players the targets are 6/5/4. Odd and even years use different layouts.',
      ),
      s(
        'Strawberry',
        'Plant promptly',
        'A normal strawberry crop takes 8 days, then regrows every 4. Spring 13 planting gives harvests on 21 and 25 without growth bonuses.',
      ),
    ],
    warning: t(
      'The first win awards a Straw Hat; repeat wins award a Prize Ticket in 1.6. Multiplayer prizes depend on the highest egg count.',
    ),
  },
  {
    id: 'desert',
    name: t('Desert Festival'),
    season: 'spring',
    days: [15, 16, 17],
    start: 1000,
    end: 2600,
    returns: null,
    location: 'Desert',
    map: 'Desert-Festival',
    since: '1.6',
    icon: 'Calico Egg',
    source: 'Desert_Festival',
    summary: t(
      'Three days of changing shops, desert challenges and Calico Egg rewards. The repaired bus is required.',
    ),
    steps: [
      s(
        'Bomb',
        'Pack for the cavern',
        'Take a weapon, healing food, bombs and a reliable way home. Check Marlon’s challenge before starting your Skull Cavern run.',
      ),
      s(
        'character:Emily',
        'Visit daily attractions',
        'Inspect both rotating villager shops, Emily’s outfit service and the Scholar. Decide which limited daily stock matters to you.',
      ),
      s(
        'character:Willy',
        'Pick a daily fishing goal',
        'Willy asks for 3 Sandfish on the 15th and a Scorpion Carp on the 16th. Check his current request before spending the day fishing.',
      ),
      s(
        'character:Gil',
        'Claim and spend before leaving',
        'Submit your highest daily Egg Rating to Gil. Save enough Calico Eggs for your chosen stock; eggs disappear after the festival.',
      ),
    ],
    warning: t(
      'Time keeps passing. Race bets and dangerous cavern modifiers add risk; they are optional, not guaranteed profit.',
    ),
  },
  {
    id: 'flower',
    name: t('Flower Dance'),
    season: 'spring',
    days: [24],
    start: 900,
    end: 1400,
    returns: 2200,
    location: 'Forest',
    map: 'Forest-FlowerFestival',
    evenMap: 'Forest-FlowerFestival2',
    since: '1.5',
    icon: 'Daffodil',
    source: 'Flower_Dance',
    summary: t(
      'Build the friendship requirement beforehand, secure a dance partner and check exclusive crafting purchases.',
    ),
    steps: [
      s(
        'character:Haley',
        'Reach four hearts first',
        'A marriage candidate normally needs at least 4 hearts to accept. Use their gift guide in advance; talking twice at the festival lets you ask.',
      ),
      s(
        "Tub o' Flowers",
        'Check collection purchases',
        'The Tub o’ Flowers recipe costs 1,000g and Rarecrow #5 costs 2,500g. Buy before starting the dance.',
      ),
      s(
        'character:Lewis',
        'Dance after finishing visits',
        'Talk to the other villagers, choose your partner, then ask Lewis to start. Dancing with an NPC grants 250 friendship points.',
      ),
    ],
    warning: t(
      'The special forest clearing is a festival layout. It is not an ordinary year-round walking destination.',
    ),
  },
  {
    id: 'luau',
    name: t('Luau'),
    season: 'summer',
    days: [11],
    start: 900,
    end: 1400,
    returns: 2200,
    location: 'Beach',
    map: 'Beach-Luau',
    evenMap: 'Beach-Luau2',
    since: '1.5',
    icon: 'Cauliflower',
    source: 'Luau',
    summary: t(
      'Reserve an ingredient with a verified quality for the soup. The best reaction gives a broad friendship benefit.',
    ),
    steps: [
      s(
        'Cauliflower',
        'Reserve a gold-quality ingredient',
        'Gold-quality Cauliflower is an accessible best-response option. Keep the quality: normal-quality items cannot produce the best response.',
      ),
      s(
        'Cheese',
        'Check an alternative',
        'Gold Cheese or gold Melon also qualify for the best response. Use the exact item and quality from the referenced list.',
      ),
      s(
        'character:Lewis',
        'Contribute before the tasting',
        'Add the ingredient, finish socializing and shopping, then start the tasting with Lewis. The best result gives 120 friendship points.',
      ),
    ],
    warning: t(
      'In multiplayer every player must contribute. The worst contribution determines the result, so coordinate ingredients.',
    ),
  },
  {
    id: 'trout',
    name: t('Trout Derby'),
    season: 'summer',
    days: [20, 21],
    start: 610,
    end: 2600,
    returns: null,
    location: 'Forest',
    map: 'Forest',
    since: '1.6',
    icon: 'Rainbow Trout',
    source: 'Trout_Derby',
    summary: t(
      'Fish the Forest river and exchange Golden Tags. A focused bait setup gives more useful attempts.',
    ),
    steps: [
      s(
        'Rainbow Trout',
        'Fish in the event area',
        'The booth is south of Marnie’s Ranch. Rainbow Trout are available in the Forest river throughout the event, regardless of weather.',
      ),
      s(
        'Bait Maker',
        'Prepare targeted bait',
        'Use Rainbow Trout Bait when available. A Bait Maker brought nearby can turn caught trout into more targeted bait.',
      ),
      s(
        'Golden Tag',
        'Turn tags into rewards',
        'Each trout has a base 33% tag chance. Exchange tags one at a time; keep spare tags because they carry into later years.',
      ),
    ],
    warning: t(
      'Time passes and animals need feeding. Multiple catches improve tag odds, but each catch can yield at most one tag.',
    ),
  },
  {
    id: 'jellies',
    name: t('Dance of the Moonlight Jellies'),
    season: 'summer',
    days: [28],
    start: 2200,
    end: 2400,
    returns: 2400,
    location: 'Beach',
    map: 'Beach-Jellies',
    evenMap: 'Beach-Jellies2',
    since: '1.5',
    icon: 'Nautilus Shell',
    source: 'Dance_of_the_Moonlight_Jellies',
    summary: t(
      'A late-night social festival. Complete the final summer farm chores before heading to the Beach.',
    ),
    steps: [
      s(
        'Wheat',
        'Finish summer chores',
        'Handle livestock, harvests and season-sensitive crops before 22:00. The next saved morning starts fall.',
      ),
      s(
        'character:Lewis',
        'Visit before the ceremony',
        'Talk to villagers and inspect the festival shop before asking Lewis to release the boat.',
      ),
      s(
        'Nautilus Shell',
        'Watch, then return home',
        'The event is for the shared experience and social visits. There is no competition score to maximize.',
      ),
    ],
    warning: t(
      'Entry is between 22:00 and midnight. Keep the late return in mind before planning more chores.',
    ),
  },
  {
    id: 'fair',
    name: t('Stardew Valley Fair'),
    season: 'fall',
    days: [16],
    start: 900,
    end: 1500,
    returns: 2200,
    location: 'Town',
    map: 'Town-Fair',
    evenMap: 'Town-Fair2',
    since: '1.5',
    icon: 'Stardrop',
    source: 'Stardew_Valley_Fair',
    summary: t(
      'Build a diverse nine-item display, earn tokens and prioritize the unique Stardrop.',
    ),
    steps: [
      s(
        'Pumpkin',
        'Prepare nine valuable items',
        'Fill all nine slots. Use at least six eligible categories and high-quality valuable items; first place needs 90 points.',
      ),
      s(
        'Cauliflower',
        'Balance the categories',
        'The categories are Animal Products, Artisan Goods, Cooking, Fish, Foraging, Fruits, Minerals and Vegetables. Repeated categories do not add variety bonuses.',
      ),
      s(
        'Stardrop',
        'Spend tokens deliberately',
        'The Stardrop costs 2,000 tokens and Rarecrow #1 costs 800. Earn tokens from the display and games; gambling is not guaranteed.',
      ),
      s(
        'Chest',
        'Retrieve your display',
        'Ask Lewis to judge after filling the display. Collect your nine items before leaving; they are not returned automatically.',
      ),
    ],
    warning: t(
      'Price, quality, categories and profit-margin settings affect scoring. A valuable-looking inventory alone does not guarantee 90 points.',
    ),
  },
  {
    id: 'spirits',
    name: t("Spirit's Eve"),
    season: 'fall',
    days: [27],
    start: 2200,
    end: 2350,
    returns: 2400,
    location: 'Town',
    map: 'Town-Halloween',
    evenMap: 'Town-Halloween2',
    since: '1.5',
    icon: 'Golden Pumpkin',
    source: "Spirit's_Eve",
    summary: t(
      'Use the year-specific maze, collect its prize and check the crafting recipe before leaving.',
    ),
    steps: [
      s(
        'Glow Ring',
        'Prepare for the maze',
        'A light-providing ring helps track movement in hidden passages. Switch the guide year to match your save.',
      ),
      s(
        'Golden Pumpkin',
        'Odd years: follow the hidden cave',
        'Walk left of the question-mark sign, then follow the hidden northern cave to the treasure. Odd-year treasure is a Golden Pumpkin in 1.6.',
      ),
      s(
        'Prize Ticket',
        'Even years: use the second passage',
        'After the first hidden passage, find the upper-right unmarked passage. Behind the chicken-legged house, the middle passage leads to the treasure.',
      ),
      s(
        'Jack-O-Lantern',
        'Buy the recipe if missing',
        'The Jack-O-Lantern recipe costs 2,000g and Rarecrow #2 costs 5,000g. Check your collection before spending.',
      ),
    ],
    warning: t(
      'In 1.6 the even-year maze awards a Prize Ticket. Do not follow an odd-year screenshot for an even-year run.',
    ),
  },
  {
    id: 'ice',
    name: t('Festival of Ice'),
    season: 'winter',
    days: [8],
    start: 900,
    end: 1400,
    returns: 2200,
    location: 'Forest',
    map: 'Forest-IceFestival',
    evenMap: 'Forest-IceFestival2',
    since: '1.5',
    icon: 'Magnet',
    source: 'Festival_of_Ice',
    summary: t('Compete in ice fishing and visit the merchant before Lewis starts the contest.'),
    steps: [
      s(
        'Rarecrow',
        'Inspect the merchant',
        'Rarecrow #4 costs 5,000g. Finish conversations and shopping before the contest.',
      ),
      s(
        'Magnet',
        'Use short casts',
        'Stand close to a hole and use a short cast. Your own bait and tackle are not used with the contest rod.',
      ),
      s(
        'Fish Stew',
        'Land five fish fully',
        'At least five fish are needed. Leave time for the last fish to finish its landing animation before the timer expires.',
      ),
    ],
    warning: t(
      'The first win grants fishing equipment and a Sailor’s Cap; subsequent wins give a Prize Ticket in 1.6.',
    ),
  },
  {
    id: 'squid',
    name: t('SquidFest'),
    season: 'winter',
    days: [12, 13],
    start: 610,
    end: 2600,
    returns: null,
    location: 'Beach',
    map: 'Beach',
    since: '1.6',
    icon: 'Squid',
    source: 'SquidFest',
    summary: t(
      'Two separate daily catch targets. Claim every reward tier at the booth and return for the second day.',
    ),
    steps: [
      s(
        'Bait Maker',
        'Prepare Squid Bait',
        'Use a Bait Maker and a caught squid for targeted bait when available. Bring a rod that can use bait and enough energy food.',
      ),
      s(
        'Squid',
        'Winter 12: reach eight',
        'Copper, iron, gold and iridium tiers need 1, 3, 5 and 8 squid on the first day. Squid can be caught all day during the event.',
      ),
      s(
        'Squid',
        'Winter 13: reach ten',
        'The second-day targets are 2, 5, 7 and 10. Yesterday’s catch counter does not carry over.',
      ),
      s(
        "The Art O' Crabbing",
        'Collect every tier',
        'Claim prizes before leaving and keep bag space free. The top tiers include unique collectibles and the crabbing book if not already received.',
      ),
    ],
    warning: t('The clock keeps running. Animal care and your return route still need planning.'),
  },
  {
    id: 'market',
    name: t('Night Market'),
    season: 'winter',
    days: [15, 16, 17],
    start: 1700,
    end: 2600,
    returns: null,
    location: 'Beach',
    map: 'Beach-NightMarket',
    since: '1.5',
    icon: 'Pearl',
    source: 'Night_Market',
    summary: t(
      'Plan the submarine, Mermaid Boat and changing shops around their different closing times.',
    ),
    steps: [
      s(
        'Blobfish',
        'Prioritize the submarine',
        'Entry costs 1,000g and closes at 23:00. It takes about 30 in-game minutes each way; bring fishing supplies and a return option.',
      ),
      s(
        'Midnight Squid',
        'Target the three special fish',
        'Midnight Squid, Spook Fish and Blobfish are the submarine’s special collection targets. A Training Rod cannot catch them.',
      ),
      s(
        'Pearl',
        'Solve the Mermaid Boat',
        'Enter before 00:30, watch the show, then press shells 1–5–4–2–3 from left to right. Its Pearl can be claimed once per farmer per save.',
      ),
      s(
        'Coffee',
        'Check the changing stalls',
        'Claim the free nightly coffee, inspect daily seed stock and paintings, and budget for the 250g farm teleport if needed.',
      ),
    ],
    warning: t(
      'Shops and time continue normally. The market ending at 02:00 does not make it safe to stay awake past the normal collapse time.',
    ),
  },
  {
    id: 'star',
    name: t('Feast of the Winter Star'),
    season: 'winter',
    days: [25],
    start: 900,
    end: 1400,
    returns: 2200,
    location: 'Town',
    map: 'Town-Christmas',
    evenMap: 'Town-Christmas2',
    since: '1.5',
    icon: "Rabbit's Foot",
    source: 'Feast_of_the_Winter_Star',
    summary: t('Prepare a personal loved gift for the recipient named in Lewis’s letter.'),
    steps: [
      s(
        'character:Lewis',
        'Read the recipient letter',
        'The letter arrives on Winter 18. Do not guess the recipient from friendships or a previous year.',
      ),
      s(
        "Rabbit's Foot",
        'Choose a verified loved gift',
        'Use that character’s gift guide and its exceptions. The festival gift gives five times the normal friendship value; quality can matter.',
      ),
      s(
        'character:Robin',
        'Finish visits and gift exchange',
        'Keep the gift in your bag, talk to your recipient to choose it, then watch your own gift scene. Check the shop and socialize before leaving.',
      ),
    ],
    warning: t(
      'Received presents are random. The Companion does not claim to know the recipient or a guaranteed Tea Set from the parsed save fields.',
    ),
  },
];
const order: Season[] = ['spring', 'summer', 'fall', 'winter'];
export function festivalDistance(f: Festival, save: SaveProfile) {
  const now = order.indexOf(save.season) * 28 + save.day;
  return Math.min(...f.days.map((d) => (order.indexOf(f.season) * 28 + d - now + 112) % 112));
}
export function festivalMap(f: Festival, year: number, version = '1.6') {
  return version.startsWith('1.6') && year % 2 === 0 && f.evenMap ? f.evenMap : f.map;
}
export const festivalUrl = (f: Festival) =>
  `https://stardewvalleywiki.com/${encodeURIComponent(f.source)}`;
export const festivalSupported = (f: Festival, version: string | null | undefined) =>
  f.since === '1.5' || !version?.startsWith('1.5');
