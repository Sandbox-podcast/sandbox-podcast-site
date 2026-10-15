import { historyDate, type HistoryWrapped } from './time-machine.ts';

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** SVG autonome, avec sources cliquables, sans scripts ni ressources distantes. */
export function timeMachineWrappedSvg(wrapped: HistoryWrapped): string {
  const highlights = wrapped.highlights.length ? wrapped.highlights : wrapped.events.slice(0, 6);
  const rows = highlights
    .map((event, index) => {
      const y = 350 + index * 79;
      return (
        '<g><text x="82" y="' +
        String(y) +
        '" fill="#718a9b" font-size="15">' +
        escapeXml(historyDate(event.date)) +
        '</text>' +
        '<a href="' +
        escapeXml(event.sources[0]?.url ?? '') +
        '"><text x="300" y="' +
        String(y) +
        '" fill="#f4f7fa" font-size="23">' +
        escapeXml(event.shortTitle) +
        '</text></a>' +
        '<text x="300" y="' +
        String(y + 25) +
        '" fill="#9baebb" font-size="14">' +
        escapeXml(event.organization) +
        '</text>' +
        '<path d="M82 ' +
        String(y + 45) +
        'H1118" stroke="#203746"/></g>'
      );
    })
    .join('');
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="960" viewBox="0 0 1200 960">' +
    '<title>Sandbox Wrapped ' +
    String(wrapped.year) +
    ", histoire mondiale de l'IA</title>" +
    '<rect width="1200" height="960" fill="#07121c"/>' +
    '<g font-family="Arial, sans-serif"><text x="82" y="77" font-size="20" fill="#50d9ee" letter-spacing="4">SANDBOX / TIME MACHINE</text>' +
    '<text x="78" y="193" font-size="96" font-weight="700" fill="#f4f7fa">Wrapped ' +
    String(wrapped.year) +
    '.</text>' +
    '<text x="82" y="242" font-size="24" fill="#9baebb">' +
    String(wrapped.events.length) +
    ' événements documentés. ' +
    String(wrapped.models) +
    ' annonces de modèles.</text>' +
    '<text x="82" y="285" font-size="15" fill="#50d9ee">' +
    (wrapped.ongoing ? 'ANNÉE EN COURS' : "SÉLECTION ÉDITORIALE DE L'ANNÉE") +
    '</text>' +
    rows +
    '<text x="82" y="870" font-size="15" fill="#9baebb">Sélection non exhaustive. Cliquez sur un titre pour consulter sa source primaire.</text>' +
    '<text x="82" y="905" font-size="14" fill="#718a9b">Recherche vérifiée le ' +
    escapeXml(historyDate(wrapped.reviewedAt)) +
    '. Aucun score de performance.</text></g></svg>'
  );
}
