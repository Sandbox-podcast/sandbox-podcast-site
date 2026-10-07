import { siteConfig } from '@/config/site';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Retrouvez l’équipe Sandbox',
  description: 'Les profils GitHub, LinkedIn et X de Lou, Nicolas et Loïc, l’équipe Sandbox.',
  path: '/about',
});

const networks = [
  { key: 'github', label: 'GitHub' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'x', label: 'X' },
] as const;

export default function AboutPage() {
  return (
    <div className="wrap about-social-page">
      <header className="about-social-heading">
        <p className="label text-ink-3">L’équipe</p>
        <h1 className="display">Retrouvez-nous.</h1>
      </header>
      <ul className="about-social-grid">
        {siteConfig.team.map((member, index) => {
          const links = networks.flatMap(({ key, label }) => {
            const href = member.socials[key];
            return href ? [{ href, label }] : [];
          });
          return (
            <li className="about-social-person" key={member.name}>
              <div className="about-social-card-top">
                <span className="label">Sandbox / {String(index + 1).padStart(2, '0')}</span>
                <span className="about-social-monogram" aria-hidden="true">
                  {member.name.slice(0, 1)}
                </span>
              </div>
              <div className="about-social-card-body">
                <h2>{member.name}</h2>
                <span className="about-social-card-rule" aria-hidden="true" />
              </div>
              {links.length > 0 ? (
                <nav aria-label={`Profils de ${member.name}`}>
                  {links.map(({ href, label }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" key={label}>
                      <span>{label}</span> <span aria-hidden="true">↗</span>
                    </a>
                  ))}
                </nav>
              ) : (
                <p className="about-social-pending label">Profils à venir</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
