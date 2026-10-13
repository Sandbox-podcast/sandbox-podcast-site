'use client';

import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LocalizedLink, useLocalization } from '@/components/localization';
import { safeHref } from '@/domain/markup';

/** Même rendu dans le formulaire et sur la fiche publique, sans exécuter de HTML éditorial. */
export function EpisodeDescription({ markdown }: { markdown: string }) {
  const { t } = useLocalization();

  return (
    <div className="episode-description">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          a({ href, children }) {
            const safe = safeHref(href ?? '');
            if (!safe) return <>{children}</>;
            return safe.external ? (
              <a href={safe.href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ) : (
              <LocalizedLink href={safe.href}>{children}</LocalizedLink>
            );
          },
          img({ alt }) {
            return <>{alt}</>;
          },
          h1({ children }) {
            return <h3>{children}</h3>;
          },
          h2({ children }) {
            return <h3>{children}</h3>;
          },
          h3({ children }) {
            return <h4>{children}</h4>;
          },
        }}
      >
        {t(markdown)}
      </Markdown>
    </div>
  );
}
