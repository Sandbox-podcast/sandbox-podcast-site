import ChartPage, { generateMetadata as chartMetadata } from '../[slug]/page';
import { SkillGuideLinks } from '@/components/skill-guide';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function generateMetadata({ searchParams }: Props) {
  return chartMetadata({ params: Promise.resolve({ slug: 'skills' }), searchParams });
}

// Une page statique de routage associe l'image Skills à sa véritable URL.
export default function SkillsPage({ searchParams }: Props) {
  return (
    <>
      <ChartPage params={Promise.resolve({ slug: 'skills' })} searchParams={searchParams} />
      <div className="wrap">
        <SkillGuideLinks />
      </div>
    </>
  );
}
