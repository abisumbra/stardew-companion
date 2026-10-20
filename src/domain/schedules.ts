import type { SaveProfile } from './models';
export type SchedulePoint = {
  time: number;
  arrival: boolean;
  location: string;
  x: number;
  y: number;
  facing: number | null;
  activity: string;
  home?: boolean;
  dialogue?: string;
};
export function scheduleKeys(
  name: string,
  data: Record<string, string>,
  save: SaveProfile,
  weather: string,
) {
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][save.day % 7],
    season = save.season;
  const hearts = Math.max(
    0,
    ...save.players.map((f) => Math.floor((f.friendship?.[name] ?? 0) / 250)),
  );
  const married = save.players.some((f) => f.spouse === name);
  const heartKeys = (prefix: string) =>
    Object.keys(data)
      .filter(
        (k) => new RegExp(`^${prefix}_\\d+$`, 'i').test(k) && Number(k.split('_').at(-1)) <= hearts,
      )
      .sort((a, b) => Number(b.split('_').at(-1)) - Number(a.split('_').at(-1)));
  const actualKey = (key: string) =>
    Object.keys(data).find((k) => k.toLowerCase() === key.toLowerCase());
  if (weather === 'green-rain' && save.year === 1 && actualKey('GreenRain'))
    return [actualKey('GreenRain')!];
  const festival =
    season === 'winter' && save.day >= 15 && save.day <= 17
      ? ['winter_15', 'winter_16', 'winter_17'][save.day - 15]
      : null;
  const keys = married
    ? [
        `marriage_${season}_${save.day}`,
        ...((['Harvey', 'Maru'].includes(name) && ['Tue', 'Thu'].includes(day)) ||
        (name === 'Penny' && ['Tue', 'Wed', 'Fri'].includes(day))
          ? ['marriageJob']
          : []),
        ...(weather === 'dry' || weather === 'unknown' ? [`marriage_${day}`] : []),
      ]
    : [
        ...(festival ? [festival] : []),
        `${season}_${save.day}`,
        ...heartKeys(String(save.day)),
        String(save.day),
        ...(name === 'Pam' && save.players[0].mail?.includes('ccVault') ? ['bus'] : []),
        ...(weather === 'rain' ? ['rain2', 'rain'] : []),
        ...heartKeys(`${season}_${day}`),
        `${season}_${day}`,
        ...heartKeys(day),
        day,
        season,
        `spring_${day}`,
        'spring',
        'default',
      ];
  return [...new Set(keys.map(actualKey).filter((k): k is string => Boolean(k)))];
}
export function parseSchedule(
  data: Record<string, string>,
  key: string,
  save: SaveProfile | null,
  home = 'Unknown',
  context: { homeTile?: [number, number]; married?: boolean } = {},
  seen = new Set<string>(),
): { points: SchedulePoint[]; notes: string[]; key: string } {
  const canonical = Object.keys(data).find((k) => k.toLowerCase() === key.toLowerCase()) ?? key;
  if (seen.has(canonical))
    return { points: [], notes: ['Schedule redirect cycle detected.'], key: canonical };
  seen.add(canonical);
  const commands = String(data[canonical] ?? '').split('/'),
    notes: string[] = [],
    points: SchedulePoint[] = [];
  let location = context.married ? 'BusStop' : home;
  const resolve = (next: string) => parseSchedule(data, next, save, home, context, new Set(seen));
  const tokenize = (value: string) =>
    (value.match(/"[^"]*"|\S+/g) ?? []).map((t) => t.replace(/^"|"$/g, ''));
  const sleepingHome = () => {
    if (context.married) return { location: 'Farm', x: -1, y: -1 };
    const defaultScript = data.default ?? data.spring ?? '';
    const last = defaultScript
      .split('/')
      .map(tokenize)
      .reverse()
      .find(
        (t) =>
          /^a?\d{1,4}$/.test(t[0]) &&
          t[1] &&
          t[1] !== 'bed' &&
          Number.isNaN(Number(t[1])) &&
          Number.isFinite(Number(t[2])) &&
          Number.isFinite(Number(t[3])),
      );
    return last
      ? { location: last[1], x: Number(last[2]), y: Number(last[3]) }
      : { location: home, x: context.homeTile?.[0] ?? -1, y: context.homeTile?.[1] ?? -1 };
  };
  if (!data[canonical])
    return {
      points: [],
      notes: ['No movement route is available for this variant.'],
      key: canonical,
    };
  for (let i = 0; i < commands.length; i++) {
    const tokens = tokenize(commands[i].trim());
    if (tokens[0] === 'GOTO') {
      const next = tokens[1]?.toLowerCase() === 'season' ? (save?.season ?? 'spring') : tokens[1];
      if (next === 'NO_SCHEDULE')
        return { points: [], notes: ['No route for this condition.'], key: canonical };
      const exists = Object.keys(data).some((k) => k.toLowerCase() === next?.toLowerCase());
      if (!exists && i > 0)
        return {
          points: [],
          notes: [...notes, 'The selected schedule redirect is unavailable.'],
          key: canonical,
        };
      const resolved = resolve(exists ? next : 'spring');
      return { points: resolved.points, notes: [...notes, ...resolved.notes], key: resolved.key };
    }
    if (tokens[0] === 'NOT') {
      if (tokens[1] === 'friendship' && save) {
        let blocked = false;
        for (let j = 2; j + 1 < tokens.length; j += 2)
          if (
            save.players.some(
              (f) => (f.friendship?.[tokens[j]] ?? 0) >= Number(tokens[j + 1]) * 250,
            )
          )
            blocked = true;
        if (blocked) return resolve('spring');
        if (save.players.some((f) => f.friendship === null))
          return { points: [], notes: ['A friendship condition needs checking.'], key: canonical };
      } else if (tokens[1] === 'friendship')
        return { points: [], notes: ['A friendship condition needs checking.'], key: canonical };
      continue;
    }
    if (tokens[0] === 'MAIL') {
      const mail = save?.players[0].mail;
      if (!mail) {
        notes.push(`Letter / world flag ${tokens[1]} is unknown.`);
        return { points, notes, key: canonical };
      }
      const flag =
        mail.includes(tokens[1]) || Boolean(save?.completion?.worldFlags?.includes(tokens[1]));
      const command = commands[i + (flag ? 2 : 1)];
      commands.splice(i, 3, command ?? '');
      i--;
      continue;
    }
    if (!/^a?\d{1,4}$/.test(tokens[0])) {
      if (tokens[0]) notes.push(`Additional schedule condition: ${commands[i]}`);
      continue;
    }
    const rawTime = Number(tokens[0].replace(/^a/, ''));
    const time = rawTime === 0 ? 600 : rawTime;
    if (time < 600 || time > 2600 || time % 100 >= 60) {
      notes.push('Invalid schedule time ignored.');
      continue;
    }
    if (tokens[1] === 'bed') {
      const destination = sleepingHome();
      points.push({
        time,
        arrival: tokens[0].startsWith('a'),
        ...destination,
        facing: null,
        activity: 'sleep',
        home: true,
      });
      continue;
    }
    let offset = 1;
    if (Number.isNaN(Number(tokens[1]))) {
      location = tokens[1];
      offset++;
    }
    const x = Number(tokens[offset]),
      y = Number(tokens[offset + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    points.push({
      time,
      arrival: tokens[0].startsWith('a'),
      location,
      x,
      y,
      facing: /^[0-3]$/.test(tokens[offset + 2] ?? '') ? Number(tokens[offset + 2]) : 2,
      activity: tokens
        .slice(offset + 2)
        .filter((t) => !t.includes('\\') && !t.includes(':') && !/^[0-3]$/.test(t))
        .join(' '),
      dialogue: tokens.find((t) => t.startsWith('Strings\\')),
    });
  }
  return { points, notes, key: canonical };
}
export const scheduleTime = (n: number) =>
  `${String(Math.floor(n / 100) % 24).padStart(2, '0')}:${String(n % 100).padStart(2, '0')}${n >= 2400 ? ' (+1 day)' : ''}`;
export function scheduleLabel(key: string) {
  if (key === 'rain2') return 'Rainy day · random alternative';
  if (key === 'rain') return 'Rainy day';
  if (key.toLowerCase() === 'greenrain') return 'Green Rain · first year';
  if (key === 'marriageJob') return 'Married · work day';
  if (key === 'bus') return 'Bus service day';
  if (key === 'default') return 'Default routine';
  const parts = key.split('_'),
    married = parts[0].toLowerCase() === 'marriage';
  if (married) parts.shift();
  return `${married ? 'Married · ' : ''}${parts.map((p, i) => (['spring', 'summer', 'fall', 'winter'].includes(p.toLowerCase()) ? p[0].toUpperCase() + p.slice(1) : /^\d+$/.test(p) ? (i > 0 && !['spring', 'summer', 'fall', 'winter'].includes(parts[i - 1]) ? `${p} hearts or more` : `Day ${p}`) : ({ Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }[p] ?? p))).join(' · ')}`;
}
export function scheduleActivity(point: SchedulePoint) {
  const animation = point.activity.toLowerCase();
  if (point.home || animation.includes('sleep')) return 'Returns home to sleep';
  for (const [pattern, label] of [
    [/flute/, 'Plays the flute'],
    [/video.*game/, 'Plays video games'],
    [/read|book/, 'Reads'],
    [/sit|chair|bench/, 'Sits and relaxes'],
    [/fish/, 'Fishes'],
    [/dance/, 'Dances'],
    [/exercise|weight|lift/, 'Exercises'],
    [/eat|drink/, 'Eats or drinks'],
    [/work|hammer|weld|counter/, 'Works'],
    [/square_/, 'Moves around this area'],
  ] as [RegExp, string][])
    if (pattern.test(animation)) return label;
  return animation ? 'Scheduled activity' : 'Stops at this destination';
}
