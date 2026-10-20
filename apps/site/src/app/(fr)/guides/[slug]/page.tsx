import { notFound } from 'next/navigation';
import { SkillGuideArticle } from '@/components/skill-guide';
import {
  findSkillGuide,
  SKILL_GUIDES_REVIEWED_AT,
  skillGuidePath,
  skillGuides,
} from '@/domain/skill-guides';
import { pageMetadata } from '@/lib/seo';

export const dynamicParams = false;
export function generateStaticParams() {
  return skillGuides.map(({ slug }) => ({ slug }));
}

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const guide = findSkillGuide((await params).slug);
  if (!guide) notFound();
  return pageMetadata({
    title: guide.title,
    description: guide.description,
    path: skillGuidePath(guide.slug),
    locale: 'fr-FR',
    type: 'article',
    modifiedTime: SKILL_GUIDES_REVIEWED_AT,
    noindex: false,
    localizedAlternates: [],
  });
}

export default async function GuidePage({ params }: Props) {
  const guide = findSkillGuide((await params).slug);
  if (!guide) notFound();
  return <SkillGuideArticle guide={guide} />;
}
