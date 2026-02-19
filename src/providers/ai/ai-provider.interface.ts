import { ZodSchema } from 'zod';

export interface IAIProvider {
  generate(systemPrompt: string, userPrompt: string, maxTokens?: number): Promise<string>;
  generateStructured<T>(
    systemPrompt: string,
    userPrompt: string,
    schema: ZodSchema<T>,
    schemaName: string
  ): Promise<T>;
}
