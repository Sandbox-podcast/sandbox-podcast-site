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
    <div className="wrap not-found-page">
      <p className="eyebrow">Erreur 404</p>
      <h1>Cette page est introuvable.</h1>
      <p>
        Le lien a peut-être changé. Retrouvez un épisode, explorez les classements ou lancez une
        recherche.
      </p>
      <div className="page-actions">
        <Link href="/episodes" className="btn btn-solid">
          Les podcasts
        </Link>
        <Link href="/charts" className="btn">
          Les classements
        </Link>
        <Link href="/search" className="btn">
          Rechercher
        </Link>
      </div>
    </div>
  );
}
