import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme-tech' },
    update: {},
    create: {
      name: 'Acme Tech',
      slug: 'acme-tech',
      apiKey: `tak_${crypto.randomBytes(24).toString('hex')}`,
      isActive: true,
    },
  });

  console.log(`Tenant created: ${tenant.name} (API Key: ${tenant.apiKey})`);

  const brandProfile = await prisma.brandProfile.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      companyName: 'Acme Tech Solutions',
      industry: 'Technology',
      brandTone: 'Professional yet approachable. Use clear, jargon-free language that educates and inspires.',
      targetAudience: 'Tech-savvy professionals, startup founders, and engineering managers aged 25-45',
      writingGuidelines: 'Use active voice. Include practical examples. Break complex topics into digestible sections.',
      seoPreferences: {
        focusOnLongTail: true,
        minWordCount: 800,
        maxWordCount: 1500,
      },
      defaultAuthor: 'Acme Tech Editorial',
      contentRules: [
        'Always include a clear introduction and conclusion',
        'Use at least 2 subheadings',
        'Include actionable takeaways',
      ],
    },
  });

  console.log(`Brand profile created: ${brandProfile.companyName}`);

  console.log('\nSeed completed successfully!');
  console.log(`\nUse this API key for testing: ${tenant.apiKey}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
