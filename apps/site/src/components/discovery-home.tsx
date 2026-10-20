import { DiscoveryStory } from './discovery-story';
import { StudioLanding } from './studio-landing';
import { HomeMotion } from './home-motion';
import type { Episode, Host } from '@/domain/schema';
import type { PersonalProject } from '@/domain/personal-projects';
import type { TimeMachineData } from '@/domain/time-machine';
import styles from './discovery-home.module.css';

export function DiscoveryHome({
  episodes,
  hosts = [],
  projects = [],
  videoClubEnabled = false,
  newsAvailable = false,
  historyData,
}: {
  episodes: readonly Episode[];
  hosts?: readonly Host[];
  projects?: readonly PersonalProject[];
  videoClubEnabled?: boolean;
  newsAvailable?: boolean;
  historyData?: TimeMachineData | undefined;
}) {
  return (
    <HomeMotion className={styles['page']}>
      <div data-home="editorial">
        <StudioLanding
          episodes={episodes}
          projects={projects}
          videoClubEnabled={videoClubEnabled}
          newsAvailable={newsAvailable}
          historyData={historyData}
        />
        <DiscoveryStory hosts={hosts} projects={projects} newsAvailable={newsAvailable} />
      </div>
    </HomeMotion>
  );
}
