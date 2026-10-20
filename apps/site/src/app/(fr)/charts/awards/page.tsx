import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Text, LocalizedLink as Link, LocalizedElement } from '@/components/localization';
import { Breadcrumbs } from '@/components/ui';
import { AwardCard } from '@/components/award-card';
import {
  AWARD_DEFINITIONS,
  AWARD_RULE_DESCRIPTIONS,
  awardAssignmentIdSchema,
  awardChartSchema,
  awardPeriod,
  awardTypeSchema,
  type AwardType,
  type AwardChart,
} from '@/domain/awards';
import { readPublicAwards, type PublicAward } from '@/lib/awards-store';
import { pageMetadata } from '@/lib/seo';
import styles from '@/components/badges.module.css';

export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({
  title: 'Sandbox Badges & Awards',
  description:
    'Ton rang GitHub AI et les récompenses Sandbox : catégories, progression, Rising, Skills, modèles et palmarès annuels.',
  path: '/charts/awards',
  noindex: false,
});
interface Filters {
  type?: AwardType;
  chart?: AwardChart;
  period?: string;
  before?: string;
}
function historyHref(filters: Filters, withCursor = true): string {
  const query = new URLSearchParams();
  if (filters.type) query.set('type', filters.type);
  if (filters.chart) query.set('chart', filters.chart);
  if (filters.period) query.set('period', filters.period);
  if (filters.before && withCursor) query.set('before', filters.before);
  return `/charts/awards${query.size ? `?${query.toString()}` : ''}#award-history`;
}

