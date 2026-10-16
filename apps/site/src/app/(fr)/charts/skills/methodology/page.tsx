import MethodologyPage, {
  generateMetadata as methodologyMetadata,
} from '@/app/(fr)/charts/[slug]/methodology/page';

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export function generateMetadata({ searchParams }: Props) {
  return methodologyMetadata({ params: Promise.resolve({ slug: 'skills' }), searchParams });
}

export default function SkillsMethodologyPage({ searchParams }: Props) {
  return MethodologyPage({ params: Promise.resolve({ slug: 'skills' }), searchParams });
}
