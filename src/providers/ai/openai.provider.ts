import OpenAI from 'openai';
import { ZodSchema } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { IAIProvider } from './ai-provider.interface';
import { AIProviderError } from '../../common/errors';
import { withRetry } from '../../common/utils';
import { config } from '../../config';

export class OpenAIProvider implements IAIProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseUrl,
    });
    this.model = config.openai.model;
  }

  async generate(systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<string> {
    return withRetry(async () => {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new AIProviderError('Empty response from model', 'openai');
      }
      return content;
    });
  }

  async generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: ZodSchema<T>,
    schemaName: string
  ): Promise<T> {
    return withRetry(async () => {
      const jsonSchema = zodResponseFormat(schema, schemaName);
      const schemaPrompt = `\n\nYou MUST respond with valid JSON matching this schema:\n${JSON.stringify(jsonSchema.json_schema.schema, null, 2)}\n\nRespond ONLY with the JSON object, no markdown or extra text.`;

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt + schemaPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 16000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new AIProviderError('Empty response from model', 'openai');
      }

      const parsed = schema.parse(JSON.parse(content));
      return parsed;
    });
  }
}
