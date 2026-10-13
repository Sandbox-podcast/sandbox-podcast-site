const HALF_DAY_MS = 12 * 60 * 60 * 1000;
const REFRESH_SLOT = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T(00|12):00Z$/;

/** Retourne le créneau UTC de douze heures qui contient la collecte. */
export function refreshSlotId(value: Date | string): string {
  const instant = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(instant.getTime())) throw new Error('Date de collecte invalide.');
  const slot = new Date(Math.floor(instant.getTime() / HALF_DAY_MS) * HALF_DAY_MS);
  return `${slot.toISOString().slice(0, 10)}T${slot.getUTCHours().toString().padStart(2, '0')}:00Z`;
}

/** Vérifie un identifiant de créneau 00:00 ou 12:00 UTC et sa date réelle. */
export function isRefreshSlotId(value: string): boolean {
  const match = REFRESH_SLOT.exec(value);
  return Boolean(
    match &&
    new Date(`${value.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) === value.slice(0, 10),
  );
}

/** Créneau du matin ou de l'après-midi pour une date donnée. */
export function refreshSlotForDate(date: string, half: 'first' | 'second' = 'first'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)))
    throw new Error('Date de collecte invalide.');
  const slot = `${date}T${half === 'first' ? '00' : '12'}:00Z`;
  if (!isRefreshSlotId(slot)) throw new Error('Date de collecte invalide.');
  return slot;
}

export function dateFromRefreshSlot(value: string): string {
  if (!isRefreshSlotId(value)) throw new Error('Créneau de collecte invalide.');
  return value.slice(0, 10);
}
