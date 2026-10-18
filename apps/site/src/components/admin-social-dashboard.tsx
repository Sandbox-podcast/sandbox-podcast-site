'use client';

import { useState, type CSSProperties } from 'react';
import { socialMetricsResponseSchema, type SocialSource } from '@/domain/social-metrics';

const platforms = [
  {
    name: 'YouTube',
    color: '#ff4b45',
    audience: '912 vues',
    detail: '2 Shorts publics relevés',
    status: 'Partiel',
  },
  {
    name: 'Instagram',
    color: '#c675d9',
    audience: '0 abonné',
    detail: '4 Reels · vues non relevées',
    status: 'Partiel',
  },
  {
    name: 'TikTok',
    color: '#55d6d0',
    audience: '0 abonné',
    detail: '0 publication au relevé',
    status: 'Partiel',
  },
  {
    name: 'X',
    color: '#e4eaf0',
    audience: 'Non relevé',
    detail: '@SandboxTalkShow · compte actif',
    status: 'À mesurer',
  },
];

export function AdminSocialDashboard() {
  const [sources, setSources] = useState<SocialSource[] | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');

  async function refresh(): Promise<void> {
    setRefreshing(true);
    setRefreshError('');
    try {
      const response = await fetch('/api/admin/social-metrics', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const value: unknown = await response.json();
      if (!response.ok) {
        const message =
          typeof value === 'object' &&
          value !== null &&
          'error' in value &&
          typeof value.error === 'string'
            ? value.error
            : 'Actualisation impossible.';
        throw new Error(message);
      }
      const parsed = socialMetricsResponseSchema.parse(value);
      setSources(parsed.sources);
      setRefreshedAt(parsed.refreshedAt);
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : 'Actualisation impossible.');
    } finally {
      setRefreshing(false);
    }
  }

  const platformState: Record<string, string> = {
    connected: 'À jour',
    partial: 'Partiel',
    not_configured: 'À configurer',
    unavailable: 'Non disponible gratuitement',
    error: 'Erreur',
  };
  return (
    <div className="social-dashboard">
      <header className="social-dash-head">
        <div>
          <span className="eyebrow">Audience · réseaux sociaux</span>
          <h2 id="admin-section-title">Social Network Analysis</h2>
          <p>Suivi des comptes Sandbox et des mesures disponibles par réseau.</p>
        </div>
        <div className="social-dash-actions">
          <span className="social-snapshot-date">
            {refreshedAt
              ? `Actualisé · ${new Date(refreshedAt).toLocaleString('fr-FR')}`
              : 'Relevé manuel · 17 oct. 2026'}
          </span>
          <button
            className="btn btn-solid"
            type="button"
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            {refreshing ? 'Actualisation…' : '↻ Actualiser'}
          </button>
        </div>
      </header>

      <div className="social-demo-banner">
        <span className="social-demo-dot" />{' '}
        {refreshedAt
          ? 'Résultat de la tentative de collecte officielle.'
          : 'Chiffres manuels enregistrés le 17 octobre 2026.'}{' '}
        <span>·</span>{' '}
        {sources
          ? 'Les réseaux non configurés sont indiqués ci-dessous.'
          : 'Actualiser teste les connexions configurées ; cela ne crée pas les accès manquants.'}
      </div>
      {refreshError ? (
        <p className="social-refresh-error" role="alert">
          {refreshError}
        </p>
      ) : null}

      <section className="social-kpis" aria-label="Indicateurs mesurés">
        <article className="social-kpi">
          <span>{sources ? 'Vues chaîne YouTube' : 'Vues relevées YouTube'}</span>
          <strong>{sources ? metricText(sources, 'youtube', 'views') : '912'}</strong>
          <small>
            {sources ? 'Total public de la chaîne' : '2 Shorts · relevé des 15 et 16 oct.'}
          </small>
        </article>
        <article className="social-kpi">
          <span>Abonnés Instagram</span>
          <strong>{sources ? metricText(sources, 'instagram', 'followers') : '0'}</strong>
          <small>{sources ? stateText(sources, 'instagram') : 'Compte @sandbox.talkshow'}</small>
        </article>
        <article className="social-kpi">
          <span>Vues TikTok récentes</span>
          <strong>{sources ? metricText(sources, 'tiktok', 'views') : '—'}</strong>
          <small>{sources ? stateText(sources, 'tiktok') : 'Aucune collecte live effectuée'}</small>
        </article>
        <article className="social-kpi">
          <span>Sources gratuites disponibles</span>
          <strong>
            {sources
              ? `${sources.filter((source) => source.state === 'connected').length}/3`
              : '0/3'}
          </strong>
          <small>{sources ? 'X exclu pour éviter les frais API' : 'Appuie sur Actualiser'}</small>
        </article>
      </section>

      <div className="social-source-note">
        <strong>Lecture des chiffres</strong>
        <span>
          {sources
            ? 'Chaque chiffre correspond à la métrique et à la fenêtre indiquées par sa plateforme ; les vues ne sont pas additionnées entre plateformes.'
            : 'Les 912 vues additionnent uniquement les deux compteurs Shorts consignés dans le relevé. Ce chiffre ne représente pas les vues totales de la chaîne. Les vues Instagram, TikTok et X n’étaient pas disponibles dans les sources consultées.'}
        </span>
      </div>

      <div className="social-bottom-grid">
        <section className="social-panel">
          <div className="social-panel-heading">
            <div>
              <h3>État par réseau</h3>
              <p>Valeurs réellement observées</p>
            </div>
          </div>
          <div className="social-platform-list">
            {platforms.map((platform) => {
              const live = sources?.find(
                (source) => source.platform === platform.name.toLowerCase(),
              );
              return (
                <article className="social-platform" key={platform.name}>
                  <div
                    className="social-platform-mark"
                    style={{ '--platform-color': platform.color } as CSSProperties}
                  >
                    {platform.name === 'YouTube'
                      ? '▶'
                      : platform.name === 'Instagram'
                        ? '◎'
                        : platform.name === 'TikTok'
                          ? '♪'
                          : '𝕏'}
                  </div>
                  <div className="social-platform-main">
                    <div className="social-platform-top">
                      <strong>{platform.name}</strong>
                      <span>{live ? platformState[live.state] : platform.status}</span>
                    </div>
                    <div className="social-platform-detail">
                      {live
                        ? `${live.message}${live.interactions === null ? '' : ` · ${live.interactions.toLocaleString('fr-FR')} interactions`}${live.followers === null ? '' : ` · ${live.followers.toLocaleString('fr-FR')} abonnés`}${live.publications === null ? '' : ` · ${live.publications.toLocaleString('fr-FR')} publications`}`
                        : platform.detail}
                    </div>
                  </div>
                  <div className="social-platform-total">
                    <strong>
                      {live
                        ? `${metricText(sources ?? [], live.platform, 'views')} vues`
                        : platform.audience}
                    </strong>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <section className="social-panel">
          <div className="social-panel-heading">
            <div>
              <h3>{refreshedAt ? 'Résultat de collecte' : 'Dernier relevé YouTube'}</h3>
              <p>
                {refreshedAt
                  ? 'Données reçues des APIs officielles'
                  : 'Compteurs vus dans YouTube Studio'}
              </p>
            </div>
          </div>
          {sources ? (
            sources.map((source) => (
              <div className="social-observed-video" key={source.platform}>
                <span className="social-video-play">{source.platform === 'x' ? '𝕏' : '↻'}</span>
                <div>
                  <strong>
                    {source.platform[0]?.toUpperCase()}
                    {source.platform.slice(1)}
                  </strong>
                  <small>{source.message}</small>
                </div>
                <b>
                  {source.views === null ? '—' : `${source.views.toLocaleString('fr-FR')} vues`}
                </b>
              </div>
            ))
          ) : (
            <>
              <div className="social-observed-video">
                <span className="social-video-play">▶</span>
                <div>
                  <strong>Short public · 15 oct.</strong>
                  <small>Sandbox TalkShow</small>
                </div>
                <b>45 vues</b>
              </div>
              <div className="social-observed-video">
                <span className="social-video-play">▶</span>
                <div>
                  <strong>Short public · 16 oct.</strong>
                  <small>Sandbox TalkShow</small>
                </div>
                <b>867 vues</b>
              </div>
              <div className="social-connect-foot">
                Les deux autres Shorts étaient programmés lors du relevé. Leurs compteurs ne sont
                pas inclus.
              </div>
            </>
          )}
        </section>
      </div>

      <section className="social-panel social-integrations">
        <div className="social-panel-heading">
          <div>
            <h3>Collecte automatique</h3>
            <p>État de connexion des sources officielles.</p>
          </div>
        </div>
        <div className="social-integration-grid">
          <div>
            <strong>YouTube Data API</strong>
            <span>Créer une clé API YouTube gratuite, puis la saisir sur le serveur</span>
            <em>{sources ? stateText(sources, 'youtube') : 'Prêt à vérifier'}</em>
          </div>
          <div>
            <strong>Meta / Instagram</strong>
            <span>Compte pro Meta + jeton autorisé (à connecter une fois)</span>
            <em>{sources ? stateText(sources, 'instagram') : 'Prêt à vérifier'}</em>
          </div>
          <div>
            <strong>TikTok</strong>
            <span>Application développeur approuvée + autorisation TikTok</span>
            <em>{sources ? stateText(sources, 'tiktok') : 'Prêt à vérifier'}</em>
          </div>
          <div>
            <strong>X</strong>
            <span>L’API officielle facture chaque lecture ; aucun appel payant n’est effectué</span>
            <em>Non disponible gratuitement</em>
          </div>
        </div>
      </section>
    </div>
  );
}

function metricText(
  sources: SocialSource[],
  platform: SocialSource['platform'],
  key: 'views' | 'followers',
): string {
  const value = sources.find((source) => source.platform === platform)?.[key];
  return value === null || value === undefined ? '—' : value.toLocaleString('fr-FR');
}

function stateText(sources: SocialSource[], platform: SocialSource['platform']): string {
  const source = sources.find((entry) => entry.platform === platform);
  return source ? `${platformStateLabel[source.state]} · ${source.message}` : 'Aucune donnée';
}

const platformStateLabel: Record<SocialSource['state'], string> = {
  connected: 'À jour',
  partial: 'Partiel',
  not_configured: 'À configurer',
  unavailable: 'Non disponible gratuitement',
  error: 'Erreur',
};
