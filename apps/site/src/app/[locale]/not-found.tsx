import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page introuvable / Page not found · Sandbox',
  description:
    'Cette page est introuvable. This page could not be found in a reviewed and published language.',
  robots: { index: false, follow: true },
};

export default function LocalizedNotFound() {
  return (
    <div className="wrap not-found-page" lang="fr">
      <p className="eyebrow">404</p>
      <h1>
        Cette page est introuvable. <span lang="en">This page could not be found.</span>
      </h1>
      <p>Aucune traduction relue ni page publiée ne correspond encore à cette adresse.</p>
      <p lang="en">There is no reviewed translation or published page at this address yet.</p>
      <div className="page-actions">
        <Link href="/charts" className="btn btn-solid">
          Classements IA
        </Link>
        <Link href="/en/charts" className="btn" lang="en">
          AI rankings
        </Link>
        <Link href="/" className="btn">
          Site français
        </Link>
      </div>
    </div>
  );
}
