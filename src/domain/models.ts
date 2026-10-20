import { z } from 'zod';
const counts = z.record(z.string(), z.number().int().nonnegative());
const stacks = z.array(
  z.object({
    id: z.string(),
    quantity: z.number().int().positive(),
    quality: z.number().int().nonnegative(),
  }),
);
export const FarmerSchema = z.object({
  id: z.string(),
  name: z.string(),
  money: z.number().nullable(),
  totalMoneyEarned: z.number().nullable(),
  houseUpgrade: z.number().nullable(),
  skills: counts,
  cookingKnown: counts.nullable(),
  cooked: counts.nullable(),
  crafting: counts.nullable(),
  fish: counts.nullable(),
  shipped: counts.nullable(),
  friendship: counts.nullable(),
  friendshipDetails: z
    .record(
      z.string(),
      z.object({
        status: z.string().nullable(),
        giftsToday: z.number().int().nonnegative().nullable(),
        giftsThisWeek: z.number().int().nonnegative().nullable(),
        talkedToToday: z.boolean().nullable(),
        roommate: z.boolean().nullable(),
      }),
    )
    .nullable()
    .default(null),
  spouse: z.string().nullable().default(null),
  monsters: counts.nullable(),
  stats: counts,
  statsKnown: z.boolean().default(false),
  mail: z.array(z.string()).nullable(),
  events: z.array(z.string()).nullable(),
  achievements: z.array(z.string()).nullable(),
  inventory: counts,
  inventoryKnown: z.boolean().default(false),
  inventoryStacks: stacks.nullable().default(null),
  deepestMineLevel: z.number().int().nonnegative().nullable().default(null),
  children: z.number().int().nonnegative().nullable().default(null),
  booksRead: counts.nullable().default(null),
  professions: z.array(z.number().int()).nullable().default(null),
  quests: z
    .array(
      z.object({
        id: z.string(),
        kind: z.string(),
        title: z.string().nullable(),
        description: z.string().nullable(),
        objective: z.string().nullable(),
        completed: z.boolean().nullable(),
        daysLeft: z.number().nullable(),
      }),
    )
    .nullable()
    .default(null),
  mineStardrop: z.boolean().nullable(),
});
export const SaveSchema = z.object({
  locationMaps: z.record(z.string(), z.string()).nullable().default(null),
  containers: z
    .array(
      z.object({
        itemId: z.string().nullable().optional(),
        parentLocation: z.string().nullable().optional(),
        buildingTile: z.tuple([z.number().int(), z.number().int()]).nullable().optional(),
        id: z.string(),
        name: z.string(),
        location: z.string(),
        tile: z.tuple([z.number().int(), z.number().int()]).nullable(),
        kind: z.string(),
        sharedGroup: z.string().nullable(),
        items: stacks,
        contentsKnown: z.boolean(),
      }),
    )
    .nullable()
    .default(null),
  farmObjects: z
    .array(z.object({ id: z.string(), tile: z.tuple([z.number().int(), z.number().int()]) }))
    .nullable()
    .default(null),
  profitMargin: z.number().positive().max(1).nullable().default(null),
  mapObstacles: z
    .record(
      z.string(),
      z
        .array(
          z.object({
            x: z.number().int().min(0).max(255),
            y: z.number().int().min(0).max(255),
            width: z.number().int().min(1).max(32),
            height: z.number().int().min(1).max(32),
          }),
        )
        .max(65536),
    )
    .nullable()
    .default(null),
  id: z.string(),
  path: z.string(),
  farmName: z.string(),
  farmType: z.string(),
  gameVersion: z.string().nullable(),
  season: z.enum(['spring', 'summer', 'fall', 'winter']),
  day: z.number().int().min(1).max(28),
  year: z.number().int().positive(),
  savedAt: z.number(),
  syncedAt: z.number(),
  fingerprint: z.string(),
  players: z.array(FarmerSchema).min(1),
  buildings: z.array(z.string()).nullable(),
  walnutsFound: z.number().nullable(),
  waivers: z.number().nullable(),
  storage: counts,
  storageKnown: z.boolean().default(false),
  storageStacks: stacks.nullable().default(null),
  storageScope: z.string(),
  worldStats: counts.nullable().default(null),
  warnings: z.array(z.string()),
  completion: z
    .object({
      museum: z.array(z.string()).nullable(),
      bundles: z.record(z.string(), z.array(z.boolean())).nullable(),
      bundleDefinitions: z.record(z.string(), z.string()).nullable(),
      collectedNuts: z.array(z.string()).nullable(),
      limitedNuts: counts.nullable(),
      goldenCoconutCracked: z.boolean().nullable(),
      goldenParrotUsed: z.boolean().nullable(),
      worldFlags: z.array(z.string()).nullable(),
    })
    .nullable()
    .default(null),
});
export const ScanSchema = z.object({
  saves: z.array(SaveSchema),
  issues: z.array(z.object({ path: z.string(), message: z.string() })),
  directories: z.array(z.string()),
  customDirectories: z.array(z.string()).default([]),
});
export type Farmer = z.infer<typeof FarmerSchema>;
export type SaveProfile = z.infer<typeof SaveSchema>;
export type ScanResult = z.infer<typeof ScanSchema>;
export type Season = SaveProfile['season'];
export const EntrySchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['cooking', 'crafting', 'fishing', 'shipping']),
  versions: z.array(z.enum(['1.5', '1.6'])).min(1),
  sources: z.array(z.string()).min(1),
  verifiedAt: z.iso.date(),
  verification: z.literal('catalog'),
});
export type Entry = z.infer<typeof EntrySchema>;
export const CatalogSchema = z.object({
  version: z.string(),
  verifiedAt: z.iso.date(),
  referenceHash: z.string(),
  entries: z.array(EntrySchema),
  steam: z.object({
    observedTotal: z.number().int().positive(),
    observedAt: z.iso.date(),
    achievements: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        description: z.string().nullable(),
        sources: z.array(z.string()).min(1),
        verifiedAt: z.iso.date(),
        verification: z.enum(['official-catalog', 'hidden-description']),
      }),
    ),
  }),
});
export const PlannerStateSchema = z.object({
  version: z.literal(1),
  goals: z.array(z.string()),
  pinned: z.array(z.string()),
  priorities: z.record(z.string(), z.enum(['high', 'normal', 'low'])),
  manual: z.array(
    z.object({
      id: z.string(),
      title: z.string().min(1).max(500),
      done: z.boolean(),
      priority: z.enum(['high', 'normal', 'low']),
      dueDay: z.number().int().min(0).max(112000000).optional(),
      repeatDays: z.number().int().min(1).max(112).optional(),
      farmerId: z.string().optional(),
    }),
  ),
  completedSteps: z.array(z.string()),
  goalReceipts: z
    .record(
      z.string(),
      z.record(
        z.string(),
        z.object({
          fingerprint: z.string(),
          detectedAt: z.number().int().nonnegative(),
          year: z.number().int().positive(),
          season: z.enum(['spring', 'summer', 'fall', 'winter']),
          day: z.number().int().min(1).max(28),
        }),
      ),
    )
    .default({}),
  resources: counts,
  containerLabels: z.record(z.string().max(1000), z.string().max(80)).default({}),
  farmerId: z.string().nullable().default(null),
  fishing: z
    .record(
      z.string(),
      z.object({ routeIndex: z.number().int().nonnegative(), magicBait: z.boolean() }),
    )
    .default({}),
  resolveIntermediate: z.boolean().default(true),
  bundleChoices: z.record(z.string(), z.array(z.number().int().nonnegative())).default({}),
  buildingTargets: counts.default({}),
  acquisitionRoutes: z.record(z.string(), z.string()).default({}),
});
export type PlannerState = z.infer<typeof PlannerStateSchema>;
export const emptyPlanner = (): PlannerState => ({
  version: 1,
  goals: [],
  pinned: [],
  priorities: {},
  manual: [],
  completedSteps: [],
  goalReceipts: {},
  resources: {},
  containerLabels: {},
  farmerId: null,
  fishing: {},
  resolveIntermediate: true,
  bundleChoices: {},
  buildingTargets: {},
  acquisitionRoutes: {},
});
export const AccountSchema = z.object({
  version: z.literal(1),
  manuallyMarked: z.array(z.string()),
  steam: z
    .object({
      profileId: z.string().regex(/^\d{17}$/),
      sourceUrl: z.url().startsWith('https://steamcommunity.com/'),
      fetchedAt: z.number().int().positive(),
      unlocked: z.array(z.string()),
      observedTotal: z.number().int().positive(),
    })
    .nullable()
    .optional(),
});
export type AccountState = z.infer<typeof AccountSchema>;
export type Evidence = {
  status: 'confirmed' | 'inferred' | 'unknown';
  reason: string;
  field?: string;
};
export type Ingredient = {
  id: string;
  name: string;
  quantity: number;
  alternatives?: string[];
  seasons?: Season[];
  acquire: string;
  sources: string[];
};
export type Guide = {
  entryId: string;
  versions: ('1.5' | '1.6')[];
  verifiedAt: string;
  sources: string[];
  steps: string[];
  ingredients?: Ingredient[];
  unlock?: string;
  seasons?: Season[];
  location?: string;
  time?: string;
  weather?: 'rain' | 'sun' | 'any';
  alternatives?: string[];
};
export const SourceSchema = z.object({
  title: z.string().min(1),
  url: z.url().startsWith('https://'),
  license: z.string().min(1),
  verifiedAt: z.iso.date(),
  verification: z.string().min(1),
  revision: z.string().optional(),
});
export const GuideSchema = z.object({
  entryId: z.string().min(1),
  versions: z.array(z.enum(['1.5', '1.6'])).min(1),
  verifiedAt: z.iso.date(),
  sources: z.array(z.string()).min(1),
  steps: z.array(z.string().min(1)).min(1),
  ingredients: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        quantity: z.number().int().positive(),
        alternatives: z.array(z.string()).optional(),
        seasons: z.array(z.enum(['spring', 'summer', 'fall', 'winter'])).optional(),
        acquire: z.string().min(1),
        sources: z.array(z.string()).min(1),
      }),
    )
    .optional(),
  unlock: z.string().optional(),
  seasons: z.array(z.enum(['spring', 'summer', 'fall', 'winter'])).optional(),
  location: z.string().optional(),
  time: z.string().optional(),
  weather: z.enum(['rain', 'sun', 'any']).optional(),
  alternatives: z.array(z.string()).optional(),
});
