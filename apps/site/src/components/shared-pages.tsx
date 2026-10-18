import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import * as Home from '@/app/(fr)/page';
import * as Podcast from '@/app/(fr)/podcast/page';
import * as Episode from '@/app/(fr)/episodes/[number]/page';
import * as About from '@/app/(fr)/about/page';
import * as Search from '@/components/search-screen';
import * as Privacy from '@/app/(fr)/confidentialite/page';
import * as Latest from '@/app/(fr)/latest/page';
import * as Story from '@/app/(fr)/stories/[slug]/page';
import * as Project from '@/app/(fr)/projects/[slug]/page';
import * as Model from '@/app/(fr)/models/[slug]/page';
import * as Move from '@/components/move-screen';
import * as Charts from '@/app/(fr)/charts/page';
import * as Awards from '@/app/(fr)/charts/awards/page';
import * as AwardEdition from '@/app/(fr)/charts/awards/[week]/page';
import * as AssignedAward from '@/app/(fr)/charts/awards/edition/[id]/page';
import * as ChartEntity from '@/app/(fr)/charts/entity/[slug]/page';
import * as Chart from '@/app/(fr)/charts/[slug]/page';
import * as ChartWeek from '@/app/(fr)/charts/[slug]/[week]/page';
import * as ChartMethod from '@/app/(fr)/charts/[slug]/methodology/page';
import * as History from '@/app/(fr)/charts/history/page';
import * as HistoryWeek from '@/app/(fr)/charts/history/[week]/page';
import * as ChartProject from '@/app/(fr)/charts/project/[slug]/page';
import * as SkillPlatform from '@/app/(fr)/charts/skills/[platform]/page';
import * as ModelTask from '@/app/(fr)/charts/models/[task]/page';
import * as Rising from '@/app/(fr)/charts/rising/page';
import * as RisingWeek from '@/app/(fr)/charts/rising/[week]/page';
import * as RisingMethod from '@/app/(fr)/charts/rising/methodology/page';
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
const weekParams = (options: SharedPageOptions) =>
  Promise.resolve({ week: value(options, 'week') });
const chartWeekParams = (options: SharedPageOptions) =>
  Promise.resolve({ slug: value(options, 'slug'), week: value(options, 'week') });

interface SharedPage {
  render: (options: SharedPageOptions) => ReactNode;
  metadata: (options: SharedPageOptions) => Promise<Metadata> | Metadata;
}

