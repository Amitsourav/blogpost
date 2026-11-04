import { describe, it, expect } from 'vitest';
import { titleSimilarity, contentSimilarity } from './similarity';

describe('titleSimilarity', () => {
  it('scores identical titles as 1 regardless of case and punctuation', () => {
    expect(titleSimilarity('Education Loan for MS in USA', 'education loan for MS in USA!')).toBe(1);
  });

  it('scores related but different titles below the duplicate threshold', () => {
    expect(titleSimilarity('Education loan for MS in USA', 'Education loan for MS in Canada')).toBeLessThan(0.9);
  });
});

describe('contentSimilarity', () => {
  const base = 'Public sector banks usually offer lower interest rates but ask for collateral on larger loans and take longer to process applications.';

  it('detects copied passages', () => {
    expect(contentSimilarity(base, base + ' Plan ahead.')).toBeGreaterThan(0.8);
  });

  it('scores unrelated text near zero', () => {
    expect(contentSimilarity(base, 'Scholarships reward academic merit and rarely need repayment of any kind at all.')).toBe(0);
  });
});
