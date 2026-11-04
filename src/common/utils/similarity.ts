function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function shingles(text: string, size: number): Set<string> {
  const w = words(text);
  if (w.length < size) return new Set(w.length > 0 ? [w.join(' ')] : []);
  const result = new Set<string>();
  for (let i = 0; i <= w.length - size; i++) {
    result.add(w.slice(i, i + size).join(' '));
  }
  return result;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const item of a) if (b.has(item)) shared++;
  return shared / (a.size + b.size - shared);
}

/** Word-overlap similarity (0-1) for short texts such as topics and titles. */
export function titleSimilarity(a: string, b: string): number {
  return jaccard(shingles(a, 1), shingles(b, 1));
}

/** Overlap of 5-word phrases (0-1); high values mean copied passages. */
export function contentSimilarity(a: string, b: string): number {
  return jaccard(shingles(a, 5), shingles(b, 5));
}
