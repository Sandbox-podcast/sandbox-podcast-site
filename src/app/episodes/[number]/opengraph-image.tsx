import { OG_SIZE, OG_TYPE, episodeCard } from '@/lib/og';
import { allEpisodes, getEpisode } from '@/lib/repository';

export const alt = 'Épisode du podcast';
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export function generateStaticParams() {
  return allEpisodes().map((e) => ({ number: String(e.number) }));
}

export default async function Image({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const episode = getEpisode(Number(number));
  if (!episode) throw new Error(`Épisode introuvable : ${number}`);
  return episodeCard(episode);
}
