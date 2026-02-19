import { describe, it, expect } from 'vitest';
import { generateSlug } from './slug';

describe('generateSlug', () => {
  it('converts title to lowercase hyphenated slug', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('removes special characters', () => {
    expect(generateSlug('Hello, World! How are you?')).toBe('hello-world-how-are-you');
  });

  it('collapses multiple hyphens', () => {
    expect(generateSlug('Hello   ---   World')).toBe('hello-world');
  });

  it('trims leading and trailing hyphens', () => {
    expect(generateSlug('  -Hello World-  ')).toBe('hello-world');
  });

  it('handles empty string', () => {
    expect(generateSlug('')).toBe('');
  });
});
