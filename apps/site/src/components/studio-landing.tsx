import { SandboxWorld } from './sandbox-world';
import { siteConfig } from '@/config/site';
import type { PersonalProject } from '@/domain/personal-projects';
import type { Episode } from '@/domain/schema';
import type { TimeMachineData } from '@/domain/time-machine';

export function StudioLanding({
  episodes,
  newsAvailable,
  projects = [],
  historyData,
}: {
  episodes: readonly Episode[];
  projects?: readonly PersonalProject[];
  newsAvailable: boolean;
  videoClubEnabled: boolean;
  historyData?: TimeMachineData | undefined;
}) {
  return (
    <SandboxWorld
      episodes={episodes}
      projects={projects}
      newsAvailable={newsAvailable}
      historyData={historyData}
      heroCopy={{
        eyebrow: siteConfig.heroEyebrow,
        title: siteConfig.heroTitle,
        description: siteConfig.heroDek,
      }}
    />
  );
}
