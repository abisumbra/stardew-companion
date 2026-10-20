import type { SaveProfile } from './models';
import type { ArtworkData } from '../components/Artwork';
import { entryById } from './knowledge';
import { goalLabel } from './objectives';
import { translate } from '../lib/locale';
export function localizedGoalTitle(id: string, save: SaveProfile, art: ArtworkData) {
  const entry = entryById.get(id);
  const action = entry
    ? { cooking: 'Cook', crafting: 'Craft', fishing: 'Catch', shipping: 'Ship' }[entry.type]
    : undefined;
  const label = translate(goalLabel(id, save, art));
  return action ? translate(`${action} {item}`).replace('{item}', label) : label;
}
