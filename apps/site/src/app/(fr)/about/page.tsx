import Image from 'next/image';
import { Text, LocalizedElement } from '@/components/localization';
import { siteConfig } from '@/config/site';
import { preparePublicEditorialContent } from '@/lib/admin-persistence';
import { publicHosts } from '@/lib/repository';
import { JsonLd } from '@/components/json-ld';
import { absoluteUrl, breadcrumbLd, pageMetadata, publisherLd } from '@/lib/seo';
import { localizedHref } from '@/i18n/routing';
import { siteDictionary } from '@/i18n/dictionaries';
import { translateText } from '@/i18n/translation';
import type { Host } from '@/domain/schema';
export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({
  title: 'Qui anime SANDBOX ? Deux développeurs et un Product Manager',
  description:
    "Lou, Nicolas et Loïc animent SANDBOX. Deux développeurs expérimentés et un Product Manager explorent les effets de l'IA sur les produits et les équipes tech.",
  path: '/about',
  noindex: false,
});
const networks = [
  { key: 'github', label: 'GitHub' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'x', label: 'X' },
] as const;
function profileLinks(host: Host) {
  if (host.website) {
    return [{ href: host.website, label: new URL(host.website).hostname }];
  }
  return networks.flatMap(({ key, label }) => {
    const href = host.socials[key];
    return href ? [{ href, label }] : [];
  });
}

export default async function AboutPage({ locale = 'fr-FR' }: { locale?: string } = {}) {
  await preparePublicEditorialContent();
  const hosts = publicHosts();
  const dictionary = await siteDictionary(locale);
  const text = (value: string) => translateText(value, dictionary, locale);
  return (
    <div className="wrap about-social-page">
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'AboutPage',
            url: absoluteUrl(localizedHref('/about', locale)),
            name: text(siteConfig.aboutTitle),
            inLanguage: locale,
            mainEntity: {
              ...publisherLd,
              member: hosts.map((host) => ({
                '@type': 'Person',
                '@id': absoluteUrl(`/about#${host.slug}`),
                name: host.name,
                description: text(host.bio),
                sameAs: profileLinks(host).map(({ href }) => href),
              })),
            },
          },
          breadcrumbLd([
            { name: text('Accueil'), path: localizedHref('/', locale) },
            { name: text('À propos'), path: localizedHref('/about', locale) },
          ]),
        ]}
      />
      <header className="about-social-heading">
        <p className="label text-ink-3">
          <Text>{siteConfig.aboutEyebrow}</Text>
        </p>
        <h1 className="display">
          <Text>{siteConfig.aboutTitle}</Text>
        </h1>
        <p className="library-description whitespace-pre-line">
          <Text>{siteConfig.aboutIntro}</Text>
        </p>
      </header>
      <ul className="about-social-grid">
        <Text>
          {hosts.map((host, index) => {
            const links = profileLinks(host);
            return (
              <li className="about-social-person" id={host.slug} key={host.slug}>
                <div className="about-social-card-top">
                  <span className="label">
                    <Text>{'Sandbox / '}</Text>
                    <Text>{String(index + 1).padStart(2, '0')}</Text>
                  </span>
                  {!host.photo && (
                    <span className="about-social-monogram" aria-hidden="true">
                      <Text>{host.name.slice(0, 1)}</Text>
                    </span>
                  )}
                </div>
                {host.photo && (
                  <div className="about-social-portrait" aria-hidden="true">
                    <Image
                      className="about-social-photo"
                      src={host.photo}
                      alt=""
                      fill
                      loading="eager"
                      quality={90}
                      sizes="(max-width: 48rem) 88vw, 26rem"
                    />
                  </div>
                )}
                <div className="about-social-card-body">
                  <h2>
                    <Text>{host.name}</Text>
                  </h2>
                  <p className="about-social-role">
                    <Text>{host.role}</Text>
                  </p>
                  <p className="about-social-bio whitespace-pre-line">
                    <Text>{host.bio}</Text>
                  </p>
                  {host.aka && (
                    <p className="about-social-aka label">
                      <Text>{'Aka '}</Text>
                      <Text>{host.aka}</Text>
                    </p>
                  )}
                  <span className="about-social-card-rule" aria-hidden="true" />
                </div>
                <Text>
                  {links.length > 0 ? (
                    <LocalizedElement as="nav" aria-label={`Profils de ${host.name}`}>
                      <Text>
                        {links.map(({ href, label }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer" key={label}>
                            <span>
                              <Text>{label}</Text>
                            </span>{' '}
                            <span aria-hidden="true">
                              <Text>{'\u2197'}</Text>
                            </span>
                            <span className="sr-only">
                              <Text>{'(nouvel onglet)'}</Text>
                            </span>
                          </a>
                        ))}
                      </Text>
                    </LocalizedElement>
                  ) : (
                    <p className="about-social-pending label">
                      <Text>{'Profils \u00E0 venir'}</Text>
                    </p>
                  )}
                </Text>
              </li>
            );
          })}
        </Text>
      </ul>
    </div>
  );
}
