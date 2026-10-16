import MethodologyPage, {
  generateMetadata as methodologyMetadata,
} from '@/app/(fr)/charts/[slug]/methodology/page';
export const dynamic = 'force-dynamic';
interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}
export function generateMetadata({ searchParams }: Props) {
  return methodologyMetadata({ params: Promise.resolve({ slug: 'rising' }), searchParams });
}
export default function Page({ searchParams }: Props) {
  return MethodologyPage({ params: Promise.resolve({ slug: 'rising' }), searchParams });
}