export default async function Page({
  searchParams = Promise.resolve({}),
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const filters: Filters = {};
  for (const key of ['type', 'chart', 'period', 'before'] as const) {
    const value = query[key];
    if (value === undefined || value === '') continue;
    if (typeof value !== 'string') notFound();
    if (key === 'type') {
      const parsed = awardTypeSchema.safeParse(value);
      if (!parsed.success) notFound();
      filters.type = parsed.data;
    }
    if (key === 'chart') {
      const parsed = awardChartSchema.safeParse(value);
      if (!parsed.success) notFound();
      filters.chart = parsed.data;
    }
    if (key === 'period') filters.period = value;
    if (key === 'before') {
      if (!awardAssignmentIdSchema.safeParse(value).success) notFound();
      filters.before = value;
    }
  }
  if (filters.period) {
    if (!filters.type) notFound();
    try {
      awardPeriod(filters.type, filters.period);
    } catch {
      notFound();
    }
  }
  return (
    <article className={`wrap ${styles['awardsPage']}`}>
      <Breadcrumbs
        items={[{ label: 'Classements', href: '/charts' }, { label: 'Badges & Awards' }]}
      />
      <header>
        <p className="sc-label">SANDBOX CHARTS</p>
        <h1>Badges &amp; Awards</h1>
        <p>
          <Text>{'Ta place dans les classements, prête à afficher dans ton README.'}</Text>
        </p>
        <Link className="btn btn-solid" href="/charts/github">
          <Text>{'Trouver mon projet'}</Text>
        </Link>
      </header>
      <section className={styles['method']} aria-labelledby="badge-criteria">
        <h2 id="badge-criteria">
          <Text>{'Un rang actuel, des récompenses datées'}</Text>
        </h2>
        <h3>Sandbox Top 100</h3>
        <p>
          <Text>
            {
              'Le badge GitHub AI affiche le rang officiel du projet dans la dernière édition publiée. Il est disponible pour les rangs 1 à 100. Le classement publie actuellement 20 positions : seuls ces projets peuvent donc le récupérer.'
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              'Son URL reste la même. Il devient neutre si le projet quitte le Top 100, si son dépôt est indisponible ou si les mesures ont plus de 48 heures. Il se réactive automatiquement lorsque les conditions sont à nouveau réunies.'
            }
          </Text>
        </p>
        {awardTypeSchema.options.map((type) => (
          <div key={type} className={styles['criterion']}>
            <h3>{AWARD_DEFINITIONS[type].name}</h3>
            <p>
              <Text>{AWARD_RULE_DESCRIPTIONS[type]}</Text>
            </p>
            <Link href={historyHref({ type })}>
              <Text>{'Voir les lauréats'}</Text>
            </Link>
          </div>
        ))}
        <p>
          <Text>
            {
              'Les semaines suivent le calendrier ISO en Europe/Paris. Les récompenses attendent la clôture de leur période. Les sources, rangs, scores et règles sont conservés ; un retrait reste visible et ne donne pas lieu à une nouvelle attribution.'
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              'Une édition absente, incomplète, retirée ou sans preuve suffisante ne donne aucun lauréat. Les prix réutilisent les classements publiés sans recalculer leurs scores. Rising exige les mesures GitHub à J-7 et J-14 et le contrôle OpenSSF.'
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              'Ces distinctions mesurent une position et une dynamique parmi les projets suivis. Elles ne constituent ni un audit de code, ni une certification de sécurité, ni une récompense officielle de GitHub.'
            }
          </Text>
        </p>
        <Link href="/charts/rising/methodology">
          <Text>{'Méthode Rising et sources'}</Text>
        </Link>
      </section>
      <section aria-labelledby="award-history">
        <h2 id="award-history">
          <Text>{'Les lauréats'}</Text>
        </h2>
        <LocalizedElement
          as="form"
          className={styles['filters']}
          method="get"
          action="/charts/awards"
        >
          <label>
            <span id="award-type-label">
              <Text>{'Récompense'}</Text>
            </span>
            <select
              name="type"
              aria-labelledby="award-type-label"
              defaultValue={filters.type ?? ''}
            >
              <option value="">
                <Text>{'Toutes les récompenses'}</Text>
              </option>
              {awardTypeSchema.options.map((type) => (
                <option value={type} key={type}>
                  {AWARD_DEFINITIONS[type].name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span id="award-chart-label">
              <Text>{'Classement'}</Text>
            </span>
            <select
              name="chart"
              aria-labelledby="award-chart-label"
              defaultValue={filters.chart ?? ''}
            >
              <option value="">
                <Text>{'Tous les classements'}</Text>
              </option>
              {awardChartSchema.options.map((chart) => (
                <option value={chart} key={chart}>
                  {chart.toUpperCase()}
                </option>
              ))}
            </select>
          </label>
          <button className="btn" type="submit">
            <Text>{'Filtrer'}</Text>
          </button>
          {filters.type || filters.chart || filters.period ? (
            <Link href="/charts/awards#award-history">
              <Text>{'Réinitialiser les filtres'}</Text>
            </Link>
          ) : null}
        </LocalizedElement>
        {filters.period ? (
          <p>
            <Text>{'Période : '}</Text>
            {filters.period}
          </p>
        ) : null}
        <Suspense
          fallback={
            <div role="status">
              <Text>{'Chargement des distinctions.'}</Text>
            </div>
          }
        >
          <AwardHistory filters={filters} />
        </Suspense>
      </section>
      <section id="installation" className={styles['method']}>
        <h2>
          <Text>{'Installer ton badge'}</Text>
        </h2>
        <ol>
          <li>
            <Text>
              {
                'Ouvrez la fiche du projet, de la skill ou du modèle depuis son classement ou sa récompense.'
              }
            </Text>
          </li>
          <li>
            <Text>
              {'Dans les distinctions, ouvrez "Obtenir mon badge" et copiez le Markdown.'}
            </Text>
          </li>
          <li>
            <Text>
              {
                "Colle ce code dans ton README.md, puis enregistre la modification sur GitHub. Le badge renvoie vers la fiche Sandbox. Tu peux aussi utiliser le format HTML ou l'URL SVG."
              }
            </Text>
          </li>
        </ol>
        <p>
          <Text>
            {
              "Aucun compte Sandbox ni accès GitHub n'est demandé. Chaque visiteur peut copier un badge public. Seules les personnes autorisées sur le dépôt peuvent modifier son README."
            }
          </Text>
        </p>
        <p>
          <Text>
            {
              "GitHub et les autres plateformes peuvent garder une copie de l'image en cache. Une mise à jour peut donc apparaître avec un délai. La fiche Sandbox reste la référence pour le rang et la date des mesures."
            }
          </Text>
        </p>
      </section>
    </article>
  );
}

async function AwardHistory({ filters }: { filters: Filters }) {
  let awards: PublicAward[] = [];
  let unavailable = false;
  let hasMore = false;
  try {
    const rows = await readPublicAwards({ ...filters, limit: 21 });
    hasMore = rows.length > 20;
    awards = rows.slice(0, 20);
  } catch (error) {
    unavailable = true;
    console.error(
      'Sandbox Awards history unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
  }
  const last = awards.at(-1);
  return (
    <>
      {awards.length ? (
        <ol className={styles['winners']}>
          {awards.map((award) => (
            <li key={award.id}>
              <AwardCard award={award} />
            </li>
          ))}
        </ol>
      ) : (
        <div className={styles['badgeCard']} role="status">
          <p>
            <Text>
              {unavailable
                ? "L'historique des Awards est temporairement indisponible."
                : filters.before || filters.type || filters.chart || filters.period
                  ? 'Aucune récompense pour cette période.'
                  : "Aucune récompense n'a encore été attribuée. Les lauréats apparaîtront après une clôture disposant des données nécessaires."}
            </Text>
          </p>
        </div>
      )}
      {filters.before || hasMore ? (
        <LocalizedElement
          as="nav"
          className={styles['pagination']}
          aria-label="Pagination des récompenses"
        >
          {filters.before ? (
            <Link href={historyHref(filters, false)}>
              <Text>{'Éditions récentes'}</Text>
            </Link>
          ) : null}
          {hasMore && last ? (
            <Link href={historyHref({ ...filters, before: last.id })}>
              <Text>{'Éditions précédentes'}</Text>
            </Link>
          ) : null}
        </LocalizedElement>
      ) : null}
    </>
  );
}
