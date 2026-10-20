import { z } from 'zod';
import type { ArtworkData } from '../components/Artwork';
const text = z.string().max(100000),
  integer = z.number().int(),
  number = z.number().finite();
const point = z.object({ X: number, Y: number });
const rect = z.object({
  x: number,
  y: number,
  width: number.positive(),
  height: number.positive(),
});
const entity = z.object({ id: text, name: text, kind: text, description: text.optional() });
const ingredient = z.object({ id: text, quantity: integer.positive() });
const recipe = z.object({
  output: text,
  quantity: integer.positive(),
  ingredients: z.array(ingredient).max(100),
  kind: text.optional(),
  name: text.optional(),
  unlock: text.optional(),
  machineId: text.optional(),
});
const trigger = z
  .object({
    Trigger: integer,
    RequiredItemId: text.nullish(),
    RequiredCount: integer.nullish(),
    RequiredTags: z.array(text).nullish(),
    Condition: text.nullish(),
  })
  .passthrough();
const output = z
  .object({
    ItemId: text.nullish(),
    RandomItemId: z.array(text).nullish(),
    MinStack: integer.nullish(),
    MaxStack: integer.nullish(),
    Condition: text.nullish(),
    PerItemCondition: text.nullish(),
    StackModifiers: z.array(z.unknown()).nullish(),
    OutputMethod: text.nullish(),
  })
  .passthrough();
const schemas: Record<string, z.ZodType> = {
  objects: z
    .object({
      Name: text,
      Category: integer,
      Price: number,
      ContextTags: z.array(text).nullish(),
      Edibility: integer,
      CanBeGivenAsGift: z.boolean().optional(),
    })
    .passthrough(),
  crops: z
    .object({
      HarvestItemId: text,
      Seasons: z.array(integer.min(0).max(3)),
      DaysInPhase: z.array(integer.nonnegative()),
      RegrowDays: integer,
      HarvestMinStack: integer,
      HarvestMaxStack: integer,
      PlantableLocationRules: z
        .array(z.object({ Condition: text.nullish() }).passthrough())
        .nullish(),
    })
    .passthrough(),
  buildings: z
    .object({
      Name: text,
      BuildCost: number,
      BuildDays: integer,
      BuildingToUpgrade: text.nullish(),
      BuildMaterials: z.array(z.object({ ItemId: text, Amount: integer.nonnegative() })).nullish(),
      Size: point,
    })
    .passthrough(),
  characters: z
    .object({
      CanBeRomanced: z.boolean(),
      Home: z
        .array(
          z
            .object({ Location: text, Tile: point.nullish(), Condition: text.nullish() })
            .passthrough(),
        )
        .nullish(),
      FriendsAndFamily: z.record(text, text).nullish(),
    })
    .passthrough(),
  monsterGoals: z
    .object({
      Targets: z.array(text),
      Count: integer.positive(),
      DisplayName: text,
      RewardItemId: text.nullish(),
    })
    .passthrough(),
  monsters: text,
  giftTastes: text,
  quests: text,
  bundles: text,
  tvRecipes: text,
  mail: text,
  festivalDates: text,
  achievements: text,
  shops: z
    .object({
      Items: z
        .array(
          z
            .object({
              ItemId: text.nullish(),
              Condition: text.nullish(),
              IsRecipe: z.boolean(),
              Price: number,
              TradeItemId: text.nullish(),
              TradeItemAmount: integer,
            })
            .passthrough(),
        )
        .nullish(),
    })
    .passthrough(),
  locations: z
    .object({
      Forage: z
        .array(
          z
            .object({
              ItemId: text.nullish(),
              Season: integer.nullish(),
              Condition: text.nullish(),
            })
            .passthrough(),
        )
        .nullish(),
      Fish: z.array(z.unknown()).nullish(),
      DisplayName: text.nullish(),
    })
    .passthrough(),
  machines: z
    .object({
      AdditionalConsumedItems: z
        .array(z.object({ ItemId: text, RequiredCount: integer.positive() }).passthrough())
        .nullish(),
      OutputRules: z
        .array(
          z
            .object({ Triggers: z.array(trigger).nullish(), OutputItem: z.array(output).nullish() })
            .passthrough(),
        )
        .nullish(),
      ReadyTimeModifiers: z.array(z.unknown()).nullish(),
    })
    .passthrough(),
};
const ArtworkSchema = z
  .object({
    root: text.nullable(),
    sheets: z.record(
      text,
      z.object({
        url: z.string().startsWith('data:image/png;base64,'),
        width: integer.positive().max(8192),
        height: integer.positive().max(8192),
      }),
    ),
    sprites: z.record(
      text,
      z.object({
        sheet: text,
        x: integer.nonnegative(),
        y: integer.nonnegative(),
        width: integer.positive(),
        height: integer.positive(),
      }),
    ),
    items: z.array(entity).max(30000),
    characters: z.array(entity).max(2000),
    monsters: z.array(entity).max(2000),
    world: z.array(entity).optional(),
    recipes: z.record(text, recipe),
    warnings: z.array(text),
    unavailable: z.record(text, text).optional(),
    translations: z.record(text, text).optional(),
    gameData: z.record(text, z.record(text, z.unknown())).optional(),
    schedules: z.record(text, z.record(text, text)).optional(),
    events: z
      .record(
        text,
        z.array(
          z.object({
            id: text,
            location: text,
            friendshipPoints: integer.nonnegative(),
            conditions: z.array(text),
          }),
        ),
      )
      .optional(),
    maps: z
      .record(
        text,
        z.object({
          width: number.positive(),
          height: number.positive(),
          layers: z.array(
            z.object({ sheet: text, source: rect, area: rect, condition: text.nullable() }),
          ),
          areas: z.record(text, rect),
          locations: z.record(text, rect),
        }),
      )
      .optional(),
  })
  .passthrough();
export function validateArtwork(raw: unknown): ArtworkData {
  const art = ArtworkSchema.parse(raw);
  for (const [dictionary, schema] of Object.entries(schemas)) {
    const entries = art.gameData?.[dictionary];
    if (!entries) continue;
    for (const [id, value] of Object.entries(entries)) {
      const result = schema.safeParse(value);
      if (!result.success) {
        delete entries[id];
        art.warnings.push(`Unsupported ${dictionary} entry ${id}: ignored safely.`);
      } else entries[id] = result.data;
    }
  }
  for (const [id, sprite] of Object.entries(art.sprites)) {
    const sheet = art.sheets[sprite.sheet];
    if (
      !sheet ||
      sprite.x + sprite.width > sheet.width ||
      sprite.y + sprite.height > sheet.height
    ) {
      delete art.sprites[id];
      art.warnings.push(`Invalid sprite ${id}: ignored safely.`);
    }
  }
  return art as ArtworkData;
}
