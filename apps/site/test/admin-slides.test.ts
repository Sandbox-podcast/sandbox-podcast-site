import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '../src/proxy';
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

  it('autorise le cadre de même origine dans la CSP de production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      const response = proxy(new NextRequest('https://sandbox.test/admin'));
      expect(response.headers.get('Content-Security-Policy')).toContain("frame-src 'self'");
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
