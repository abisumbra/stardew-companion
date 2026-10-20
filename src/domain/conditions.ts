import type { Farmer, SaveProfile } from './models';
export type ConditionResult = { text: string; met: boolean | null; raw: string };
const range = (n: number | null | undefined, min: string | undefined, max?: string) =>
  n == null || min === undefined || !Number.isFinite(Number(min))
    ? null
    : n >= Number(min) && (max === undefined || n <= Number(max));
const and = (states: (boolean | null)[]) =>
  states.includes(false) ? false : states.includes(null) ? null : true;
const tokens = (s: string) =>
  (s.match(/"(?:[^"\\]|\\.)*"|\S+/g) ?? []).map((s) => s.replace(/^"|"$/g, ''));
export function queryConditions(
  raw: string | null | undefined,
  save: SaveProfile | null,
  farmer?: Farmer | null,
): ConditionResult[] {
  if (!raw) return [];
  return raw.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map((part) => {
    const [type, ...args] = tokens(part.trim()),
      negated = type?.startsWith('!'),
      key = (negated ? type.slice(1) : type)?.toUpperCase();
    if (key?.startsWith('PLAYER_') && ['Any', 'All'].includes(args[0]) && save) {
      const results = save.players.map(
        (f) =>
          queryConditions(
            [key, f.id, ...args.slice(1).map((s) => JSON.stringify(s))].join(' '),
            save,
            farmer,
          )[0],
      );
      const combined =
        args[0] === 'All'
          ? and(results.map((r) => r.met))
          : results.some((r) => r.met === true)
            ? true
            : results.some((r) => r.met === null)
              ? null
              : false;
      return {
        text: `${negated ? 'Except: ' : ''}${args[0]}: ${results[0]?.text ?? 'Player condition'}`,
        met: negated && combined !== null ? !combined : combined,
        raw: part.trim(),
      };
    }
    const selected = farmer ?? save?.players[0],
      f =
        args[0] === 'Host'
          ? save?.players[0]
          : (save?.players.find((p) => p.id === args[0]) ?? selected);
    let met: boolean | null = null,
      text = 'Additional game condition';
    if (key === 'TRUE') {
      met = true;
      text = 'Always available';
    } else if (key === 'FALSE') {
      met = false;
      text = 'Not available';
    } else if (key === 'YEAR') {
      met = range(save?.year, args[0], args[1]);
      text = `Year ${args[0]}${args[1] ? `–${args[1]}` : ' or later'}`;
    } else if (key === 'SEASON') {
      met = save ? args.some((s) => s.toLowerCase() === save.season) : null;
      text = `Season: ${args.join(' / ')}`;
    } else if (key === 'DAY_OF_MONTH') {
      met = save
        ? args.some((d) =>
            d === 'even'
              ? save.day % 2 === 0
              : d === 'odd'
                ? save.day % 2 === 1
                : Number(d) === save.day,
          )
        : null;
      text = `Day: ${args.join(' / ')}`;
    } else if (key === 'PLAYER_FRIENDSHIP_POINTS' && !['Any', 'AnyDateable'].includes(args[1])) {
      met = f?.friendship ? range(f.friendship[args[1]] ?? 0, args[2], args[3]) : null;
      text = `${args[1]}: ${Number(args[2]) / 250} hearts${args[3] ? `–${Number(args[3]) / 250}` : ' or more'}`;
    } else if (key === 'PLAYER_HAS_MAIL') {
      met = f?.mail?.includes(args[1])
        ? true
        : args[2] === 'Received' && Array.isArray(f?.mail)
          ? false
          : null;
      text = `Letter / progression: ${args[1]}`;
    } else if (key === 'PLAYER_HAS_SEEN_EVENT') {
      met = f?.events ? args.slice(1).some((id) => f.events!.includes(id)) : null;
      text = `Seen event: ${args.slice(1).join(' / ')}`;
    } else if (key === 'PLAYER_HAS_COOKING_RECIPE' || key === 'PLAYER_HAS_CRAFTING_RECIPE') {
      const recipes = key === 'PLAYER_HAS_COOKING_RECIPE' ? f?.cookingKnown : f?.crafting;
      met = recipes ? args.slice(1).join(' ') in recipes : null;
      text = `Learn recipe: ${args.slice(1).join(' ')}`;
    } else if (key === 'PLAYER_FARMHOUSE_UPGRADE') {
      met = range(f?.houseUpgrade, args[1], args[2]);
      text = `House upgrade: ${args[1]}${args[2] ? `–${args[2]}` : ' or more'}`;
    } else if (key === 'PLAYER_STAT') {
      met = f?.statsKnown ? range(f.stats[args[1]] ?? 0, args[2], args[3]) : null;
      text = `Saved statistic ${args[1]}: ${args[2]} or more`;
    } else if (key === 'PLAYER_HAS_PROFESSION') {
      met = f?.professions ? f.professions.includes(Number(args[1])) : null;
      text = `Profession: ${args[1]}`;
    } else if (key === 'PLAYER_HAS_ACHIEVEMENT') {
      met = f?.achievements ? f.achievements.includes(args[1]) : null;
      text = `In-game achievement: ${args[1]}`;
    } else if (key === 'IS_WORLD_STATE') {
      met = save?.completion?.worldFlags ? save.completion.worldFlags.includes(args[0]) : null;
      text = `World progression: ${args[0]}`;
    } else if (key === 'TIME') {
      text = `Time: ${args[0]}–${args[1] ?? 2600}`;
    } else if (key === 'WEATHER') {
      text = `Weather: ${args.slice(1).join(' / ')}`;
    }
    if (negated) {
      met = met === null ? null : !met;
      text = `Except: ${text}`;
    }
    return { text, met, raw: part.trim() };
  });
}
export function eventConditions(
  conditions: string[],
  save: SaveProfile | null,
  farmer: Farmer | null,
): ConditionResult[] {
  return conditions.flatMap((raw) => {
    const [kind, ...args] = tokens(raw),
      alias: Record<string, string> = {
        f: 'Friendship',
        t: 'Time',
        w: 'Weather',
        e: 'SawEvent',
        k: '!SawEvent',
        n: 'LocalMail',
        l: '!LocalMail',
        Hn: 'HostMail',
        Hl: '!HostMail',
        y: 'Year',
        z: '!Season',
        O: 'Spouse',
        o: '!Spouse',
        p: 'NpcVisibleHere',
      };
    const type = alias[kind] ?? kind,
      key = type.replace(/^!/, '').toLowerCase(),
      neg = type.startsWith('!');
    if (key === 'gamestatequery' || kind === 'G')
      return queryConditions(args.join(' '), save, farmer);
    let met: boolean | null = null,
      text = 'Additional event condition';
    if (key === 'friendship') {
      const states = [];
      const labels = [];
      for (let i = 0; i + 1 < args.length; i += 2) {
        states.push(
          farmer?.friendship ? range(farmer.friendship[args[i]] ?? 0, args[i + 1]) : null,
        );
        labels.push(`${args[i]}: ${Number(args[i + 1]) / 250} hearts or more`);
      }
      met = states.length ? and(states) : null;
      text = labels.join(' · ');
    } else if (key === 'sawevent') {
      met = farmer?.events ? args.every((id) => farmer.events!.includes(id)) : null;
      text = `Seen event: ${args.join(' / ')}`;
    } else if (key === 'localmail' || key === 'hostmail') {
      const f = key === 'hostmail' ? save?.players[0] : farmer;
      met = f?.mail ? f.mail.includes(args[0]) : null;
      text = `Letter / progression: ${args[0]}`;
    } else if (key === 'year') {
      met = range(save?.year, args[0]);
      text = `Year ${args[0]} or later`;
    } else if (key === 'season') {
      met = save ? args.some((s) => s.toLowerCase() === save.season) : null;
      text = `Season: ${args.join(' / ')}`;
    } else if (key === 'spouse') {
      met = farmer ? farmer.spouse === args[0] : null;
      text = `Spouse: ${args[0]}`;
    } else if (key === 'time') text = `Time: ${args[0]}–${args[1] ?? 2600}`;
    else if (key === 'weather') text = `Weather: ${args.join(' / ')}`;
    else if (key === 'npcvisiblehere') text = `Find ${args.join(' / ')} in this location`;
    if (neg) {
      met = met === null ? null : !met;
      text = `Except: ${text}`;
    }
    return [{ text, met, raw }];
  });
}
export const conditionsMet = (results: ConditionResult[]) => and(results.map((r) => r.met));
