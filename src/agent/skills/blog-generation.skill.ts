import { z } from 'zod';
import { ISkill } from '../skill.interface';
import { AgentContext, PipelineArtifacts, SkillResult } from '../../common/types';
import { getAIProvider } from '../../providers/ai';
import { calculateReadTime } from '../../common/utils/read-time';
import { postProcessContent, findYears } from '../../common/utils/post-process';
import { BlogLengthSpec, getBlogLengthSpec } from '../../common/utils/blog-length';
import { logger } from '../../config/logger';

const seoSchema = z.object({
  seoTitle: z.string(),
  urlSlug: z.string(),
  metaDescription: z.string(),
  primaryKeyword: z.string(),
  secondaryKeywords: z.array(z.string()),
  title: z.string(),
  excerpt: z.string(),
  tags: z.array(z.string()),
});

const topicScopeSchema = z.object({
  tier: z.enum(['short', 'medium', 'long']),
  reason: z.string(),
});

const CONTENT_RESTRICTIONS = `CONTENT RESTRICTIONS (mandatory)
- Do NOT mention any calendar year (e.g. 2024, 2025, 2026) anywhere — not in headings, examples, tables or FAQs. Use timeless phrasing like "currently" or "at the time of applying" instead.
- Do NOT include student stories, personal anecdotes or case studies about named individuals. Explain with general scenarios instead.`;

/**
 * Decides how long the post should be based on how broad the topic is,
 * so narrow questions get short posts and broad guides get long ones.
 */
async function sizeTopic(topic: string, keywords: string[]): Promise<BlogLengthSpec> {
  const ai = getAIProvider();
  const result = await ai.generateStructured(
    'You are a content strategist who decides how long a blog post should be.',
    `Classify how much depth this blog topic needs.

Topic: "${topic}"
${keywords.length > 0 ? `Keywords: ${keywords.join(', ')}` : ''}

- short: a narrow, single question or simple definition (600-900 words)
- medium: an explainer or comparison of a few options (1,000-1,500 words)
- long: a broad, complete guide covering many sub-topics (1,800-2,500 words)

Return JSON with "tier" (short | medium | long) and a one-line "reason".`,
    topicScopeSchema,
    'topic_scope',
  );
  return getBlogLengthSpec(result.tier);
}

