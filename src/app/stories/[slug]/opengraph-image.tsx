import { OG_SIZE, OG_TYPE, storyCard } from '@/lib/og';
import { allStories, getStory } from '@/lib/repository';

export const alt = 'Article';
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export function generateStaticParams() {
  return allStories().map((s) => ({ slug: s.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) throw new Error(`Article introuvable : ${slug}`);
  return storyCard(story);
}
