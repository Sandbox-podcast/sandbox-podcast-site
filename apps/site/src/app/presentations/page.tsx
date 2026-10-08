import { listSlideDecks, slidesPublicRoot } from '@/domain/slide-decks';

export const dynamic = 'force-static';

export default function PresentationsPage() {
  const decks = listSlideDecks(slidesPublicRoot(process.cwd()));

  return (
    <main
      style={{
        boxSizing: 'border-box',
        maxWidth: '42rem',
        margin: '0 auto',
        padding: '3rem 1.25rem 4rem',
      }}
    >
      <p
        style={{
          margin: '0 0 0.75rem',
          color: '#3cd6fc',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        Sandbox
      </p>
      <h1 style={{ margin: '0 0 0.75rem', fontSize: '2rem', lineHeight: 1.15 }}>Présentations</h1>
      <p style={{ margin: '0 0 2rem', color: '#9baebb', lineHeight: 1.5 }}>
        Choisissez un support pour l’afficher en plein écran. Les flèches du clavier permettent de
        naviguer dans chaque deck.
      </p>
      {decks.length === 0 ? (
        <p style={{ color: '#9baebb' }}>Aucune présentation n’est disponible pour le moment.</p>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {decks.map((deck) => (
            <li
              key={deck.slug}
              style={{
                borderTop: '1px solid #294457',
              }}
            >
              <a
                href={deck.href}
                style={{
                  display: 'block',
                  padding: '1rem 0',
                  color: '#f4f7fa',
                  textDecoration: 'none',
                }}
              >
                <span style={{ display: 'block', fontWeight: 700 }}>{deck.title}</span>
                <span style={{ display: 'block', marginTop: '0.25rem', color: '#9baebb' }}>
                  {deck.slug}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
