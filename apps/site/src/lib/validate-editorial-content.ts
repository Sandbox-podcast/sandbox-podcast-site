import {
  assertNoEditorialRemovals,
  editableContentSchema,
  type EditableContent,
} from '../domain/admin-content.ts';
import type { Content } from './load.ts';
import { loadContent } from './load.ts';
import { validateContent } from './validate.ts';

export function validateEditorialContent(
  value: unknown,
  removalBaseline: EditableContent,
): EditableContent {
  const parsed = editableContentSchema.parse(value);
  assertNoEditorialRemovals(removalBaseline, parsed);
  const snapshots = loadContent().snapshots;
  const candidate: Content = { ...parsed, snapshots };
  const errors = validateContent(candidate).filter((issue) => issue.level === 'error');
  if (errors.length > 0) {
    throw new Error(errors.map((issue) => `${issue.where} : ${issue.message}`).join('\n'));
  }
  return parsed;
}
