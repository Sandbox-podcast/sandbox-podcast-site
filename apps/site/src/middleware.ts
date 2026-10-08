import { NextResponse, type NextRequest } from 'next/server';
import { isSlidesHost, slidesRewriteDestination } from '@/domain/subdomain-routing';

export function middleware(request: NextRequest) {
  if (!isSlidesHost(request.headers.get('host'))) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const destination = slidesRewriteDestination(pathname);
  if (!destination) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = destination;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
