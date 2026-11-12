import { SandboxWorld } from './sandbox-world';
import { siteConfig } from '@/config/site';
import type { PersonalProject } from '@/domain/personal-projects';
import type { Episode } from '@/domain/schema';

export function StudioLanding({
  episodes,
  projects = [],
}: {
  episodes: readonly Episode[];
  projects?: readonly PersonalProject[];
  videoClubEnabled?: boolean;
}) {
  return (
    <SandboxWorld
      episodes={episodes}
      projects={projects}
      heroCopy={{
        eyebrow: siteConfig.heroEyebrow,
        title: siteConfig.heroTitle,
        description: siteConfig.heroDek,
      }}
    />
  );
}
