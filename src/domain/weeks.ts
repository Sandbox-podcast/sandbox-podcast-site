/** Semaines ISO 8601 (lundi → dimanche), calculées en UTC pour que le serveur et le navigateur s'accordent. */

export interface IsoWeek {
  year: number;
  week: number;
}

const DAY_MS = 86_400_000;

export function parseWeek(id: string): IsoWeek {
  const match = /^(\d{4})-W(\d{2})$/.exec(id);
  if (!match) throw new Error(`Semaine invalide : ${id}`);
  return { year: Number(match[1]), week: Number(match[2]) };
}

export function formatWeek({ year, week }: IsoWeek): string {
  return `${String(year)}-W${String(week).padStart(2, '0')}`;
}

/** Lundi de la semaine ISO 1 de l'année : c'est le lundi de la semaine qui contient le 4 janvier. */
function firstMonday(year: number): number {
  const jan4 = Date.UTC(year, 0, 4);
  const dow = new Date(jan4).getUTCDay() || 7;
  return jan4 - (dow - 1) * DAY_MS;
}

export function weekStart(id: string): Date {
  const { year, week } = parseWeek(id);
  return new Date(firstMonday(year) + (week - 1) * 7 * DAY_MS);
}

export function weekEnd(id: string): Date {
  return new Date(weekStart(id).getTime() + 6 * DAY_MS);
}

export function isoWeekOf(date: Date): string {
  // Le jeudi de la semaine détermine l'année ISO.
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / DAY_MS + 1) / 7);
  return formatWeek({ year, week });
}

export function addWeeks(id: string, n: number): string {
  return isoWeekOf(new Date(weekStart(id).getTime() + n * 7 * DAY_MS));
}

export function previousWeek(id: string): string {
  return addWeeks(id, -1);
}

export function nextWeek(id: string): string {
  return addWeeks(id, 1);
}

export function compareWeeks(a: string, b: string): number {
  return weekStart(a).getTime() - weekStart(b).getTime();
}

/** Toutes les semaines de `from` à `to` inclus, en ordre croissant. */
export function weekRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let w = from; compareWeeks(w, to) <= 0; w = nextWeek(w)) out.push(w);
  return out;
}

/** « S41 » : forme courte pour les pastilles. */
export function shortWeek(id: string): string {
  return `S${String(parseWeek(id).week)}`;
}
