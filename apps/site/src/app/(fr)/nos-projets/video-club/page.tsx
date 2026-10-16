import { VideoClub } from '@/components/video-club';
import { personalProjects } from '@/lib/personal-projects';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Sandbox Vidéo Club',
  description: 'Les projets de Lou, Loïc et Nicolas dans un vidéoclub.',
  robots: { index: false, follow: false },
};

export default async function VideoClubPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <VideoClub projects={personalProjects} startInside={params['from'] === 'studio'} />;
}
