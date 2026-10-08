import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import * as Home from '@/app/(fr)/page';
import * as Episodes from '@/app/(fr)/episodes/page';
import * as Episode from '@/app/(fr)/episodes/[number]/page';
import * as Topics from '@/app/(fr)/topics/page';
import * as Topic from '@/app/(fr)/topics/[slug]/page';
import * as About from '@/app/(fr)/about/page';
import * as Search from '@/app/(fr)/search/page';
import * as Latest from '@/app/(fr)/latest/page';
import * as Story from '@/app/(fr)/stories/[slug]/page';
import * as Project from '@/app/(fr)/projects/[slug]/page';
import * as Model from '@/app/(fr)/models/[slug]/page';
import * as Move from '@/app/(fr)/moves/[chart]/[week]/[entity]/page';
import * as Charts from '@/app/(fr)/charts/page';
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
import type { SharedPageRoute } from '@/i18n/page-routes';
import type { TranslationDictionary } from '@/i18n/translation';

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
  '/': { render: () => <Home.default />, metadata: () => Home.generateMetadata() },
  '/episodes': {
    render: (o) => <Episodes.default searchParams={o.searchParams} />,
    metadata: (o) => Episodes.generateMetadata({ searchParams: o.searchParams }),
  },
  '/episodes/:number': {
    render: (o) => <Episode.default params={Promise.resolve({ number: value(o, 'number') })} />,
    metadata: (o) =>
      Episode.generateMetadata({ params: Promise.resolve({ number: value(o, 'number') }) }),
  },
  '/topics': { render: () => <Topics.default />, metadata: () => Topics.metadata },
  '/topics/:slug': {
    render: (o) => <Topic.default params={slugParams(o)} />,
    metadata: (o) => Topic.generateMetadata({ params: slugParams(o) }),
  },
  '/about': { render: () => <About.default />, metadata: () => About.metadata },
  '/search': {
    render: (o) => <Search.default searchParams={o.searchParams} dictionary={o.dictionary} />,
    metadata: () => Search.metadata,
  },
  '/latest': { render: () => <Latest.default />, metadata: () => Episodes.generateMetadata() },
  '/stories/:slug': {
    render: () => <Story.default />,
    metadata: () => Episodes.generateMetadata(),
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
      <SkillPlatform.default params={Promise.resolve({ platform: value(o, 'platform') })} />
    ),
    metadata: (o) =>
      SkillPlatform.generateMetadata({
        params: Promise.resolve({ platform: value(o, 'platform') }),
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
    render: () => <RisingMethod.default />,
    metadata: () => RisingMethod.metadata,
  },
  '/charts/rising/:week': {
    render: (o) => <RisingWeek.default params={weekParams(o)} searchParams={o.searchParams} />,
    metadata: (o) =>
      RisingWeek.generateMetadata({ params: weekParams(o), searchParams: o.searchParams }),
  },
  '/charts/:slug/methodology': {
    render: (o) => <ChartMethod.default params={slugParams(o)} />,
    metadata: (o) => ChartMethod.generateMetadata({ params: slugParams(o) }),
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
