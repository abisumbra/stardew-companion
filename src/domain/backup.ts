import { z } from 'zod';
import { AccountSchema, PlannerStateSchema } from './models';
import { FarmDesignsSchema } from './farm-design';
import { languages } from '../locales/languages';
export const AppearanceSchema = z.object({
  version: z.literal(1),
  language: z.enum(
    Object.keys(languages) as [keyof typeof languages, ...(keyof typeof languages)[]],
  ),
  textScale: z.union([z.literal(1), z.literal(1.15), z.literal(1.3)]),
});

export const PreferencesSchema = z.object({
  selected: z.string().nullable(),
  reduceMotion: z.boolean(),
});
export const BackupSchema = z
  .object({
    format: z.literal('stardew-companion-backup'),
    version: z.literal(1),
    states: z.record(z.string().max(256), z.unknown()),
  })
  .transform((backup, ctx) => {
    const states: Record<string, unknown> = {};
    for (const [scope, value] of Object.entries(backup.states)) {
      const schema =
        scope.startsWith('farm:') && scope.length > 5
          ? PlannerStateSchema
          : scope === 'farm-designs' || scope === 'home-designs'
            ? FarmDesignsSchema
            : scope === 'steam-account'
              ? AccountSchema
              : scope === 'appearance'
                ? AppearanceSchema
                : scope === 'preferences'
                  ? PreferencesSchema
                  : null;
      if (!schema) {
        ctx.addIssue({ code: 'custom', message: `Unsupported backup section: ${scope}` });
        continue;
      }
      const result = schema.safeParse(value);
      if (!result.success)
        ctx.addIssue({ code: 'custom', message: `Invalid backup section: ${scope}` });
      else states[scope] = result.data;
    }
    return { ...backup, states };
  });
export type Backup = z.infer<typeof BackupSchema>;
