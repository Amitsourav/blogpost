import { IAIProvider } from './ai-provider.interface';
import { OpenAIProvider } from './openai.provider';

const providers: Record<string, () => IAIProvider> = {
  openai: () => new OpenAIProvider(),
};

let defaultProvider: IAIProvider | null = null;

export function getAIProvider(name = 'openai'): IAIProvider {
  if (name === 'openai' && defaultProvider) return defaultProvider;

  const factory = providers[name];
  if (!factory) {
    throw new Error(`Unknown AI provider: ${name}`);
  }

  const provider = factory();
  if (name === 'openai') defaultProvider = provider;
  return provider;
}
