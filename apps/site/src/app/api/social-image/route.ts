import { siteCard } from '@/lib/og';

export const dynamic = 'force-static';

export function GET() {
  return siteCard();
}
