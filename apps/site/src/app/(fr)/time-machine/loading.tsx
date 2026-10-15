import styles from '@/components/time-machine.module.css';

export default function Loading() {
  return (
    <div className={styles['loading']} role="status">
      <span className={styles['statusDot']} />
      <p>On remonte le temps...</p>
      <div />
      <span className="sr-only">Chargement de la chronologie mondiale de l'IA.</span>
    </div>
  );
}
