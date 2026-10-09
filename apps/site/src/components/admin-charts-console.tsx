'use client';

import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import {
  chartsAdminResponseSchema,
  chartsAdminWriteSchema,
  type ChartsAdminResponse,
} from '@/domain/charts-admin';
import {
  chartCategorySchema,
  trackingStatusSchema,
  type GithubChartConfig,
} from '@/domain/github-charts';
import { formatCompact } from '@/domain/format';
import { AdminChartsEdition } from './admin-charts-edition';
import './admin-charts.css';

type Tab = 'dashboard' | 'repositories' | 'candidates' | 'weekly' | 'settings';
type Command = z.infer<typeof chartsAdminWriteSchema>;
const tabs: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Collectes' },
  { id: 'repositories', label: 'Dépôts suivis' },
  { id: 'candidates', label: 'Candidats' },
  { id: 'weekly', label: 'Édition de la semaine' },
  { id: 'settings', label: 'Méthode' },
];
const resultSchema = z.object({
  ok: z.boolean(),
  summary: z.object({ status: z.string(), details: z.array(z.string()).default([]) }).optional(),
});
const errorSchema = z.object({ error: z.string() });
const statusLabels: Record<string, string> = {
  candidate: 'Candidat',
  tracked: 'Suivi',
  ignored: 'Ignoré',
  blocked: 'Bloqué',
  running: 'En cours',
  success: 'Terminé',
  partial: 'Partiel',
  failed: 'Échec',
  insufficient_history: 'Historique insuffisant',
  skipped: 'Déjà traité',
  dry_run: 'Simulation',
};
const metric = (value: number | null): string => (value === null ? '—' : formatCompact(value));
async function adminRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
  });
  const value: unknown = await response.json();
  if (!response.ok)
    throw new Error(
      errorSchema.safeParse(value).data?.error ?? `Requête impossible (${response.status}).`,
    );
  return value;
}

