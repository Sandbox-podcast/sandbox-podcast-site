import { describe, expect, it } from 'vitest';
import { parseYouTubeVideoId } from '../src/domain/youtube.ts';

describe('extraction d’un identifiant YouTube', () => {
  it('reconnaît les formats de liens YouTube usuels', () => {
    expect(parseYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('refuse les domaines inconnus, le HTTP et les identifiants mal formés', () => {
    expect(parseYouTubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeUndefined();
    expect(parseYouTubeVideoId('http://youtube.com/watch?v=dQw4w9WgXcQ')).toBeUndefined();
    expect(parseYouTubeVideoId('https://youtube.com/watch?v=short')).toBeUndefined();
  });
});
