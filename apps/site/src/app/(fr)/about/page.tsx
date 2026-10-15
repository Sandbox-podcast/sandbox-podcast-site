import Image from 'next/image';
import { Text, LocalizedElement } from '@/components/localization';
import { siteConfig } from '@/config/site';
import { preparePublishedEditorialContent } from '@/lib/admin-persistence';
import { publicHosts } from '@/lib/repository';
import { pageMetadata } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export const metadata = pageMetadata({
  title: 'Retrouvez l’équipe Sandbox',
  description: 'Les profils GitHub, LinkedIn et X des animateurs Sandbox.',
  path: '/about',
  noindex: false,
});
const networks = [
  { key: 'github', label: 'GitHub' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'x', label: 'X' },
] as const;
export default async function AboutPage() {
  await preparePublishedEditorialContent();
  const hosts = publicHosts();
  return (
    <div className="wrap about-social-page">
      <header className="about-social-heading">
        <p className="label text-ink-3">
          <Text>{siteConfig.aboutEyebrow}</Text>
        </p>
        <h1 className="display">
          <Text>{siteConfig.aboutTitle}</Text>
        </h1>
        <p className="library-description">
          <Text>{siteConfig.aboutIntro}</Text>
        </p>
      </header>
      <ul className="about-social-grid">
        <Text>
          {hosts.map((host, index) => {
            const links = networks.flatMap(({ key, label }) => {
              const href = host.socials[key];
              return href ? [{ href, label }] : [];
            });
            return (
              <li className="about-social-person" key={host.slug}>
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
