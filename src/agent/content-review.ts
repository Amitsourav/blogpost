import { z } from 'zod';
import { getAIProvider } from '../providers/ai';
import { findYears } from '../common/utils/post-process';

export type ReviewIssueType = 'unverified_fact' | 'outdated' | 'student_story' | 'year' | 'duplicate';

export interface ReviewIssue {
  type: ReviewIssueType;
  excerpt: string;
  note: string;
}

const reviewSchema = z.object({
  issues: z.array(
    z.object({
      type: z.enum(['unverified_fact', 'outdated', 'student_story']),
      excerpt: z.string(),
      note: z.string(),
    }),
  ),
});

/**
 * Flags content an editor should check before trusting it: specific figures
 * or named institutions that need a source, claims likely to go stale,
 * stories about individuals, and calendar years. Flags only — never edits.
 */
export async function reviewContent(content: string): Promise<ReviewIssue[]> {
  const ai = getAIProvider();
  const result = await ai.generateStructured(
    'You are a strict fact-checking editor. You flag claims for a human to verify; you never rewrite content.',
    `Review this blog post and list every passage an editor must verify or fix.

Flag as:
- unverified_fact: a specific number, interest rate, fee, ₹ amount, percentage, deadline, eligibility rule or named bank/institution/scheme stated as fact
- outdated: a claim likely to change over time (current rates, policies, "latest" rules) that may no longer be accurate
- student_story: a story, anecdote or case study about a named or specific individual

For each issue give "excerpt" (the exact short phrase, max 120 chars) and "note" (what to check, one line).
Do NOT flag general advice or definitions. Return {"issues": []} if nothing needs checking.

Blog post:
"""
${content.substring(0, 12000)}
"""`,
    reviewSchema,
    'content_review',
  );

  const yearIssues: ReviewIssue[] = findYears(content).map((year) => ({
    type: 'year',
    excerpt: year,
    note: 'Calendar year mentioned — replace with timeless phrasing',
  }));

  return [...result.issues, ...yearIssues];
}
