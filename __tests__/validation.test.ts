import { youtubeUrlSchema } from '@/lib/types';

describe('YouTube URL Validation', () => {
  describe('youtubeUrlSchema', () => {
    it('accepts valid YouTube watch URLs', () => {
      const validUrls = [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'www.youtube.com/watch?v=dQw4w9WgXcQ',
        'youtube.com/watch?v=dQw4w9WgXcQ',
      ];

      validUrls.forEach((url) => {
        const result = youtubeUrlSchema.safeParse(url);
        expect(result.success).toBe(true);
      });
    });

    it('accepts valid YouTube short URLs', () => {
      const validUrls = [
        'https://youtu.be/dQw4w9WgXcQ',
        'youtu.be/dQw4w9WgXcQ',
      ];

      validUrls.forEach((url) => {
        const result = youtubeUrlSchema.safeParse(url);
        expect(result.success).toBe(true);
      });
    });

    it('accepts valid YouTube shorts URLs', () => {
      const validUrls = [
        'https://www.youtube.com/shorts/abc123',
        'https://youtube.com/shorts/abc123',
      ];

      validUrls.forEach((url) => {
        const result = youtubeUrlSchema.safeParse(url);
        expect(result.success).toBe(true);
      });
    });

    it('accepts valid YouTube playlist URLs', () => {
      const validUrls = [
        'https://www.youtube.com/playlist?list=PLtest123',
        'https://youtube.com/playlist?list=PLtest123',
      ];

      validUrls.forEach((url) => {
        const result = youtubeUrlSchema.safeParse(url);
        expect(result.success).toBe(true);
      });
    });

    it('accepts valid YouTube Music URLs', () => {
      const validUrls = [
        'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
      ];

      validUrls.forEach((url) => {
        const result = youtubeUrlSchema.safeParse(url);
        expect(result.success).toBe(true);
      });
    });

    it('rejects invalid URLs', () => {
      const invalidUrls = [
        'https://www.google.com',
        'https://vimeo.com/123456',
        'not a url',
        '',
        'youtube',
        'https://youtube.com',
      ];

      invalidUrls.forEach((url) => {
        const result = youtubeUrlSchema.safeParse(url);
        expect(result.success).toBe(false);
      });
    });
  });
});