export const sharedPages: Record<SharedPageRoute, SharedPage> = {
  '/': {
    render: (o) => <Home.default searchParams={o.searchParams} locale={o.locale ?? 'fr-FR'} />,
    metadata: (o) => Home.generateMetadata({ searchParams: o.searchParams }),
  },
  '/podcast': { render: () => <Podcast.default />, metadata: () => Podcast.generateMetadata() },
  '/episodes/:number': {
    render: (o) => <Episode.default params={Promise.resolve({ number: value(o, 'number') })} />,
    metadata: (o) =>
      Episode.generateMetadata({ params: Promise.resolve({ number: value(o, 'number') }) }),
  },
  '/about': { render: () => <About.default />, metadata: () => About.metadata },
  '/confidentialite': { render: () => <Privacy.default />, metadata: () => Privacy.metadata },
  '/nos-projets': {
    render: () => <PersonalProjects.default />,
    metadata: () => PersonalProjects.metadata,
  },
  '/nos-projets/:slug': {
    render: (o) => <PersonalProject.default params={slugParams(o)} />,
    metadata: async (o) => {
      const metadata = await PersonalProject.generateMetadata({ params: slugParams(o) });
      const project = personalProject(value(o, 'slug'));
      return project
        ? {
            ...metadata,
            title: `${project.name} : ${translateText(project.tagline, o.dictionary)}`,
          }
        : metadata;
    },
  },
  '/nos-projets/video-club': {
    render: (o) => <VideoClub.default searchParams={o.searchParams} />,
    metadata: () => VideoClub.metadata,
  },
  '/search': {
    render: (o) => <Search.default searchParams={o.searchParams} dictionary={o.dictionary} />,
    metadata: () => Search.metadata,
  },
  '/latest': { render: () => <Latest.default />, metadata: () => Podcast.generateMetadata() },
  '/stories/:slug': {
    render: () => <Story.default />,
    metadata: () => Podcast.generateMetadata(),
  },
  '/projects/:slug': {
    render: (o) => <Project.default params={slugParams(o)} />,
    metadata: (o) => Project.generateMetadata({ params: slugParams(o) }),
  },
  '/models/:slug': {
    render: (o) => <Model.default params={slugParams(o)} />,
    metadata: (o) => Model.generateMetadata({ params: slugParams(o) }),
  },
  '/moves/:chart/:week/:entity': {
    render: (o) => (
      <Move.default
        locale={o.locale ?? 'fr-FR'}
        dictionary={o.dictionary}
        params={Promise.resolve({
          chart: value(o, 'chart'),
          week: value(o, 'week'),
          entity: value(o, 'entity'),
        })}
      />
    ),
    metadata: (o) =>
      Move.generateMetadata({
        params: Promise.resolve({
          chart: value(o, 'chart'),
          week: value(o, 'week'),
          entity: value(o, 'entity'),
        }),
      }),
  },
  '/charts': {
    render: (o) => <Charts.default searchParams={o.searchParams} />,
    metadata: (o) => Charts.generateMetadata({ searchParams: o.searchParams }),
  },
  '/charts/history': {
    render: () => <History.default />,
    metadata: () => History.generateMetadata(),
  },
  '/charts/awards': {
    render: (o) => <Awards.default searchParams={o.searchParams} />,
    metadata: () => Awards.metadata,
  },
  '/charts/awards/:week': {
    render: (o) => <AwardEdition.default params={weekParams(o)} />,
    metadata: (o) => AwardEdition.generateMetadata({ params: weekParams(o) }),
  },
  '/charts/awards/edition/:id': {
    render: (o) => <AssignedAward.default params={Promise.resolve({ id: value(o, 'id') })} />,
    metadata: (o) =>
      AssignedAward.generateMetadata({ params: Promise.resolve({ id: value(o, 'id') }) }),
  },
  '/charts/entity/:slug': {
    render: (o) => <ChartEntity.default params={slugParams(o)} />,
    metadata: (o) => ChartEntity.generateMetadata({ params: slugParams(o) }),
  },
  '/charts/history/:week': {
    render: (o) => <HistoryWeek.default params={weekParams(o)} searchParams={o.searchParams} />,
    metadata: (o) =>
      HistoryWeek.generateMetadata({ params: weekParams(o), searchParams: o.searchParams }),
  },
  '/charts/project/:slug': {
    render: (o) => <ChartProject.default params={slugParams(o)} />,
    metadata: (o) => ChartProject.generateMetadata({ params: slugParams(o) }),
  },
  '/charts/skills/:platform': {
    render: (o) => (
      <SkillPlatform.default
        params={Promise.resolve({ platform: value(o, 'platform') })}
        searchParams={o.searchParams}
      />
    ),
    metadata: (o) =>
      SkillPlatform.generateMetadata({
        params: Promise.resolve({ platform: value(o, 'platform') }),
        searchParams: o.searchParams,
      }),
  },
  '/charts/models/:task': {
    render: (o) => <ModelTask.default params={Promise.resolve({ task: value(o, 'task') })} />,
    metadata: (o) =>
      ModelTask.generateMetadata({ params: Promise.resolve({ task: value(o, 'task') }) }),
  },
  '/charts/rising': {
    render: (o) => <Rising.default searchParams={o.searchParams} />,
    metadata: (o) => Rising.generateMetadata({ searchParams: o.searchParams }),
  },
  '/charts/rising/methodology': {
    render: (o) => <RisingMethod.default searchParams={o.searchParams} />,
    metadata: (o) => RisingMethod.generateMetadata({ searchParams: o.searchParams }),
  },
  '/charts/rising/:week': {
    render: (o) => <RisingWeek.default params={weekParams(o)} searchParams={o.searchParams} />,
    metadata: (o) =>
      RisingWeek.generateMetadata({ params: weekParams(o), searchParams: o.searchParams }),
  },
  '/charts/:slug/methodology': {
    render: (o) => <ChartMethod.default params={slugParams(o)} searchParams={o.searchParams} />,
    metadata: (o) =>
      ChartMethod.generateMetadata({ params: slugParams(o), searchParams: o.searchParams }),
  },
  '/charts/:slug/:week': {
    render: (o) => <ChartWeek.default params={chartWeekParams(o)} searchParams={o.searchParams} />,
    metadata: (o) =>
      ChartWeek.generateMetadata({ params: chartWeekParams(o), searchParams: o.searchParams }),
  },
  '/charts/:slug': {
    render: (o) => <Chart.default params={slugParams(o)} searchParams={o.searchParams} />,
    metadata: (o) =>
      Chart.generateMetadata({ params: slugParams(o), searchParams: o.searchParams }),
  },
};
