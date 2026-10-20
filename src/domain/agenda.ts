import { translate } from '../lib/locale';
import type { PlannerState, SaveProfile, Season } from './models';
import type { ArtworkData } from '../components/Artwork';
import { villagerProfiles } from './social';
import { festivals } from './festivals';
import { fishProfiles, routesFor } from './fishing';
import { itemName, plantingWindow, seasons } from './installed';
import { selectedFarmer } from './supplies';
import { entryById, versionFamily } from './knowledge';
export const gameDay = (year: number, season: Season, day: number) =>
  (year - 1) * 112 + seasons.indexOf(season) * 28 + day - 1;
export function dateFromDay(value: number) {
  return {
    year: Math.floor(value / 112) + 1,
    season: seasons[Math.floor((value % 112) / 28)],
    day: (value % 28) + 1,
  };
}
export function completeManual(task: PlannerState['manual'][number], today: number) {
  if (!task.done && task.repeatDays && task.dueDay !== undefined) {
    return {
      ...task,
      dueDay:
        task.dueDay +
        Math.max(1, Math.floor((today - task.dueDay) / task.repeatDays) + 1) * task.repeatDays,
    };
  }
  return { ...task, done: !task.done };
}
export type AgendaEntry = {
  id: string;
  title: string;
  day: number;
  detail?: string;
  manual?: boolean;
  caution?: string;
};
export function agenda(save: SaveProfile, state: PlannerState, art: ArtworkData): AgendaEntry[] {
  const now = gameDay(save.year, save.season, save.day),
    farmer = selectedFarmer(save, state.farmerId);
  const rows: AgendaEntry[] = [];
  const annual = (season: Season, day: number) => {
    const value = gameDay(save.year, season, day);
    return value < now ? value + 112 : value;
  };
  for (const profile of Object.values(villagerProfiles)) {
    if (profile.name === 'Kent' && save.year < 2) continue;
    rows.push({
      id: `birthday:${profile.name}`,
      title: `${translate(profile.name)} · ${translate('Birthday')}`,
      day: annual(profile.birthday.season, profile.birthday.day),
      detail: `character:${profile.name}`,
      caution: 'Check access and schedule in game.',
    });
  }
  for (const festival of festivals) {
    if (festival.since === '1.6' && versionFamily(save.gameVersion) !== '1.6') continue;
    for (const day of festival.days)
      rows.push({
        id: `festival:${festival.id}:${day}`,
        title: festival.name.en,
        day: annual(festival.season, day),
        caution: 'Check access and schedule in game.',
      });
  }
  for (const task of state.manual)
    if (!task.done && task.dueDay !== undefined && (!task.farmerId || task.farmerId === farmer.id))
      rows.push({ id: task.id, title: task.title, day: task.dueDay, manual: true });
  for (const id of state.goals) {
    const profile = fishProfiles[id],
      entry = entryById.get(id);
    if (profile && entry && !farmer.fish?.[entry.key]) {
      const routes = routesFor(profile, save.gameVersion).filter(
        (r) => !r.magicOnly && r.seasons.includes(save.season),
      );
      if (routes.length)
        rows.push({
          id: `fish:${id}`,
          title: `${translate(entry.name)} · ${translate('Fishing window')}`,
          day: gameDay(save.year, save.season, Math.max(...routes.map((r) => r.days?.[1] ?? 28))),
          detail: id,
          caution: 'Weather, equipment and access need checking.',
        });
    }
  }
  for (const [id, crop] of Object.entries(art.gameData?.crops ?? {})) {
    if (!crop.Seasons?.includes(seasons.indexOf(save.season))) continue;
    const window = plantingWindow(crop, save.season);
    if (window.deadline === null) continue;
    const deadline = now - save.day + window.deadline;
    if (deadline >= now && deadline <= now + 7)
      rows.push({
        id: `plant:${id}`,
        title: `${translate(itemName(crop.HarvestItemId, art))} · ${translate('Planting deadline')}`,
        day: deadline,
        detail: `crop:${id}`,
        caution: 'Standard growth; water daily. Speed modifiers are not assumed.',
      });
  }
  return [
    ...new Map(
      rows.filter((r) => r.manual || (r.day >= now && r.day <= now + 7)).map((r) => [r.id, r]),
    ).values(),
  ].sort((a, b) => a.day - b.day || a.id.localeCompare(b.id));
}
