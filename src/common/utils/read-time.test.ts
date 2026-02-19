import { describe, it, expect } from 'vitest';
import { calculateReadTime } from './read-time';

describe('calculateReadTime', () => {
  it('returns 1 minute for short content', () => {
    expect(calculateReadTime('Hello world')).toBe(1);
  });

  it('calculates correct read time for 400 words', () => {
    const words = Array(400).fill('word').join(' ');
    expect(calculateReadTime(words)).toBe(2);
  });

  it('calculates correct read time for 1000 words', () => {
    const words = Array(1000).fill('word').join(' ');
    expect(calculateReadTime(words)).toBe(5);
  });

  it('rounds up to next minute', () => {
    const words = Array(201).fill('word').join(' ');
    expect(calculateReadTime(words)).toBe(2);
  });
});
