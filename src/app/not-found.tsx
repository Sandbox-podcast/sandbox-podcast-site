import Link from 'next/link';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Page introuvable',
  description: 'Cette page n’existe pas.',
  path: '/404',
  noindex: true,
});

export default function NotFound() {
  return (
    <div className="wrap py-20">
      <p className="label mb-3 text-ink-2">Erreur 404</p>
      <h1 className="display" style={{ fontSize: 'clamp(4rem, 16vw, 12rem)' }}>
        <span className="rank-num" data-outline="true" style={{ display: 'inline' }}>
          OUT
        </span>
      </h1>
      <p className="mt-6 max-w-2xl font-serif text-2xl leading-snug">
        Cette page est sortie du classement. Ou elle n’y est jamais entrée : on ne vous fera pas
        l’affront de vous le dire.
      </p>
      <p className="mt-8 flex flex-wrap gap-2">
        <Link href="/" className="btn btn-solid">
          Accueil
        </Link>
        <Link href="/charts" className="btn">
          Les charts
        </Link>
        <Link href="/episodes" className="btn">
          Les épisodes
        </Link>
      </p>
    </div>
  );
}
