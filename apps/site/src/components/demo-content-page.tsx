import { DEMO_CONTENT_DESCRIPTION } from '@/domain/demo-content';
import { LocalizedLink as Link, Text } from './localization';

export function DemoContentPage({ title }: { title: string }) {
  return (
    <article className="wrap py-12">
      <h1 className="display text-4xl md:text-5xl">
        <Text>Ancienne page de démonstration</Text>
      </h1>
      <p className="mt-4 text-xl">
        <Text>{title}</Text>
      </p>
      <p className="mt-4 max-w-2xl text-ink-2">
        <Text>{DEMO_CONTENT_DESCRIPTION}</Text>
      </p>
      <p className="mt-3 max-w-2xl text-ink-2">
        <Text>Retrouve les classements publiés et les épisodes du Talk Show.</Text>
      </p>
      <nav className="mt-6 flex flex-wrap gap-3">
        <Link className="btn btn-solid" href="/charts">
          <Text>Voir les classements</Text>
        </Link>
        <Link className="btn" href="/podcast">
          <Text>Voir les épisodes</Text>
        </Link>
      </nav>
    </article>
  );
}
