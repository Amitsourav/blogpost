export type BlogLengthTier = 'short' | 'medium' | 'long';

export interface BlogLengthSpec {
  tier: BlogLengthTier;
  minWords: number;
  maxWords: number;
  sectionWords: string;
  steps: string;
  faqs: string;
  includePeopleAlsoAsk: boolean;
}

const SPECS: Record<BlogLengthTier, BlogLengthSpec> = {
  short: {
    tier: 'short',
    minWords: 600,
    maxWords: 900,
    sectionWords: '80-150',
    steps: '3-4',
    faqs: '2-3',
    includePeopleAlsoAsk: false,
  },
  medium: {
    tier: 'medium',
    minWords: 1000,
    maxWords: 1500,
    sectionWords: '120-200',
    steps: '4-6',
    faqs: '3-5',
    includePeopleAlsoAsk: true,
  },
  long: {
    tier: 'long',
    minWords: 1800,
    maxWords: 2500,
    sectionWords: '150-250',
    steps: '5-7',
    faqs: '4-6',
    includePeopleAlsoAsk: true,
  },
};

export function getBlogLengthSpec(tier: BlogLengthTier): BlogLengthSpec {
  return SPECS[tier];
}
