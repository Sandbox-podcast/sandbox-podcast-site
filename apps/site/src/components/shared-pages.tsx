import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import * as Home from '@/app/(fr)/page';
import * as Podcast from '@/app/(fr)/podcast/page';
import * as Episode from '@/app/(fr)/episodes/[number]/page';
import * as About from '@/app/(fr)/about/page';
import * as Privacy from '@/app/(fr)/confidentialite/page';
import * as PersonalProjects from '@/app/(fr)/nos-projets/page';
import * as VideoClub from '@/app/(fr)/nos-projets/video-club/page';
import * as PersonalProject from '@/app/(fr)/nos-projets/[slug]/page';
import type { SharedPageRoute } from '@/i18n/page-routes';
import { translateText, type TranslationDictionary } from '@/i18n/translation';
import { personalProject } from '@/lib/personal-projects';

export interface SharedPageOptions {
  locale?: string;
  params: Record<string, string>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  dictionary: TranslationDictionary;
}
const value = (options: SharedPageOptions, name: string) => options.params[name] ?? '';
const slugParams = (options: SharedPageOptions) =>
  Promise.resolve({ slug: value(options, 'slug') });

interface SharedPage {
  render: (options: SharedPageOptions) => ReactNode;
  metadata: (options: SharedPageOptions) => Promise<Metadata> | Metadata;
}

export const sharedPages: Record<SharedPageRoute, SharedPage> = {
  '/': {
    render: () => <Home.default />,
    metadata: () => Home.generateMetadata(),
  },
  '/podcast': { render: () => <Podcast.default />, metadata: () => Podcast.generateMetadata() },
  '/episodes/:number': {
    render: (o) => <Episode.default params={Promise.resolve({ number: value(o, 'number') })} />,
    metadata: (o) =>
      Episode.generateMetadata({ params: Promise.resolve({ number: value(o, 'number') }) }),
  },
  '/about': {
    render: (o) => <About.default locale={o.locale ?? 'fr-FR'} />,
    metadata: () => About.metadata,
  },
  '/confidentialite': { render: () => <Privacy.default />, metadata: () => Privacy.metadata },
  '/nos-projets': {
    render: () => <PersonalProjects.default />,
    metadata: () => PersonalProjects.metadata,
  },
  '/nos-projets/:slug': {
    render: (o) => <PersonalProject.default params={slugParams(o)} locale={o.locale ?? 'fr-FR'} />,
    metadata: async (o) => {
      const metadata = await PersonalProject.generateMetadata({ params: slugParams(o) });
      const project = personalProject(value(o, 'slug'));
      const separator = o.locale && !o.locale.startsWith('fr') ? ': ' : ' : ';
      return project
        ? {
            ...metadata,
            title: `${project.name}${separator}${translateText(project.tagline, o.dictionary, o.locale)}`,
          }
        : metadata;
    },
  },
  '/nos-projets/video-club': {
    render: (o) => <VideoClub.default searchParams={o.searchParams} />,
    metadata: () => VideoClub.metadata,
  },
};
