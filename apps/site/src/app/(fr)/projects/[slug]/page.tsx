import { notFound } from 'next/navigation';
import { EntityScreen } from '@/components/entity-screen';
import { entityDescription } from '@/lib/entity-meta';
import { allEntities, findEntity } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';
export const dynamicParams = false;
export function generateStaticParams() {
  return allEntities()
    .filter((e) => e.kind === 'project')
    .map((e) => ({ slug: e.slug }));
}
interface Props {
  params: Promise<{
    slug: string;
  }>;
}
export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const entity = findEntity(slug);
  if (entity?.kind !== 'project') return {};
  return pageMetadata({
    title: `${entity.name} : classement GitHub, historique et avis`,
    description: entityDescription(entity),
    path: `/projects/${entity.slug}`,
    ownImage: true,
  });
}
export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const entity = findEntity(slug);
  if (entity?.kind !== 'project') notFound();
  return <EntityScreen slug={slug} />;
}
