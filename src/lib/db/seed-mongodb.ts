import { connectToDatabase } from './mongodb';
import {
  UserModel,
  CategoryModel,
  SubCategoryModel,
  ArticleModel,
  AffiliateLinkModel,
  ArticleAffiliateRelationModel,
  SubscriberModel,
  SettingModel,
  ClickLogModel,
} from './models';
import { hashPassword } from '../auth';

export async function seedMongoDB() {
  await connectToDatabase();
  console.log('Connected to MongoDB Atlas. Seeding database...');

  // Clear existing collections
  await UserModel.deleteMany({});
  await CategoryModel.deleteMany({});
  await SubCategoryModel.deleteMany({});
  await ArticleModel.deleteMany({});
  await AffiliateLinkModel.deleteMany({});
  await ArticleAffiliateRelationModel.deleteMany({});
  await SubscriberModel.deleteMany({});
  await SettingModel.deleteMany({});
  await ClickLogModel.deleteMany({});

  // 1. Seed Users
  const defaultPass = await hashPassword('password123');

  const adminUser = await UserModel.create({
    username: 'admin',
    password_hash: defaultPass,
    role: 'admin',
    name: 'Global Administrator',
    status: 'active',
    avatar: 'A',
  });

  const editorJohn = await UserModel.create({
    username: 'editor_john',
    password_hash: defaultPass,
    role: 'editor',
    name: 'John Miller',
    status: 'active',
    avatar: 'J',
  });

  const authorSarah = await UserModel.create({
    username: 'author_sarah',
    password_hash: defaultPass,
    role: 'author',
    name: 'Sarah Jenkins',
    status: 'active',
    avatar: 'S',
  });

  // 2. Seed Categories & Sub-Categories
  const catFinance = await CategoryModel.create({
    name: 'Finance & Crypto',
    slug: 'finance-crypto',
    description: 'Crypto technical analysis, market updates, and investment funds.',
  });

  const catTech = await CategoryModel.create({
    name: 'Cloud & Tech Tools',
    slug: 'cloud-tech-tools',
    description: 'High-performance cloud VPS, cybersecurity, and hardware reviews.',
  });

  const subCrypto = await SubCategoryModel.create({
    category_id: catFinance._id,
    name: 'Cryptocurrency & Web3',
    slug: 'crypto-web3',
  });

  const subFunds = await SubCategoryModel.create({
    category_id: catFinance._id,
    name: 'Investment Funds & Stocks',
    slug: 'funds-stocks',
  });

  const subCloud = await SubCategoryModel.create({
    category_id: catTech._id,
    name: 'Cloud VPS & Hosting',
    slug: 'cloud-vps-hosting',
  });

  const subSecurity = await SubCategoryModel.create({
    category_id: catTech._id,
    name: 'Hardware & Security',
    slug: 'hardware-security',
  });

  // 3. Seed Top Affiliate Picks
  const affBinance = await AffiliateLinkModel.create({
    name: 'Binance Exchange',
    base_url: 'https://binance.com/en/register?ref=123',
    commission: '40% Trading Fee Rebate',
    cookie: 'Lifetime',
    is_top_pick: true,
  });

  const affVultr = await AffiliateLinkModel.create({
    name: 'Vultr Cloud Compute',
    base_url: 'https://vultr.com/?ref=456',
    commission: '$25 Free Credit + CPA',
    cookie: '30 Days',
    is_top_pick: true,
  });

  const affTrezor = await AffiliateLinkModel.create({
    name: 'Trezor Hardware Wallet',
    base_url: 'https://trezor.io/?ref=789',
    commission: '12% Commission / Sale',
    cookie: '90 Days',
    is_top_pick: true,
  });

  // 4. Seed Articles
  const article1 = await ArticleModel.create({
    author_id: editorJohn._id,
    category_id: catFinance._id,
    sub_category_id: subCrypto._id,
    title: 'Bitcoin Q4 2026 Price Target & In-Depth Technical Analysis',
    slug: 'bitcoin-q4-2026-price-target-technical-analysis',
    excerpt: 'Detailed Elliott wave analysis and institutional capital inflow indicators for Bitcoin heading into Q4 2026.',
    content: '<p>The global crypto market is entering a major macro cycle phase. On-chain metrics point to strong accumulation.</p>',
    status: 'published',
    is_featured: true,
    view_count: 48920,
    revenue: 1850,
    meta_title: 'Bitcoin Q4 2026 Target Analysis',
    meta_description: 'Complete institutional Bitcoin Q4 2026 technical breakdown.',
    thumbnail_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
  });

  const article2 = await ArticleModel.create({
    author_id: editorJohn._id,
    category_id: catFinance._id,
    sub_category_id: subCrypto._id,
    title: 'Top 5 Most Reliable Global Crypto Exchanges Reviewed (2026)',
    slug: 'top-5-reliable-global-crypto-exchanges-reviewed-2026',
    excerpt: 'An objective breakdown of liquidity, security track records, compliance standards, and fee structures.',
    content: '<p>Selecting a regulated exchange is critical for retail and institutional traders alike.</p>',
    status: 'published',
    is_featured: true,
    view_count: 22400,
    revenue: 650,
    meta_title: 'Top 5 Global Crypto Exchanges Reviewed',
    meta_description: 'In-depth security and fee review of global crypto exchanges.',
    thumbnail_url: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?q=80&w=1200&auto=format&fit=crop',
  });

  const article3 = await ArticleModel.create({
    author_id: authorSarah._id,
    category_id: catTech._id,
    sub_category_id: subCloud._id,
    title: 'High-Performance Cloud Infrastructure for Affiliate Marketers',
    slug: 'high-performance-cloud-infrastructure-affiliate-marketers',
    excerpt: 'How to deploy ultra-low latency Cloud VPS servers to handle millions of ad impressions with 99.99% uptime.',
    content: '<p>Ad campaign conversions depend heavily on server response time (TTFB < 100ms).</p>',
    status: 'published',
    is_featured: false,
    view_count: 31200,
    revenue: 920,
    meta_title: 'High-Performance Cloud Infrastructure',
    meta_description: 'Deploy low-latency Cloud VPS servers for high-volume advertising campaigns.',
    thumbnail_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1200&auto=format&fit=crop',
  });

  const article4 = await ArticleModel.create({
    author_id: authorSarah._id,
    category_id: catTech._id,
    sub_category_id: subSecurity._id,
    title: 'Hardware Wallet Security Audit: Protecting Assets from Phishing',
    slug: 'hardware-wallet-security-audit-protecting-assets',
    excerpt: 'A deep dive into cold storage seed phrase encryption, multi-sig setups, and air-gapped security protocols.',
    content: '<p>Self-custody is the ultimate defense against central exchange failures.</p>',
    status: 'published',
    is_featured: true,
    view_count: 18900,
    revenue: 410,
    meta_title: 'Hardware Wallet Security Audit 2026',
    meta_description: 'Learn how to secure your digital assets using hardware wallets.',
    thumbnail_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1200&auto=format&fit=crop',
  });

  const article5 = await ArticleModel.create({
    author_id: editorJohn._id,
    category_id: catFinance._id,
    sub_category_id: subFunds._id,
    title: 'Global REITs vs Digital Assets: Portfolio Diversification Guide',
    slug: 'global-reits-vs-digital-assets-portfolio-guide',
    excerpt: 'Comparing dividend yields, inflation hedging capabilities, and risk-adjusted returns across traditional assets.',
    content: '<p>Diversifying across real estate investment trusts and digital stores of value.</p>',
    status: 'published',
    is_featured: false,
    view_count: 14200,
    revenue: 310,
    meta_title: 'Global REITs vs Digital Assets Guide',
    meta_description: 'Portfolio diversification guide for modern retail investors.',
    thumbnail_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop',
  });

  // 5. Seed Article-Affiliate Relations
  await ArticleAffiliateRelationModel.create({
    article_id: article1._id,
    affiliate_link_id: affBinance._id,
    position_label: 'top_cta',
  });
  await ArticleAffiliateRelationModel.create({
    article_id: article1._id,
    affiliate_link_id: affTrezor._id,
    position_label: 'middle_comparison',
  });
  await ArticleAffiliateRelationModel.create({
    article_id: article2._id,
    affiliate_link_id: affBinance._id,
    position_label: 'top_cta',
  });
  await ArticleAffiliateRelationModel.create({
    article_id: article3._id,
    affiliate_link_id: affVultr._id,
    position_label: 'middle_comparison',
  });

  // 6. Seed Subscribers
  await SubscriberModel.create({ email: 'investor@wallstreet.com' });
  await SubscriberModel.create({ email: 'trader.alex@gmail.com' });

  // 7. Seed Settings
  await SettingModel.create({
    site_title: 'NEXUS FINANCE GLOBAL',
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
    primary_color: '#0f172a',
    accent_color: '#f59e0b',
    theme_mode: 'dark',
    font_family: 'Inter',
  });

  console.log('Successfully seeded MongoDB Atlas!');
  process.exit(0);
}

seedMongoDB().catch((err) => {
  console.error('Failed to seed MongoDB Atlas:', err);
  process.exit(1);
});
