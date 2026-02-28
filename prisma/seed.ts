import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ---- Acme Tech (sample tenant) ----
  const acme = await prisma.tenant.upsert({
    where: { slug: 'acme-tech' },
    update: {},
    create: {
      name: 'Acme Tech',
      slug: 'acme-tech',
      apiKey: `tak_${crypto.randomBytes(24).toString('hex')}`,
      isActive: true,
    },
  });

  console.log(`Tenant created: ${acme.name} (API Key: ${acme.apiKey})`);

  await prisma.brandProfile.upsert({
    where: { tenantId: acme.id },
    update: {},
    create: {
      tenantId: acme.id,
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

  console.log(`Brand profile created: Acme Tech Solutions`);

  // ---- FundMyCampus ----
  const fmc = await prisma.tenant.upsert({
    where: { slug: 'fundmycampus' },
    update: {},
    create: {
      name: 'FundMyCampus',
      slug: 'fundmycampus',
      apiKey: `tak_${crypto.randomBytes(24).toString('hex')}`,
      isActive: true,
    },
  });

  console.log(`Tenant created: ${fmc.name} (API Key: ${fmc.apiKey})`);

  await prisma.brandProfile.upsert({
    where: { tenantId: fmc.id },
    update: {},
    create: {
      tenantId: fmc.id,
      companyName: 'FundMyCampus',
      industry: 'Education Loan Consulting',
      brandTone: 'Professional, helpful, and student-friendly. Simplify complex financial topics.',
      targetAudience: 'Students and parents looking for education loans in India',
      writingGuidelines: 'Use conversational tone. Include specific ₹ amounts, interest rates, and bank names. Write like a knowledgeable friend.',
      seoPreferences: {
        focusOnLongTail: true,
        minWordCount: 1200,
        maxWordCount: 1600,
      },
      defaultAuthor: 'FundMyCampus Team',
      contentRules: [
        'Include at least one comparison table',
        'Add a real-life example with Indian names and ₹ amounts',
        'Include a People Also Ask section',
        'End with a natural mention of FundMyCampus',
      ],
    },
  });

  console.log(`Brand profile created: FundMyCampus`);

  // ---- Admitverse ----
  const admitverse = await prisma.tenant.upsert({
    where: { slug: 'admitverse' },
    update: {},
    create: {
      name: 'Admitverse',
      slug: 'admitverse',
      apiKey: `tak_${crypto.randomBytes(24).toString('hex')}`,
      isActive: true,
    },
  });

  console.log(`Tenant created: ${admitverse.name} (API Key: ${admitverse.apiKey})`);

  await prisma.brandProfile.upsert({
    where: { tenantId: admitverse.id },
    update: {},
    create: {
      tenantId: admitverse.id,
      companyName: 'Admitverse',
      industry: 'Foreign Studies',
      brandTone: 'Professional',
      targetAudience: 'Students',
      writingGuidelines: '',
      seoPreferences: {},
      defaultAuthor: "Admitverse's Team",
      contentRules: [],
    },
  });

  console.log(`Brand profile created: Admitverse`);

  // Add Notion connection for Admitverse (credentials from env vars)
  const admitverseNotionToken = process.env.ADMITVERSE_NOTION_TOKEN;
  const admitverseNotionDbId = process.env.ADMITVERSE_NOTION_DB_ID;

  if (admitverseNotionToken && admitverseNotionDbId) {
    const existingConn = await prisma.cMSConnection.findFirst({
      where: { tenantId: admitverse.id, provider: 'notion' },
    });

    if (!existingConn) {
      await prisma.cMSConnection.create({
        data: {
          tenantId: admitverse.id,
          provider: 'notion',
          accessToken: admitverseNotionToken,
          contentDatabaseId: admitverseNotionDbId,
          triggerDatabaseId: '',
          config: {},
          isActive: true,
        },
      });
      console.log(`Notion connection created for Admitverse`);
    }
  } else {
    console.log(`Skipping Admitverse Notion connection (set ADMITVERSE_NOTION_TOKEN and ADMITVERSE_NOTION_DB_ID)`);
  }

  console.log('\nSeed completed successfully!');
  console.log(`\nAPI Keys:`);
  console.log(`  Acme Tech:     ${acme.apiKey}`);
  console.log(`  FundMyCampus:  ${fmc.apiKey}`);
  console.log(`  Admitverse:    ${admitverse.apiKey}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
