/** Une collecte partielle peut être reprise ; elle ne vaut pas publication réussie. */
export function chartsJobHttpStatus(status: string): number {
  return ['success', 'skipped'].includes(status) ? 200 : 503;
}
