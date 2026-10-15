import MethodologyPage, {
  generateMetadata as methodologyMetadata,
} from '@/app/(fr)/charts/[slug]/methodology/page';

export function generateMetadata() {
  return methodologyMetadata({ params: Promise.resolve({ slug: 'skills' }) });
}

export default function SkillsMethodologyPage() {
  return MethodologyPage({ params: Promise.resolve({ slug: 'skills' }) });
}
