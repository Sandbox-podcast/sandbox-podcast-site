import { Text } from '@/components/localization';
import { publicGithubBursts } from '@/lib/github-bursts-store';
import { formatNumber } from '@/domain/format';

export async function GithubBurstPanel() {
  let result: Awaited<ReturnType<typeof publicGithubBursts>>;
  try {
    result = await publicGithubBursts();
  } catch (error) {
    console.error(
      'GitHub burst panel unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
    return (
      <section className="wrap py-10">
        <h2>
          <Text>{"Poussées d'étoiles"}</Text>
        </h2>
        <p>
          <Text>{'Les relevés récents sont momentanément indisponibles.'}</Text>
        </p>
      </section>
    );
  }
  return (
    <section className="wrap py-10" aria-labelledby="github-bursts-title">
      <p className="sc-label">
        <Text>{'DÉTECTION INTRAJOURNALIÈRE'}</Text>
      </p>
      <h2 id="github-bursts-title">
        <Text>{"Poussées d'étoiles"}</Text>
      </h2>
      <p>
        <Text>
          {
            'Les projets surveillés qui gagnent rapidement des étoiles, triés par gain horaire observé. Ce signal alimente le suivi des candidats ; le classement Rising conserve ses critères et son historique.'
          }
        </Text>
      </p>
      {result.status === 'disabled' ? (
        <p>
          <Text>{'La collecte horaire attend sa mise en service.'}</Text>
        </p>
      ) : result.entries.length === 0 ? (
        <p>
          <Text>
            {
              "Aucune poussée mesurée dans les dernières 24 heures. Deux relevés espacés d'au moins une fenêtre sont nécessaires."
            }
          </Text>
        </p>
      ) : (
        <ol className="grid gap-4 py-6">
          {result.entries.map((entry) => (
            <li key={entry.slug} className="border-t border-hair pt-4">
              <a href={entry.githubUrl} target="_blank" rel="noopener noreferrer">
                <Text>{entry.fullName}</Text>
              </a>
              <p>
                <Text>{`+${formatNumber(entry.gain)} étoiles en ${formatNumber(entry.elapsedHours, 1)} h, soit ${formatNumber(entry.starsPerHour, 1)} par heure.`}</Text>
              </p>
              <p>
                <Text>{`Relevés du ${entry.baselineAt} au ${entry.observedAt}.`}</Text>
              </p>
            </li>
          ))}
        </ol>
      )}
      <p>
        <Text>
          {
            "Le pool surveillé est limité par les quotas. Un pic ne prouve ni la qualité du code ni l'absence de manipulation. Une avance sur Trending doit se mesurer à partir de ses présences observées."
          }
        </Text>
      </p>
    </section>
  );
}
