import { describe, it, expect } from 'vitest';
import { findYears } from './post-process';
import { getBlogLengthSpec } from './blog-length';

describe('findYears', () => {
  it('returns distinct years in the content', () => {
    expect(findYears('Rates in 2025 rose, unlike 2024. In 2025 again.')).toEqual(['2025', '2024']);
  });

  it('ignores numbers that are not years', () => {
    expect(findYears('Pay ₹25000 over 24 months, 9.5% interest')).toEqual([]);
  });
});

describe('getBlogLengthSpec', () => {
  it('gives short posts a smaller range than long posts', () => {
    const short = getBlogLengthSpec('short');
    const long = getBlogLengthSpec('long');
    expect(short.maxWords).toBeLessThan(long.minWords);
  });

  it('drops People Also Ask for short posts only', () => {
    expect(getBlogLengthSpec('short').includePeopleAlsoAsk).toBe(false);
    expect(getBlogLengthSpec('medium').includePeopleAlsoAsk).toBe(true);
  });
});
