import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { adminContentSecurityPolicy } from './domain/admin-csp';
import {
  isSlidesHost,
  slidesBrowserRedirect,
  slidesRewriteDestination,
} from '@/domain/subdomain-routing';

export function proxy(request: NextRequest) {
  if (!isSlidesHost(request.headers.get('host'))) {
    if (
      process.env.NODE_ENV === 'production' &&
      /^\/admin(?:\/|$)/.test(request.nextUrl.pathname)
    ) {
      const nonce = randomBytes(16).toString('base64');
      const policy = adminContentSecurityPolicy(nonce);
      const headers = new Headers(request.headers);
      headers.set('x-nonce', nonce);
      headers.set('Content-Security-Policy', policy);
      const response = NextResponse.next({ request: { headers } });
      response.headers.set('Content-Security-Policy', policy);
      response.headers.set('Cache-Control', 'private, no-store, max-age=0');
      return response;
    }
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const browserRedirect = slidesBrowserRedirect(pathname);
  if (browserRedirect) {
    const url = request.nextUrl.clone();
    url.pathname = browserRedirect;
    return NextResponse.redirect(url);
  }

  const destination = slidesRewriteDestination(pathname);
  if (!destination) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = destination;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
