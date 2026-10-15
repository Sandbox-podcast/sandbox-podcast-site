import { readPublicAwards, type PublicAward } from '@/lib/awards-store';
import { AwardCard } from './award-card';
import { Text, LocalizedLink as Link } from './localization';
import styles from './badges.module.css';

export async function EntityAwards({ entityId }: { entityId: string }) {
  let awards: PublicAward[] = [];
  let unavailable = false;
  try {
    awards = await readPublicAwards({ entityId, limit: 21 });
  } catch (error) {
    unavailable = true;
    console.error(
      'Sandbox entity awards unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
  }
  return (
    <section id="badges" className={styles['section']} aria-labelledby="entity-awards-title">
      <div className={styles['heading']}>
        <h2 id="entity-awards-title">
          <Text>{'Les distinctions du lauréat'}</Text>
        </h2>
        <Link href="/charts/awards">
          <Text>{'Critères et installation'}</Text>
        </Link>
      </div>
      {awards.slice(0, 20).map((award) => (
        <AwardCard award={award} generator key={award.id} />
      ))}
      {!awards.length ? (
        <p role="status">
          <Text>
            {unavailable
              ? "L'historique des Awards est temporairement indisponible."
              : "Aucune récompense n'a encore été attribuée à cette entité."}
          </Text>
        </p>
      ) : null}
      {awards.length > 20 ? (
        <Link href="/charts/awards#award-history">
          <Text>{'Toutes les récompenses'}</Text>
        </Link>
      ) : null}
    </section>
  );
}
