import Link from 'next/link';
import { MiniChart } from '@/components/cards';
import { TimeAgo } from '@/components/client';
import { JsonLd } from '@/components/json-ld';
import { siteConfig } from '@/config/site';
import { shortWeek } from '@/domain/weeks';
import { lastUpdated } from '@/lib/graph';
import { allCharts, latestWeek, weeksOf } from '@/lib/repository';
import { absoluteUrl, breadcrumbLd, pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Classements hebdomadaires tech et IA',
  description:
    'Les classements Sandbox, mis à jour chaque semaine : modèles IA, logiciels open source, projets GitHub et outils pour développeurs.',
  path: '/charts',
});

export default function ChartsPage() {
  const week = latestWeek();
  const updated = lastUpdated();
  const charts = allCharts();
  const featured = charts.find((chart) => chart.slug === 'ai-models') ?? charts[0];
  const otherCharts = charts.filter((chart) => chart.slug !== featured?.slug);

  return (
    <div className="wrap charts-home">
      <header className="charts-heading">
        <div>
          <p className="label text-ink-3">
            Semaine {shortWeek(week).slice(1)} · mis à jour <TimeAgo iso={updated.publishedAt} />
          </p>
          <h1 className="display">Les classements</h1>
        </div>
        <p className="charts-intro">
          Les tops Sandbox évoluent chaque semaine. Parcourez les positions, les mouvements et les
          semaines précédentes.
        </p>
      </header>

      <nav className="charts-tabs" aria-label="Choisir un classement">
        {charts.map((chart) => (
          <a href={`#chart-${chart.slug}`} key={chart.slug}>
            <span className="label">{chart.code}</span>
            <span>{chart.title}</span>
          </a>
        ))}
        <Link href="/charts/history">
          Historique par semaine <span aria-hidden="true">↗</span>
        </Link>
      </nav>

      {featured ? (
        <section
          className="featured-chart"
          id={`chart-${featured.slug}`}
          aria-labelledby="featured-chart-title"
        >
          <div className="featured-chart-copy">
            <p className="eyebrow">À la une · {featured.code}</p>
            <h2 id="featured-chart-title" className="display">
              {featured.title}
            </h2>
            <p>{featured.tagline}</p>
            <Link href={`/charts/${featured.slug}`} className="btn btn-solid">
              Voir le classement complet <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="featured-chart-preview">
            <MiniChart chart={featured.slug} week={week} top={3} heading="h3" />
          </div>
        </section>
      ) : null}

      <section className="charts-catalog" aria-labelledby="all-charts-title">
        <div className="media-shelf-heading">
          <div>
            <p className="label text-ink-3">{otherCharts.length} autres univers</p>
            <h2 id="all-charts-title" className="section-title">
              Explorer les tops
            </h2>
          </div>
        </div>
        <div className="charts-card-grid">
          {otherCharts.map((chart) => (
            <article className="chart-catalog-card" id={`chart-${chart.slug}`} key={chart.slug}>
              <MiniChart chart={chart.slug} week={week} top={5} heading="h3" />
              <p className="chart-catalog-description">{chart.description}</p>
              <p className="label chart-catalog-links">
                <Link href={`/charts/${chart.slug}`}>Top {chart.size} →</Link>
                <Link href={`/charts/${chart.slug}/methodology`}>Méthodologie</Link>
                <span>{weeksOf(chart.slug).length} semaines d’historique</span>
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="chart-method-note" aria-label="Méthodologie des classements">
        <p>
          Les classements se basent sur des sources publiques. Chaque page détaille ses critères,
          ses limites et son historique.
        </p>
        {featured ? (
          <Link href={`/charts/${featured.slug}/methodology`}>
            Méthode du classement à la une <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </section>

      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Classements Sandbox',
            description: siteConfig.description,
            url: absoluteUrl('/charts'),
            hasPart: charts.map((chart) => ({
              '@type': 'ItemList',
              name: chart.title,
              url: absoluteUrl(`/charts/${chart.slug}`),
            })),
          },
          breadcrumbLd([
            { name: 'Accueil', path: '/' },
            { name: 'Classements', path: '/charts' },
          ]),
        ]}
      />
    </div>
  );
}
