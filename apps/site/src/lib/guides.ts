import catalog from '../../content/guides.json';
import { validateGuides } from '../domain/guides';
import { allEpisodes } from './repository';

/** À appeler après le chargement éditorial, lors de l'activation des routes de guides. */
export function publishedGuides() {
  return validateGuides(catalog, allEpisodes());
}
