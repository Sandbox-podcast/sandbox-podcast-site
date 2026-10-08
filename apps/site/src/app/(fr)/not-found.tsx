import { Text } from '@/components/localization';
import { LocalizedLink as Link } from '@/components/localization';
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
      <p className="eyebrow">
        <Text>{'Erreur 404'}</Text>
      </p>
      <h1>
        <Text>{'Cette page est introuvable.'}</Text>
      </h1>
      <p>
        <Text>
          {
            'Le lien a peut-\u00EAtre chang\u00E9. Retrouvez un \u00E9pisode, explorez les classements ou lancez une recherche.'
          }
        </Text>
      </p>
      <div className="page-actions">
        <Link href="/episodes" className="btn btn-solid">
          <Text>{'Les podcasts'}</Text>
        </Link>
        <Link href="/charts" className="btn">
          <Text>{'Les classements'}</Text>
        </Link>
        <Link href="/search" className="btn">
          <Text>{'Rechercher'}</Text>
        </Link>
      </div>
    </div>
  );
}
