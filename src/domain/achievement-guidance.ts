// Original concise guidance; factual requirements checked against Wiki Achievements and
// the linked subject pages on 2026-10-16. In-game records never verify a Steam account.
type Line = string;
const guides: Record<string, Line[]> = {
  'Treasure Trove': [
    'Take 40 distinct museum donations to Gunther; duplicates do not advance the display.',
    'Use Completionist → Museum to plan the missing donations.',
  ],
  'A Complete Collection': [
    'Finish the vanilla museum display with all 95 required donations.',
    'Compare the saved display with the missing list before opening geodes or searching artifact spots.',
  ],
  'The Bottom': [
    'Prepare food and mining equipment, then descend to Mines floor 120.',
    'Use unlocked elevator stops to divide the descent across several days.',
  ],
  Monoculture: [
    'Choose one eligible crop and ship 300 units of it.',
    'The planner uses your best eligible saved crop; shops sales do not replace shipping.',
  ],
  Polyculture: [
    'Ship 15 units of each of the 28 eligible crops.',
    'Prepare missing crops by season; the planner lists each remaining quantity.',
  ],
  Gofer: [
    'Complete 10 Help Wanted requests; special orders also contribute.',
    'Check the town notice board and your journal, and deliver before each request expires.',
  ],
  'A Big Help': [
    'Complete 40 Help Wanted requests; special orders also contribute.',
    'Plan requests alongside your current farming, fishing and mining goals.',
  ],
  'Local Legend': [
    'Complete the Community Center bundles on the Community Center route.',
    'Use the saved bundle choices and revisit the restored building for the completion sequence.',
  ],
  'Joja Co. Member Of The Year': [
    'Choose Joja membership and finish the community development projects.',
    'This route conflicts with restoring the Community Center normally; use another farm for the alternative route.',
  ],
  'Full House': [
    'Marry an eligible partner and raise two children.',
    'Prepare a suitable upgraded home and retain the crib; family events depend on in-game conditions.',
  ],
  'A Distant Shore': [
    'Open island travel through Willy’s boat repair, then visit Ginger Island.',
    'Unlocking travel alone is not a saved visit; travel there and save afterwards.',
  ],
  'Well-Read': [
    'Read all 19 power books at least once; owning books and reading XP books is not enough.',
    'Compare the missing power books with Bookseller stock and each book’s acquisition guide.',
  ],
  'Two Thumbs Up': [
    'Unlock the Movie Theater, buy a ticket and watch a movie.',
    'Building access or a ticket in the bag does not prove a completed viewing.',
  ],
  'Blue Ribbon': [
    'Prepare a varied, valuable grange display for the fall Fair and earn first place.',
    'Keep the display items aside in advance and collect the judged result at the festival.',
  ],
  'An Unforgettable Soup': [
    'Bring a suitable high-quality soup ingredient to the summer Luau.',
    'The Governor must give the best response; merely attending the festival does not complete the goal.',
  ],
  'Good Neighbors': [
    'Repair the Giant Stump with 100 Hardwood after its windstorm event.',
    'Finish nine raccoon requests, allow the family to grow and visit the forest on a sunny day.',
  ],
  'Danger In The Deep': [
    'Unlock Qi’s Walnut Room and accept Danger In The Deep, then reach dangerous mine floor 120.',
    'Normal mine depth is insufficient evidence; prepare combat supplies for the dangerous version.',
  ],
  'Infinite Power': [
    'Use the Volcano Forge to turn a Galaxy weapon into an Infinity weapon.',
    'Obtain the required Galaxy Souls and Cinder Shards, and perform the forge upgrades.',
  ],
  Perfection: [
    'Reach 100% Perfection, including applicable waivers, then visit the Summit.',
    'The score opens access; the Summit visit is a separate achievement action.',
  ],
  'Prairie King': [
    'Play Journey of the Prairie King at the Saloon and finish the arcade game.',
    'Practise the stages and use the game’s available between-day save feature.',
  ],
  "Fector's Challenge": [
    'Finish Journey of the Prairie King without a death.',
    'A completed ordinary run does not prove a deathless run; keep a separate manual confirmation when the save cannot establish it.',
  ],
  Legend: [
    'Earn 10,000,000g in lifetime earnings; spending does not reset this total.',
    'Combine productive crops, processing and sales with your remaining collection goals.',
  ],
};
export const achievementGuidance = (name: string) => guides[name];
export const powerBooks = [
  'Book_AnimalCatalogue',
  'Book_Artifact',
  'Book_Bombs',
  'Book_Crabbing',
  'Book_Defense',
  'Book_Diamonds',
  'Book_Friendship',
  'Book_Grass',
  'Book_Horse',
  'Book_Marlon',
  'Book_Mystery',
  'Book_PriceCatalogue',
  'Book_Roe',
  'Book_Speed',
  'Book_Speed2',
  'Book_Trash',
  'Book_Void',
  'Book_WildSeeds',
  'Book_Woodcutting',
];
export const polycultureCrops = [
  '24',
  '188',
  '190',
  '192',
  '248',
  '250',
  '256',
  '262',
  '264',
  '266',
  '270',
  '272',
  '274',
  '276',
  '278',
  '280',
  '284',
  '300',
  '304',
  '252',
  '254',
  '258',
  '260',
  '268',
  '282',
  '398',
  '400',
  '433',
];
export const monocultureCrops = [...polycultureCrops, '454', '591', '593', '595', '597'];
