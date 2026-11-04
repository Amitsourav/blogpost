import { describe, it, expect } from 'vitest';
import { calculateRandomSlotTimes, WINDOW_END_MINUTES } from './slot-times';

const TEN_AM = 10 * 60;

describe('calculateRandomSlotTimes', () => {
  it('returns 3 ascending times between 10:00 and 18:00, at least 30 min apart', () => {
    for (let day = 1; day <= 50; day++) {
      const slots = calculateRandomSlotTimes(TEN_AM, 3, `tenant:2026-11-${day}`);
      expect(slots).toHaveLength(3);
      for (const s of slots) {
        expect(s).toBeGreaterThanOrEqual(TEN_AM);
        expect(s).toBeLessThan(WINDOW_END_MINUTES);
      }
      expect(slots[1] - slots[0]).toBeGreaterThanOrEqual(30);
      expect(slots[2] - slots[1]).toBeGreaterThanOrEqual(30);
    }
  });

  it('keeps the same times for the same tenant and day', () => {
    expect(calculateRandomSlotTimes(TEN_AM, 3, 'a:2026-11-4')).toEqual(calculateRandomSlotTimes(TEN_AM, 3, 'a:2026-11-4'));
  });

  it('gives different times on different days', () => {
    expect(calculateRandomSlotTimes(TEN_AM, 3, 'a:2026-11-4')).not.toEqual(calculateRandomSlotTimes(TEN_AM, 3, 'a:2026-11-5'));
  });
});