export function AdminChartsConsole({
  permissions,
  author,
}: {
  permissions: { draft: boolean; publish: boolean };
  author: string;
}) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [data, setData] = useState<ChartsAdminResponse | null>(null);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('tracked');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [edition, setEdition] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams({ page: String(page), q: query });
      if (tab === 'candidates') params.set('status', 'candidate');
      if (tab === 'repositories' && status) params.set('status', status);
      if (edition) params.set('edition', edition);
      const value = await adminRequest(
        `/api/admin/charts?${params}`,
        signal ? { signal } : undefined,
      );
      setData(chartsAdminResponseSchema.parse(value));
    },
    [page, query, tab, status, edition],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch((error: unknown) => {
      if (!controller.signal.aborted)
        setMessage(error instanceof Error ? error.message : 'Chargement impossible.');
    });
    return () => {
      controller.abort();
    };
  }, [load]);
  async function execute(command: Command): Promise<boolean> {
    setPending(true);
    setMessage('');
    try {
      const result = resultSchema.parse(
        await adminRequest('/api/admin/charts', { method: 'POST', body: JSON.stringify(command) }),
      );
      setMessage(
        result.summary
          ? `${statusLabels[result.summary.status] ?? result.summary.status}. ${result.summary.details.join(' ')}`
          : command.action === 'editorial'
            ? command.layer === 'published'
              ? 'Commentaires publiés.'
              : 'Brouillon enregistré.'
            : 'Modification enregistrée.',
      );
      await load();
      return result.ok;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action impossible.');
      return false;
    } finally {
      setPending(false);
    }
  }
  function chooseTab(next: Tab) {
    setTab(next);
    setPage(0);
    setQuery('');
    setSearch('');
  }
  const canManage = permissions.publish && data?.configured === true && !pending;
  return (
    <div className="ac-console">
      <div className="admin-section-heading">
        <div>
          <span className="eyebrow">SANDBOX CHARTS · GitHub</span>
          <h2 id="admin-section-title">La fabrique des charts</h2>
          <p className="admin-copy">
            Des relevés quotidiens, une édition figée chaque lundi, votre lecture de la semaine.
          </p>
        </div>
        <a className="btn" href="/charts" target="_blank" rel="noreferrer">
          Voir les charts ↗
        </a>
      </div>
      <nav className="ac-tabs" aria-label="Administration des charts">
        {tabs.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={tab === item.id}
            onClick={() => {
              chooseTab(item.id);
            }}
          >
            {item.label}
            {item.id === 'candidates' && data ? <span>{data.counts['candidate'] ?? 0}</span> : null}
          </button>
        ))}
      </nav>
      {message ? (
        <p className="admin-message" role="status">
          {message}
        </p>
      ) : null}
      {!data ? (
        <p role="status">Chargement des collectes…</p>
      ) : (
        <>
          {data.message ? (
            <p className="admin-alert" role="status">
              {data.message}
            </p>
          ) : null}
          {tab === 'dashboard' ? (
            <>
              <div className="ac-stats">
                {[
                  ['Dépôts suivis', data.counts['tracked'] ?? 0],
                  ['Candidats', data.counts['candidate'] ?? 0],
                  ['Relevés aujourd’hui', data.snapshotsToday],
                  ['Éditions disponibles', data.editions.length],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <div className="ac-job-actions">
                <button
                  className="btn"
                  type="button"
                  disabled={!canManage}
                  onClick={() => void execute({ action: 'job', job: 'discover', dryRun: false })}
                >
                  Découvrir des dépôts
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={!canManage}
                  onClick={() => void execute({ action: 'job', job: 'collect', dryRun: false })}
                >
                  Collecter maintenant
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={!canManage}
                  onClick={() => void execute({ action: 'job', job: 'weekly', dryRun: true })}
                >
                  Simuler la semaine
                </button>
                <button
                  className="btn btn-solid"
                  type="button"
                  disabled={!canManage}
                  onClick={() => void execute({ action: 'job', job: 'weekly', dryRun: false })}
                >
                  Figer un brouillon
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={!canManage}
                  onClick={() =>
                    void execute({ action: 'job', job: 'external-collect', dryRun: false })
                  }
                >
                  Collecter Skills/Models
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={!canManage}
                  onClick={() =>
                    void execute({ action: 'job', job: 'external-weekly', dryRun: true })
                  }
                >
                  Simuler Skills/Models
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={!canManage}
                  onClick={() =>
                    void execute({ action: 'job', job: 'external-weekly', dryRun: false })
                  }
                >
                  Figer Skills/Models
                </button>
              </div>
              {pending ? (
                <p role="status">
                  Traitement en cours. Les opérations GitHub peuvent prendre quelques minutes.
                </p>
              ) : null}
              <p className="admin-help">
                La collecte ne recrée aucun relevé manquant. Une édition GitHub attend au moins{' '}
                {data.config.minimumCandidates} projets éligibles et un relevé à J−7. Rising attend
                aussi J−14. Skills/Models suivent leurs propres seuils de source et d’historique.
              </p>
              <h3>Dernières collectes</h3>
              <div className="ac-table-scroll">
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th>Opération</th>
                      <th>Début (UTC)</th>
                      <th>État</th>
                      <th>Réussis / traités</th>
                      <th>Erreurs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.jobs.map((job) => (
                      <tr key={job.id}>
                        <td>
                          {job.kind}
                          <details>
                            <summary>Détails</summary>
                            {job.details.length ? (
                              job.details.map((detail, index) => <p key={index}>{detail}</p>)
                            ) : (
                              <p>Aucune erreur enregistrée.</p>
                            )}
                          </details>
                        </td>
                        <td>{job.startedAt.replace('T', ' ').slice(0, 19)}</td>
                        <td>
                          <span className={`ac-state ac-state-${job.status}`}>
                            {statusLabels[job.status] ?? job.status}
                          </span>
                        </td>
                        <td>
                          {job.succeeded} / {job.processed}
                        </td>
                        <td>{job.failed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.jobs.length ? (
                <p className="ac-empty">Les premières collectes apparaîtront ici.</p>
              ) : null}
            </>
          ) : tab === 'repositories' || tab === 'candidates' ? (
            <>
              <form
                className="ac-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  setPage(0);
                  setQuery(search);
                }}
              >
                <label className="admin-field">
                  <span>Rechercher un dépôt</span>
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                    }}
                    placeholder="Nom, propriétaire ou dépôt…"
                  />
                </label>
                {tab === 'repositories' ? (
                  <label className="admin-field">
                    <span>Statut</span>
                    <select
                      value={status}
                      onChange={(event) => {
                        setStatus(event.target.value);
                        setPage(0);
                      }}
                    >
                      <option value="">Tous</option>
                      {trackingStatusSchema.options.map((item) => (
                        <option value={item} key={item}>
                          {statusLabels[item]}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <button className="btn" type="submit">
                  Rechercher
                </button>
              </form>
              <div className="ac-table-scroll">
                <table className="ac-table">
                  <thead>
                    <tr>
                      <th>Dépôt / catégorie</th>
                      <th>Stars</th>
                      <th>+7 jours</th>
                      <th>Croissance</th>
                      <th>Score</th>
                      <th>Suivi</th>
                      <th>Mise en avant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.repositories.map((repo) => (
                      <tr key={repo.id}>
                        <td>
                          <a
                            href={`https://github.com/${repo.fullName}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <strong>{repo.fullName}</strong> ↗
                          </a>
                          <span className="ac-repo-note">
                            {repo.language ?? 'Langage non renseigné'} ·{' '}
                            {repo.lastSync
                              ? `collecté le ${repo.lastSync.slice(0, 10)}`
                              : 'à collecter'}
                          </span>
                          <label>
                            <span className="sr-only">Catégorie de {repo.name}</span>
                            <select
                              value={repo.category}
                              disabled={!canManage}
                              onChange={(event) =>
                                void execute({
                                  action: 'repository',
                                  id: repo.id,
                                  category: chartCategorySchema.parse(event.target.value),
                                })
                              }
                            >
                              {chartCategorySchema.options.map((category) => (
                                <option key={category}>{category}</option>
                              ))}
                            </select>
                          </label>
                          {repo.insufficientHistory ? (
                            <span className="ac-repo-note">Historique insuffisant</span>
                          ) : null}
                          {repo.error ? <span className="admin-error">{repo.error}</span> : null}
                        </td>
                        <td>{metric(repo.stars)}</td>
                        <td>{metric(repo.stars7d)}</td>
                        <td>{repo.growth === null ? '—' : `${repo.growth.toFixed(1)} %`}</td>
                        <td>{repo.score?.toFixed(1) ?? '—'}</td>
                        <td>
                          <label>
                            <span className="sr-only">Statut de {repo.name}</span>
                            <select
                              value={repo.status}
                              disabled={!canManage}
                              onChange={(event) =>
                                void execute({
                                  action: 'repository',
                                  id: repo.id,
                                  status: trackingStatusSchema.parse(event.target.value),
                                })
                              }
                            >
                              {trackingStatusSchema.options.map((item) => (
                                <option value={item} key={item}>
                                  {statusLabels[item]}
                                </option>
                              ))}
                            </select>
                          </label>
                          {repo.manual ? (
                            <button
                              className="ac-link"
                              type="button"
                              disabled={!canManage}
                              onClick={() =>
                                void execute({ action: 'repository', id: repo.id, status: null })
                              }
                            >
                              Revenir à l’automatique
                            </button>
                          ) : null}
                        </td>
                        <td>
                          <label>
                            <input
                              type="checkbox"
                              checked={repo.featured}
                              disabled={!canManage}
                              onChange={(event) =>
                                void execute({
                                  action: 'repository',
                                  id: repo.id,
                                  featured: event.target.checked,
                                })
                              }
                            />
                            <span className="sr-only">Mettre {repo.name} en avant</span>
                          </label>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!data.repositories.length ? (
                <p className="ac-empty">
                  Aucun dépôt pour cette recherche. La découverte alimente le catalogue.
                </p>
              ) : null}
              <div className="ac-pagination">
                <span>
                  {data.total} dépôts · page {page + 1}
                </span>
                <button
                  className="btn"
                  type="button"
                  disabled={page === 0 || pending}
                  onClick={() => {
                    setPage(page - 1);
                  }}
                >
                  Précédente
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={(page + 1) * 50 >= data.total || pending}
                  onClick={() => {
                    setPage(page + 1);
                  }}
                >
                  Suivante
                </button>
              </div>
            </>
          ) : tab === 'weekly' ? (
            <>
              <label className="admin-field ac-edition-select">
                <span>Édition</span>
                <select
                  value={edition ? edition : (data.edition?.id ?? '')}
                  onChange={(event) => {
                    setEdition(event.target.value);
                  }}
                >
                  {data.editions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.chart === 'github' ? 'GitHub' : 'Rising'} · {item.week} ·{' '}
                      {item.published ? 'publiée' : 'brouillon'} · {item.version}
                    </option>
                  ))}
                </select>
              </label>
              {data.edition ? (
                <AdminChartsEdition
                  key={`${data.edition.id}:${data.edition.etag}`}
                  edition={data.edition}
                  repositories={data.repositories}
                  author={author}
                  pending={pending}
                  permissions={permissions}
                  onSave={execute}
                />
              ) : (
                <div className="ac-empty">
                  <h3>Aucune édition figée</h3>
                  <p>
                    Collectez l’historique, puis utilisez « Figer un brouillon » dans l’onglet
                    Collectes.
                  </p>
                </div>
              )}
            </>
          ) : (
            <ChartsConfig
              key={JSON.stringify(data.config)}
              config={data.config}
              disabled={!canManage}
              onSave={(config) => execute({ action: 'config', config })}
            />
          )}
        </>
      )}
    </div>
  );
}

function ChartsConfig({
  config,
  disabled,
  onSave,
}: {
  config: GithubChartConfig;
  disabled: boolean;
  onSave: (config: GithubChartConfig) => Promise<boolean>;
}) {
  const [value, setValue] = useState(config);
  const [error, setError] = useState('');
  return (
    <form
      className="ac-config"
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = chartsAdminWriteSchema.safeParse({ action: 'config', config: value });
        if (!parsed.success || parsed.data.action !== 'config') {
          setError(
            'Vérifiez les seuils et les pondérations. Les poids de chaque score doivent totaliser 100 %.',
          );
          return;
        }
        setError('');
        void onSave(parsed.data.config);
      }}
    >
      <p className="admin-help">
        Les changements s’appliquent aux éditions suivantes. Chaque édition conserve sa version, ses
        poids et ses composantes.
      </p>
      <div className="admin-form-grid">
        {(['version', 'risingVersion'] as const).map((key) => (
          <label className="admin-field" key={key}>
            <span>{key === 'version' ? 'Version Momentum' : 'Version Rising'}</span>
            <input
              value={value[key]}
              disabled={disabled}
              onChange={(event) => {
                setValue({ ...value, [key]: event.target.value });
              }}
            />
          </label>
        ))}
        {(
          [
            { key: 'qualificationStars', label: 'Stars pour la qualification' },
            { key: 'eligibilityStars', label: 'Stars pour l’éligibilité' },
            { key: 'eligibilityVelocity', label: 'Ou stars gagnées en 7 jours' },
            { key: 'growthFloor', label: 'Plancher de croissance (stars)' },
            { key: 'maximumRisingStars', label: 'Maximum de stars pour Rising' },
            { key: 'toleranceDays', label: 'Tolérance du relevé (jours)' },
          ] as const
        ).map(({ key, label }) => (
          <label className="admin-field" key={key}>
            <span>{label}</span>
            <input
              type="number"
              min="0"
              value={value[key]}
              disabled={disabled}
              onChange={(event) => {
                setValue({ ...value, [key]: Number(event.target.value) });
              }}
            />
          </label>
        ))}
      </div>
      {(['momentum', 'rising'] as const).map((score) => (
        <fieldset key={score}>
          <legend>
            {score === 'momentum' ? 'Momentum Score' : 'Rising Score'} · pondérations (%)
          </legend>
          <div className="admin-form-grid">
            {Object.entries(value[score]).map(([key, weight]) => (
              <label className="admin-field" key={key}>
                <span>{key}</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round(weight * 100)}
                  disabled={disabled}
                  onChange={(event) => {
                    setValue({
                      ...value,
                      [score]: { ...value[score], [key]: Number(event.target.value) / 100 },
                    });
                  }}
                />
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <label className="admin-field">
        <span>Dépôts exclus (un propriétaire/dépôt par ligne)</span>
        <textarea
          rows={4}
          value={value.blacklist.join('\n')}
          disabled={disabled}
          onChange={(event) => {
            setValue({
              ...value,
              blacklist: event.target.value
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean),
            });
          }}
        />
      </label>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-solid" disabled={disabled}>
        Enregistrer la méthode
      </button>
    </form>
  );
}
