import { z } from 'zod';
import { ISkill } from '../skill.interface';
import { AgentContext, PipelineArtifacts, SkillResult } from '../../common/types';
import { getAIProvider } from '../../providers/ai';
import { calculateReadTime } from '../../common/utils/read-time';
import { postProcessContent } from '../../common/utils/post-process';
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

function buildDefaultPrompt(brandProfile: AgentContext['brandProfile']): string {
  const rules = Array.isArray(brandProfile.contentRules) && brandProfile.contentRules.length > 0
    ? `\nContent rules:\n${(brandProfile.contentRules as string[]).map((r) => `- ${r}`).join('\n')}`
    : '';

  return `You are a professional content writer for ${brandProfile.companyName}, a company in the ${brandProfile.industry} industry.

Brand tone: ${brandProfile.brandTone}
Target audience: ${brandProfile.targetAudience}
${brandProfile.writingGuidelines ? `Writing guidelines: ${brandProfile.writingGuidelines}` : ''}${rules}

Write in markdown format. Target 1,200-1,600 words. Use a conversational, direct tone — write like a knowledgeable friend explaining things, not a textbook.

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
   - Include 5-7 steps

4) PEOPLE ALSO ASK (## People Also Ask)
   - Pick 2-3 related questions your audience would search for
   - Answer each in 2-3 sentences under ### subheadings

5) CASE EXAMPLE (## Real-Life Example or similar heading)
   - Use a realistic Indian name (e.g., Ananya, Rohan, Priya)
   - Include specific ₹ amounts, loan details, bank names
   - Show the decision-making process and outcome
   - 150-200 words

6) COMMON MISTAKES (## section)
   - 4-5 mistakes as bullet points with brief explanation of each

7) FAQs (## Frequently Asked Questions)
   - 4-6 questions formatted as: ### 1) Question text here?
   - Each answer: 2-3 crisp sentences

8) CLOSING PARAGRAPH (no heading — just a natural final paragraph)
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
- Use specific numbers, ₹ amounts, percentages — never be vague.
- Bold only for short labels like "Typical advantages:" or "Key point:" — never bold entire sentences.
- Use "-" for bullet lists, not "*"
- No emojis. No "As an AI" disclaimers. Just write the blog.`;
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

      // Use tenant's custom prompt if set, otherwise build from brand profile fields
      const customPrompt = (brandProfile as any).customPrompt as string | undefined;
      const systemPrompt = customPrompt && customPrompt.trim().length > 0
        ? customPrompt.replace(/\{TOPIC\}/gi, topic)
        : buildDefaultPrompt(brandProfile);

      // ---- STEP 1: Generate the full blog content as plain text ----
      const contentPrompt = `Write a detailed, comprehensive blog post about: "${topic}"
${keywords.length > 0 ? `\nTarget keywords to naturally incorporate: ${keywords.join(', ')}` : ''}

MANDATORY LENGTH: Write AT LEAST 1,200 words. Target 1,400-1,600 words.
- Each H2 section must have 150-250 words of real content with specific details, data, and examples.
- The intro must be 120-170 words across 2-3 short paragraphs.
- Write every section in full detail. Do NOT summarize or be brief. Expand each point thoroughly.
- Include ALL sections from your instructions: intro, main content, step-by-step process, People Also Ask, case example, common mistakes, FAQs, closing paragraph.
- Do NOT include a "Sources Checked" section. Do NOT include a heading like "## FundMyCampus Mention" or "## Brand Mention". End with a natural closing paragraph.
- Output the blog in markdown format only. No JSON, no wrapping.

FORMATTING RULES (critical — follow exactly):
- Do NOT include a Table of Contents
- For tables, use proper markdown table syntax: | Header | Header | then |---|---| then data rows
- Bold is ONLY for standalone labels on their own line (not inside a bullet), like:\n  **Typical advantages:**\n  **Key takeaway:**\n- NEVER start a bullet point with bold text. NEVER use this pattern: "- **Label:** text". Instead write it as a plain sentence.\n  BAD: "- **Processing fees:** Factor in any upfront costs"\n  GOOD: "- Processing fees can significantly add to your total cost"\n  BAD: "- **Ignoring total costs:** Focus not just on..."\n  GOOD: "- Many students ignore total loan costs and focus only on interest rates"
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
- tags: 3-5 relevant tags`;

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
