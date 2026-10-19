/** Requête de diagnostic unique, sans écriture et incluant les exclusions manuelles. */
export const modelIdentityAuditQuery = `
WITH duplicates AS (
  SELECT s.provider, s.external_id
  FROM chart_entity_sources s
  JOIN chart_entities e ON e.id = s.entity_id
  WHERE e.type = 'model'
  GROUP BY s.provider, s.external_id
  HAVING count(DISTINCT e.id) > 1
)
SELECT d.provider, d.external_id AS "externalId",
  jsonb_agg(jsonb_build_object(
    'id', e.id, 'slug', e.slug, 'name', e.name,
    'organization', e.organization, 'active', e.active, 'createdAt', e.created_at,
    'sources', (SELECT jsonb_agg(jsonb_build_object(
      'provider', refs.provider, 'externalId', refs.external_id, 'url', refs.source_url
    ) ORDER BY refs.provider, refs.external_id)
      FROM chart_entity_sources refs WHERE refs.entity_id = e.id),
    'snapshots', (SELECT count(*) FROM chart_source_snapshots obs
      JOIN chart_entity_sources refs ON refs.id = obs.entity_source_id WHERE refs.entity_id = e.id),
    'firstObservedOn', (SELECT min(obs.observed_on) FROM chart_source_snapshots obs
      JOIN chart_entity_sources refs ON refs.id = obs.entity_source_id WHERE refs.entity_id = e.id),
    'lastObservedOn', (SELECT max(obs.observed_on) FROM chart_source_snapshots obs
      JOIN chart_entity_sources refs ON refs.id = obs.entity_source_id WHERE refs.entity_id = e.id),
    'publishedRanks', (SELECT count(*) FROM weekly_rankings r
      JOIN weekly_chart_editions editions ON editions.id = r.edition_id
      WHERE r.entity_id = e.id AND editions.published_at IS NOT NULL)
  ) ORDER BY e.slug) AS identities
FROM duplicates d
JOIN chart_entity_sources s ON s.provider = d.provider AND s.external_id = d.external_id
JOIN chart_entities e ON e.id = s.entity_id AND e.type = 'model'
GROUP BY d.provider, d.external_id
ORDER BY d.provider, d.external_id
`;