function buildDefaultPrompt(
  brandProfile: AgentContext['brandProfile'],
  length: BlogLengthSpec,
): string {
  const rules = Array.isArray(brandProfile.contentRules) && brandProfile.contentRules.length > 0
    ? `\nContent rules:\n${(brandProfile.contentRules as string[]).map((r) => `- ${r}`).join('\n')}`
    : '';

  return `You are a professional content writer for ${brandProfile.companyName}, a company in the ${brandProfile.industry} industry.

Brand tone: ${brandProfile.brandTone}
Target audience: ${brandProfile.targetAudience}
${brandProfile.writingGuidelines ? `Writing guidelines: ${brandProfile.writingGuidelines}` : ''}${rules}

Write in markdown format. Target ${length.minWords.toLocaleString('en-US')}-${length.maxWords.toLocaleString('en-US')} words. Use a conversational, direct tone — write like a knowledgeable friend explaining things, not a textbook.

BLOG STRUCTURE (follow this order exactly)

1) INTRO (120-170 words, 2-3 short paragraphs)
   - Open with a relatable question or real situation the reader faces
   - Acknowledge the confusion/challenge briefly
   - Promise what the guide will cover — be specific
   - Do NOT include a table of contents

2) MAIN CONTENT SECTIONS (use ## H2 for each major section)
   - Use ### H3 for numbered subsections, e.g.: ### 1) Public Sector Banks, ### 2) Private Sector Banks
   - After each subsection, use a bold label on its own line followed by a bullet list:
     **Typical advantages:**
     - Point one
     - Point two
     **Limitations:**
     - Point one
   - Cover: definitions, eligibility, costs/rates/fees with specific numbers, timelines
   - Include at least ONE comparison or data table (use proper markdown table syntax)
   - Keep paragraphs short: 1-3 lines each. Never write a wall of text.

3) STEP-BY-STEP PROCESS (## heading, then ### for each step)
   - Format: ### Step 1: Action Title
   - Write 2-3 sentences per step with specific actionable advice
   - Include ${length.steps} steps
${length.includePeopleAlsoAsk ? `
4) PEOPLE ALSO ASK (## People Also Ask)
   - Pick 2-3 related questions your audience would search for
   - Answer each in 2-3 sentences under ### subheadings
` : ''}
5) COMMON MISTAKES (## section)
   - 4-5 mistakes as bullet points with brief explanation of each

6) FAQs (## Frequently Asked Questions)
   - ${length.faqs} questions formatted as: ### 1) Question text here?
   - Each answer: 2-3 crisp sentences

7) CLOSING PARAGRAPH (no heading — just a natural final paragraph)
   - Weave in a mention of ${brandProfile.companyName} as helpful advice, not a sales pitch
   - Example: "If you're looking to compare options, platforms like ${brandProfile.companyName} can help you find the best fit."
   - Do NOT add a heading like "## ${brandProfile.companyName} Mention" or "## Conclusion"
   - Do NOT include a "Sources Checked" section — end the blog after this paragraph

SEO GUIDELINES
- Use target keywords naturally throughout; never keyword-stuff
- Write headings that match how people actually search (question-style where relevant)
- No placeholder brackets like [Internal link: ...] — write natural text instead

WRITING STYLE
- Short paragraphs (1-3 lines). Break up long paragraphs.
- Conversational and direct. Use "you" and "your" frequently.
- Only state figures (rates, fees, ₹ amounts, limits) you are confident are widely established. Give typical ranges rather than exact numbers, and add "check with the lender for current rates" where figures change often.
- Do NOT invent specific bank names, schemes or statistics. Refer to lender types (public sector banks, NBFCs) unless a fact is well known.
- Bold only for short labels like "Typical advantages:" or "Key point:" — never bold entire sentences.
- Use "-" for bullet lists, not "*"
- No emojis. No "As an AI" disclaimers. Just write the blog.

${CONTENT_RESTRICTIONS}`;
}

export class BlogGenerationSkill implements ISkill {
  name = 'blog-generation';
  description = 'Generates a full blog post from a topic and brand context';

  canExecute(_context: AgentContext, _artifacts: PipelineArtifacts): boolean {
    return true;
  }

