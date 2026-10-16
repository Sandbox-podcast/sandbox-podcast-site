import { LocalizedElement } from './localization';
import styles from './discovery-home.module.css';

/** Les objets sont peints dans le décor ; seuls leurs liens sont superposés. */
export function StudioEasterEggs() {
  return (
    <div className={styles['studioEasterEggs']}>
      <LocalizedElement
        as="a"
        href="/charts"
        className={`${styles['studioObject']} ${styles['studioTelevision']}`}
        aria-label="Classements"
        data-analytics-event="discovery_open"
        data-analytics-destination="charts"
        data-analytics-placement="home"
      />
      <LocalizedElement
        as="a"
        href="/time-machine"
        className={`${styles['studioObject']} ${styles['studioTimeMachine']}`}
        aria-label="Time Machine"
        data-analytics-event="discovery_open"
        data-analytics-destination="time-machine"
        data-analytics-placement="home"
      />
    </div>
  );
}
