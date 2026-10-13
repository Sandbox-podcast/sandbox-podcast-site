import { publicGithubBursts } from '@/lib/github-bursts-store';
import { chartsApiResponse } from '@/lib/charts-public';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
  const result = await chartsApiResponse(() => publicGithubBursts());
  return result.response;
}