  async execute(context: AgentContext, artifacts: PipelineArtifacts): Promise<SkillResult> {
    try {
      const ai = getAIProvider();
      const { brandProfile, topic, keywords } = context;

      // ---- STEP 0: Size the post to the topic's scope ----
      const length = await sizeTopic(topic, keywords).catch((err) => {
        logger.warn('Topic sizing failed, defaulting to medium', {
          taskId: context.taskId,
          error: err instanceof Error ? err.message : String(err),
        });
        return getBlogLengthSpec('medium');
      });
      logger.info('Blog length chosen', {
        taskId: context.taskId,
        tier: length.tier,
        minWords: length.minWords,
        maxWords: length.maxWords,
      });

      // Use tenant's custom prompt if set, otherwise build from brand profile fields
      const customPrompt = (brandProfile as any).customPrompt as string | undefined;
      const systemPrompt = customPrompt && customPrompt.trim().length > 0
        ? `${customPrompt.replace(/\{TOPIC\}/gi, topic)}\n\n${CONTENT_RESTRICTIONS}`
        : buildDefaultPrompt(brandProfile, length);

      const sections = [
        'intro',
        'main content',
        'step-by-step process',
        ...(length.includePeopleAlsoAsk ? ['People Also Ask'] : []),
        'common mistakes',
        'FAQs',
        'closing paragraph',
      ].join(', ');

      // ---- STEP 1: Generate the full blog content as plain text ----
      const contentPrompt = `Write a blog post about: "${topic}"
${keywords.length > 0 ? `\nTarget keywords to naturally incorporate: ${keywords.join(', ')}` : ''}

MANDATORY LENGTH: This topic needs a ${length.tier} post. Write ${length.minWords.toLocaleString('en-US')}-${length.maxWords.toLocaleString('en-US')} words — no padding beyond what the topic needs.
- Each H2 section should have ${length.sectionWords} words of real content with specific details and examples.
- The intro must be 120-170 words across 2-3 short paragraphs.
- Include ALL sections from your instructions: ${sections}.
- Do NOT include a case study, real-life example or story about a named person or student.
- Do NOT mention any calendar year (e.g. 2024, 2025). Use timeless phrasing instead.
- Do NOT invent statistics, exact rates or bank-specific figures. Use ranges and general lender types; an editor verifies every figure.
- Do NOT include a "Sources Checked" section. Do NOT include a heading like "## FundMyCampus Mention" or "## Brand Mention". End with a natural closing paragraph.
- Output the blog in markdown format only. No JSON, no wrapping.

FORMATTING RULES (critical — follow exactly):
- Do NOT include a Table of Contents
- For tables, use proper markdown table syntax: | Header | Header | then |---|---| then data rows
- Bold is ONLY for standalone labels on their own line (not inside a bullet), like:\n  **Typical advantages:**\n  **Key takeaway:**\n- NEVER start a bullet point with bold text. NEVER use this pattern: "- **Label:** text". Instead write it as a plain sentence.\n  BAD: "- **Processing fees:** Factor in any upfront costs"\n  GOOD: "- Processing fees can significantly add to your total cost"\n  BAD: "- **Ignoring total costs:** Focus not just on..."\n  GOOD: "- Many borrowers ignore total loan costs and focus only on interest rates"
- Do NOT use brackets or placeholders like [Internal link: ...] or [CTA placeholder]. Write natural text instead.
- Do NOT use asterisk for footnotes like 6.75%*. Write: 6.75% (subject to T&C)
- Use "-" for bullet lists, never "*"
- FAQs must use ### for each question: ### 1) What is the interest rate?
- Steps must use ### for each: ### Step 1: Calculate Your Requirement
- Numbered subsections use ###: ### 1) Public Sector Banks, ### 2) Private Banks
- Keep paragraphs SHORT — maximum 3 lines. Break up any long paragraph.
- Write in a conversational tone. Use "you" and "your". Sound like a helpful friend, not a textbook.`;

      const rawContent = await ai.generate(systemPrompt, contentPrompt, 16000);
      const blogContent = postProcessContent(rawContent);

      const wordCount = blogContent.split(/\s+/).length;
      logger.info('Blog content generated (step 1)', {
        taskId: context.taskId,
        wordCount,
      });

      const years = findYears(blogContent);
      if (years.length > 0) {
        logger.warn('Blog content mentions calendar years', {
          taskId: context.taskId,
          years,
        });
      }

      // ---- STEP 2: Extract SEO metadata from the content ----
      const seoPrompt = `Based on the following blog post, extract SEO metadata.

Blog post:
"""
${blogContent.substring(0, 2000)}
"""

Return a JSON object with:
- seoTitle: SEO title (55-65 chars)
- urlSlug: URL slug (lowercase, hyphens)
- metaDescription: Meta description (150-160 chars)
- primaryKeyword: The single primary keyword
- secondaryKeywords: 6-10 secondary keywords
- title: The display title for this blog post
- excerpt: A 1-2 sentence summary (max 160 chars)
- tags: 3-4 relevant tags (always return at least 3)`;

      const seoResult = await ai.generateStructured(
        'You are an SEO specialist. Extract metadata from blog content.',
        seoPrompt,
        seoSchema,
        'seo_metadata',
      );

      artifacts.blogDraft = {
        title: seoResult.title,
        slug: seoResult.urlSlug,
        excerpt: seoResult.excerpt,
        content: blogContent,
        author: brandProfile.defaultAuthor || brandProfile.companyName,
        readTimeMinutes: calculateReadTime(blogContent),
        tags: seoResult.tags,
      };

      artifacts.seoMetadata = {
        metaTitle: seoResult.seoTitle,
        metaDescription: seoResult.metaDescription,
        focusKeyword: seoResult.primaryKeyword,
        secondaryKeywords: seoResult.secondaryKeywords,
        ogTitle: seoResult.seoTitle,
        ogDescription: seoResult.metaDescription,
      };

      logger.info('Blog draft generated', {
        taskId: context.taskId,
        title: seoResult.title,
        wordCount,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}
