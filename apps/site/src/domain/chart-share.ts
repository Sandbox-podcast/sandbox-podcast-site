export const SHARE_FORMATS = {
  linkedin: { label: 'LinkedIn', width: 1200, height: 630 },
  x: { label: 'X', width: 1600, height: 900 },
  instagram: { label: 'Instagram', width: 1080, height: 1080 },
  story: { label: 'Story', width: 1080, height: 1920 },
  video: { label: 'Vidéo 16:9', width: 1920, height: 1080 },
} as const;
export type ShareFormat = keyof typeof SHARE_FORMATS;
export interface ChartShareContent {
  week: string;
  title: string;
  name: string;
  rank: number;
  movement: string;
  stat: string;
  growth: string;
  fixture: boolean;
}
const escape = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character] ??
      character,
  );
export function chartShareSvg(content: ChartShareContent, format: ShareFormat): string {
  const { width, height } = SHARE_FORMATS[format];
  const scale = width / 1200;
  const tall = height / width > 1.2;
  const header = 70 * scale;
  const rankY = tall ? height * 0.42 : height * 0.52;
  const nameY = tall ? height * 0.59 : height * 0.7;
  const name = content.name.toUpperCase();
  const size = Math.min(74 * scale, (width * 0.82) / Math.max(1, name.length * 0.61));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#05090d"/><g font-family="Arial, sans-serif" fill="#f4f7fa"><text x="${header}" y="${header}" font-size="${22 * scale}" font-weight="700" letter-spacing="3">SANDBOX CHARTS</text><text x="${width - header}" y="${header}" text-anchor="end" font-size="${22 * scale}" fill="#3cd6fc">W${escape(content.week.slice(-2))} / ${escape(content.week.slice(0, 4))}</text><path d="M${header},${header + 30 * scale}H${width - header}" stroke="#294457"/><text x="${header}" y="${rankY}" font-size="${tall ? width * 0.37 : height * 0.42}" font-weight="900" fill="#3cd6fc">${String(content.rank).padStart(2, '0')}</text><text x="${width - header}" y="${rankY - 30 * scale}" text-anchor="end" font-size="${60 * scale}" font-weight="700">${escape(content.movement)}</text><text x="${header}" y="${nameY}" font-size="${size}" font-weight="900">${escape(name)}</text><text x="${header}" y="${nameY + 65 * scale}" font-size="${30 * scale}" fill="#ade9f9">${escape(content.stat)} ${escape(content.growth)}</text><text x="${header}" y="${height - header}" font-size="${18 * scale}" fill="#9baebb">${escape(content.title)}${content.fixture ? ' / FIXTURES' : ''}</text><text x="${width - header}" y="${height - header}" text-anchor="end" font-size="${18 * scale}">sandboxpodcast.fr</text></g></svg>`;
}
