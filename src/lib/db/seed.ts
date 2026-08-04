import { db, initDb } from './index';
import {
  users,
  categories,
  subCategories,
  articles,
  affiliateLinks,
  articleAffiliateRelations,
  settings,
  clickLogs,
  subscribers,
} from './schema';
import { hashPassword } from '../auth';

export async function seedDatabase() {
  initDb();

  console.log('Seeding expanded V4.0 database with Top Picks, Subscribers, and Multiple Niche Articles...');

  try {
    await db.delete(clickLogs);
    await db.delete(articleAffiliateRelations);
    await db.delete(articles);
    await db.delete(subCategories);
    await db.delete(categories);
    await db.delete(affiliateLinks);
    await db.delete(users);
    await db.delete(subscribers);
    await db.delete(settings);
  } catch (err) {
    console.log('First time seeding V4.0 expanded...');
  }

  // 1. Seed Users
  const defaultPass = await hashPassword('password123');

  const [adminUser] = await db
    .insert(users)
    .values({
      username: 'admin',
      passwordHash: defaultPass,
      role: 'admin',
      name: 'Global Administrator',
      status: 'active',
      avatar: 'A',
    })
    .returning();

  const [editorJohn] = await db
    .insert(users)
    .values({
      username: 'editor_john',
      passwordHash: defaultPass,
      role: 'editor',
      name: 'John Miller',
      status: 'active',
      avatar: 'J',
    })
    .returning();

  const [authorSarah] = await db
    .insert(users)
    .values({
      username: 'author_sarah',
      passwordHash: defaultPass,
      role: 'author',
      name: 'Sarah Jenkins',
      status: 'active',
      avatar: 'S',
    })
    .returning();

  // 2. Seed Categories & Sub-Categories
  const [catFinance] = await db
    .insert(categories)
    .values({ name: 'Finance & Crypto', slug: 'finance-crypto' })
    .returning();

  const [catTech] = await db
    .insert(categories)
    .values({ name: 'Cloud & Tech Tools', slug: 'cloud-tech-tools' })
    .returning();

  const [subCrypto] = await db
    .insert(subCategories)
    .values({ categoryId: catFinance.id, name: 'Cryptocurrency & Web3', slug: 'crypto-web3' })
    .returning();

  const [subFunds] = await db
    .insert(subCategories)
    .values({ categoryId: catFinance.id, name: 'Investment Funds & Stocks', slug: 'funds-stocks' })
    .returning();

  const [subCloud] = await db
    .insert(subCategories)
    .values({ categoryId: catTech.id, name: 'Cloud VPS & Hosting', slug: 'cloud-vps-hosting' })
    .returning();

  const [subSecurity] = await db
    .insert(subCategories)
    .values({ categoryId: catTech.id, name: 'Hardware & Security', slug: 'hardware-security' })
    .returning();

  // 3. Seed Top Affiliate Picks (Editor's Choice)
  const [affBinance] = await db
    .insert(affiliateLinks)
    .values({
      name: 'Binance Exchange',
      baseUrl: 'https://binance.com/en/register?ref=123',
      commission: '40% Trading Fee Rebate',
      cookie: 'Lifetime',
      isTopPick: true,
    })
    .returning();

  const [affVultr] = await db
    .insert(affiliateLinks)
    .values({
      name: 'Vultr Cloud Compute',
      baseUrl: 'https://vultr.com/?ref=456',
      commission: '$25 Free Credit + CPA',
      cookie: '30 Days',
      isTopPick: true,
    })
    .returning();

  const [affTrezor] = await db
    .insert(affiliateLinks)
    .values({
      name: 'Trezor Hardware Wallet',
      baseUrl: 'https://trezor.io/?ref=789',
      commission: '12% Commission / Sale',
      cookie: '90 Days',
      isTopPick: true,
    })
    .returning();

  // 4. Seed Multiple Articles for Grid Pagination & Niche Rows
  const articleValues = [
    {
      authorId: editorJohn.id,
      categoryId: catFinance.id,
      subCategoryId: subCrypto.id,
      title: 'Bitcoin Q4 2026 Price Target & In-Depth Technical Analysis',
      slug: 'bitcoin-q4-2026-price-target-technical-analysis',
      excerpt: 'Detailed Elliott wave analysis and institutional capital inflow indicators for Bitcoin heading into Q4 2026.',
      content: '<p>The global crypto market is entering a major macro cycle phase. On-chain metrics point to strong accumulation.</p>',
      status: 'published' as const,
      isFeatured: true,
      viewCount: 48920,
      revenue: 1850,
      metaTitle: 'Bitcoin Q4 2026 Target Analysis',
      metaDescription: 'Complete institutional Bitcoin Q4 2026 technical breakdown.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
    },
    {
      authorId: editorJohn.id,
      categoryId: catFinance.id,
      subCategoryId: subCrypto.id,
      title: 'Top 5 Most Reliable Global Crypto Exchanges Reviewed (2026)',
      slug: 'top-5-reliable-global-crypto-exchanges-reviewed-2026',
      excerpt: 'An objective breakdown of liquidity, security track records, compliance standards, and fee structures.',
      content: '<p>Selecting a regulated exchange is critical for retail and institutional traders alike.</p>',
      status: 'published' as const,
      isFeatured: true,
      viewCount: 22400,
      revenue: 650,
      metaTitle: 'Top 5 Global Crypto Exchanges Reviewed',
      metaDescription: 'In-depth security and fee review of global crypto exchanges.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=1200&auto=format&fit=crop',
    },
    {
      authorId: authorSarah.id,
      categoryId: catTech.id,
      subCategoryId: subCloud.id,
      title: 'High-Performance Cloud Infrastructure for Affiliate Marketers',
      slug: 'high-performance-cloud-infrastructure-affiliate-marketers',
      excerpt: 'How to deploy ultra-low latency Cloud VPS servers to handle millions of ad impressions with 99.99% uptime.',
      content: '<p>Ad campaign conversions depend heavily on server response time (TTFB < 100ms).</p>',
      status: 'published' as const,
      isFeatured: false,
      viewCount: 31200,
      revenue: 920,
      metaTitle: 'High-Performance Cloud Infrastructure',
      metaDescription: 'Deploy low-latency Cloud VPS servers for high-volume advertising campaigns.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop',
    },
    {
      authorId: authorSarah.id,
      categoryId: catTech.id,
      subCategoryId: subSecurity.id,
      title: 'Hardware Wallet Security Audit: Protecting Assets from Phishing',
      slug: 'hardware-wallet-security-audit-protecting-assets',
      excerpt: 'A deep dive into cold storage seed phrase encryption, multi-sig setups, and air-gapped security protocols.',
      content: '<p>Self-custody is the ultimate defense against central exchange failures.</p>',
      status: 'published' as const,
      isFeatured: true,
      viewCount: 18900,
      revenue: 410,
      metaTitle: 'Hardware Wallet Security Audit 2026',
      metaDescription: 'Learn how to secure your digital assets using hardware wallets.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1200&auto=format&fit=crop',
    },
    {
      authorId: editorJohn.id,
      categoryId: catFinance.id,
      subCategoryId: subFunds.id,
      title: 'Global REITs vs Digital Assets: Portfolio Diversification Guide',
      slug: 'global-reits-vs-digital-assets-portfolio-guide',
      excerpt: 'Comparing dividend yields, inflation hedging capabilities, and risk-adjusted returns across traditional assets.',
      content: '<p>Diversifying across real estate investment trusts and digital stores of value.</p>',
      status: 'published' as const,
      isFeatured: false,
      viewCount: 14200,
      revenue: 310,
      metaTitle: 'Global REITs vs Digital Assets Guide',
      metaDescription: 'Portfolio diversification guide for modern retail investors.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
    },
    {
      authorId: authorSarah.id,
      categoryId: catTech.id,
      subCategoryId: subCloud.id,
      title: 'Scaling Web3 Applications with Enterprise Kubernetes Clusters',
      slug: 'scaling-web3-applications-enterprise-kubernetes',
      excerpt: 'Architecting auto-scaling container environments for decentralized RPC nodes and high-frequency indexing.',
      content: '<p>Container orchestration enables zero-downtime deployments for global dApps.</p>',
      status: 'published' as const,
      isFeatured: false,
      viewCount: 9800,
      revenue: 220,
      metaTitle: 'Scaling Web3 Applications with Kubernetes',
      metaDescription: 'Enterprise Kubernetes cluster setups for Web3 developers.',
      thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200&auto=format&fit=crop',
    },
  ];

  const seededArticles = [];
  for (const artVal of articleValues) {
    const [art] = await db.insert(articles).values(artVal).returning();
    seededArticles.push(art);
  }

  // 5. Seed Article-Affiliate Relations
  await db.insert(articleAffiliateRelations).values([
    { articleId: seededArticles[0].id, affiliateLinkId: affBinance.id, positionLabel: 'top_cta' },
    { articleId: seededArticles[0].id, affiliateLinkId: affTrezor.id, positionLabel: 'middle_comparison' },
    { articleId: seededArticles[1].id, affiliateLinkId: affBinance.id, positionLabel: 'top_cta' },
    { articleId: seededArticles[2].id, affiliateLinkId: affVultr.id, positionLabel: 'middle_comparison' },
  ]);

  // 6. Seed Subscribers
  await db.insert(subscribers).values([
    { email: 'investor@wallstreet.com' },
    { email: 'trader.alex@gmail.com' },
  ]);

  // 7. Seed Settings
  await db.insert(settings).values({
    id: 1,
    siteTitle: 'NEXUS FINANCE GLOBAL',
    metaDescription:
      'Empowering global investors with institutional crypto research, financial insights, and exclusive partner deals.',
    focusKeywords: 'crypto research, global finance, bitcoin technical analysis, affiliate deals, cloud hosting',
    canonicalUrl: 'https://nexusfinance.global',
    hreflang: 'en-US',
    geoTarget: 'GLOBAL',
    businessName: 'Nexus Finance Global LLC',
    businessAddress: '100 Wall Street, Suite 2400, New York, NY 10005, USA',
    businessPhone: '+1 (800) 555-0199',
    ogImageUrl: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=1200&auto=format&fit=crop',
    schemaJsonld: JSON.stringify({ '@context': 'https://schema.org', '@type': 'NewsMediaOrganization' }, null, 2),
    headScripts: '<!-- Google Tag Manager -->',
  });

  console.log('Seeded expanded V4.0 database successfully!');
}

seedDatabase();
