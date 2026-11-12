import { DiscoveryStory } from './discovery-story';
import { StudioLanding } from './studio-landing';
import { HomeMotion } from './home-motion';
import type { Episode, Host } from '@/domain/schema';
import type { PersonalProject } from '@/domain/personal-projects';
import styles from './discovery-home.module.css';

export function DiscoveryHome({
  episodes,
  hosts = [],
  projects = [],
  videoClubEnabled = false,
}: {
  episodes: readonly Episode[];
  hosts?: readonly Host[];
  projects?: readonly PersonalProject[];
  videoClubEnabled?: boolean;
}) {
  return (
    <HomeMotion className={styles['page']}>
      <div data-home="editorial">
        <StudioLanding
          episodes={episodes}
          projects={projects}
          videoClubEnabled={videoClubEnabled}
        />
        <DiscoveryStory hosts={hosts} />
      </div>
    </HomeMotion>
  );
}
