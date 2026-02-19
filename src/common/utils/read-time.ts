const WORDS_PER_MINUTE = 200;

export function calculateReadTime(content: string): number {
  const wordCount = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}
