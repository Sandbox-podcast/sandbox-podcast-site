import { ImageResponse } from 'next/og';
import { githubProjectDetail } from '@/lib/charts-public';

export const alt = 'Fiche projet GitHub · SANDBOX CHARTS';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const dynamic = 'force-dynamic';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let result: Awaited<ReturnType<typeof githubProjectDetail>> = null;
  try {
    result = await githubProjectDetail(slug);
  } catch (error) {
    console.error(
      'SANDBOX project social image unavailable:',
      error instanceof Error ? error.name : 'unknown',
    );
  }

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: 56,
        backgroundColor: '#05090d',
        color: '#f4f7fa',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26 }}>
        <span style={{ fontWeight: 800 }}>SANDBOX CHARTS</span>
        <span style={{ color: '#3cd6fc' }}>GITHUB TOP 20</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <span style={{ color: '#9baab5', fontSize: 30 }}>
          {result?.project.fullName ?? 'Classement hebdomadaire des projets IA'}
        </span>
        <strong style={{ fontSize: 76, letterSpacing: -3, lineHeight: 1.05 }}>
          {result?.project.name ?? 'Projet open source IA'}
        </strong>
      </div>
      <div style={{ display: 'flex', gap: 24, fontSize: 24 }}>
        <span style={{ color: '#3cd6fc' }}>
          {result?.currentRank === null || result?.currentRank === undefined
            ? 'MESURES GITHUB OBSERVÉES'
            : `RANG ACTUEL #${String(result.currentRank)}`}
        </span>
        <span>{result?.currentWeek ?? 'SANDBOX CHARTS'}</span>
      </div>
    </div>,
    size,
  );
}
