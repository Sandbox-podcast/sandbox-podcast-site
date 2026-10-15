import { DEMO_CONTENT_DESCRIPTION, hasDemoEntityHistory } from '../domain/demo-content.ts';
import { content } from './repository.ts';
import { pageMetadata } from './seo.ts';

export const isDemoEntity = (slug: string): boolean =>
  hasDemoEntityHistory(content().snapshots, slug);

export function demoPageMetadata(path: string, title: string) {
  return pageMetadata({
    title: `${title} : ancienne démonstration`,
    description: DEMO_CONTENT_DESCRIPTION,
    path,
    noindex: true,
    ownImage: true,
  });
}
