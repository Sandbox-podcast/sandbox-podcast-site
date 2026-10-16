import { PublishedMethodology } from './published-methodology';

export function ChartsMethodology({
  rising = false,
  editionId,
}: {
  rising?: boolean;
  editionId?: string;
}) {
  return <PublishedMethodology chart={rising ? 'rising' : 'github'} editionId={editionId} />;
}
