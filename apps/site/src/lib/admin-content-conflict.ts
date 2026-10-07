export class ContentConflictError extends Error {
  constructor() {
    super('Le brouillon a changé depuis son ouverture. Rechargez-le avant de continuer.');
    this.name = 'ContentConflictError';
  }
}
