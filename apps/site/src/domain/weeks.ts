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

const CALENDAR_EDITION = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/** Une édition quotidienne est identifiée par sa date UTC `AAAA-MM-JJ`. */
export function isCalendarEdition(id: string): boolean {
  if (!CALENDAR_EDITION.test(id)) return false;
  return new Date(`${id}T00:00:00Z`).toISOString().slice(0, 10) === id;
}

/** Début de l'édition : le jour pour `AAAA-MM-JJ`, le lundi pour une semaine ISO. */
export function editionStart(id: string): Date {
  if (isCalendarEdition(id)) return new Date(`${id}T00:00:00Z`);
  return weekStart(id);
}

/** Fin affichée : le même jour, ou le dimanche d'une semaine ISO. */
export function editionEnd(id: string): Date {
  const start = editionStart(id);
  return isCalendarEdition(id) ? start : new Date(start.getTime() + 6 * DAY_MS);
}

export function compareWeeks(a: string, b: string): number {
  const delta = editionStart(a).getTime() - editionStart(b).getTime();
  if (delta !== 0) return delta;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Deux éditions se comparent si elles se suivent d'au plus huit jours.
 * Une semaine ISO manquante (14 jours) ne fabrique pas de mouvement.
 */
export function editionsFollow(previous: string, current: string): boolean {
  const gap = (editionStart(current).getTime() - editionStart(previous).getTime()) / DAY_MS;
  return gap > 0 && gap <= 8;
}

/** Dernière édition publiée assez proche pour servir de référence. */
export function previousComparableEdition(
  editions: readonly string[],
  current: string,
): string | undefined {
  return editions
    .filter((edition) => editionsFollow(edition, current))
    .toSorted((left, right) => compareWeeks(right, left))[0];
}

/** Toutes les semaines de `from` à `to` inclus, en ordre croissant. */
export function weekRange(from: string, to: string): string[] {
  const out: string[] = [];
  for (let w = from; compareWeeks(w, to) <= 0; w = nextWeek(w)) out.push(w);
  return out;
}

/** « S41 » pour une semaine ISO, « 11.10 » pour une édition datée. */
export function shortWeek(id: string): string {
  if (isCalendarEdition(id)) return `${id.slice(8, 10)}.${id.slice(5, 7)}`;
  return `S${String(parseWeek(id).week)}`;
}

/** Numéro de semaine, ou jour.mois pour une édition datée. */
export function editionMark(id: string): string {
  if (isCalendarEdition(id)) return shortWeek(id);
  return String(parseWeek(id).week);
}
