/** Vrai pendant `next build` (workers SSG) — Postgres/Neon peut être injoignable depuis Vercel. */
export function isNextProductionBuild(): boolean {
  return process.env['NEXT_PHASE'] === 'phase-production-build';
}
