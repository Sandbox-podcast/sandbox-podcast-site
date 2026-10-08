import { redirect } from 'next/navigation';
/** Les archives d’articles restent dans les données internes, mais ne sont plus publiées. */
export default function StoryPage(): never {
  redirect('/episodes');
}
