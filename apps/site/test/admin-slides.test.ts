import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import config from '../next.config';
import { AdminSlides } from '../src/components/admin-slides';

describe('consultation des slides dans l’admin', () => {
  it('charge l’index statique dans un cadre isolé et propose une grande vue', () => {
    const html = renderToStaticMarkup(createElement(AdminSlides));
    expect(html).toContain('src="/slides/index.html"');
    expect(html).toContain('sandbox="allow-scripts"');
    expect(html).not.toContain('allow-same-origin');
    expect(html).toContain('href="/slides/index.html"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('Revenir à la liste des présentations');
  });

  it('autorise le cadre de même origine dans la CSP de production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      const productionRules = await config.headers?.();
      const productionCsp = productionRules
        ?.find((rule) => rule.source === '/:path*')
        ?.headers.find((header) => header.key === 'Content-Security-Policy');
      expect(productionCsp?.value).toContain("frame-src 'self'");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
