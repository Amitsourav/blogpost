import crypto from 'crypto';

/** Posts are never scheduled after this time (minutes from midnight, 18:00). */
export const WINDOW_END_MINUTES = 18 * 60;
/** Minimum gap between two posts on the same day. */
const MIN_GAP_MINUTES = 30;

/** Deterministic 0-1 random numbers from a seed, so a day's slots stay fixed across polls. */
function seededRandom(seed: string): () => number {
  let counter = 0;
  return () => {
    const hash = crypto.createHash('sha256').update(`${seed}:${counter++}`).digest();
    return hash.readUInt32BE(0) / 0x100000000;
  };
}

/**
 * Picks `postsPerDay` random times (minutes from midnight, ascending) between
 * the start time and 18:00. The same tenant and date always get the same times.
 */
export function calculateRandomSlotTimes(
  startMinutes: number,
  postsPerDay: number,
  seed: string,
): number[] {
  const window = WINDOW_END_MINUTES - startMinutes;
  if (window <= 0) return [startMinutes];

  const random = seededRandom(seed);
  // Shrink the gap if the window is too small to fit every post with the full gap
  const gap = Math.min(MIN_GAP_MINUTES, Math.floor(window / postsPerDay));
  const free = window - gap * (postsPerDay - 1);

  // Random offsets in the free time, then spread apart by the gap
  const offsets = Array.from({ length: postsPerDay }, () => Math.floor(random() * free)).sort((a, b) => a - b);
  return offsets.map((offset, i) => startMinutes + offset + i * gap);
}
