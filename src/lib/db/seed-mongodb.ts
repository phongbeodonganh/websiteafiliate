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
  console.log('Connected to MongoDB Atlas. Seeding database with AI Categories & Use-Cases...');

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
  
  // Category 0 (Top Priority Category placed at the very top)
  const catUseCases = await CategoryModel.create({
    name: 'AI Use Cases',
    slug: 'ai-use-cases',
    description: 'Real-world AI deployment workflows and ROI case studies across Creators, Real Estate, E-commerce, Marketing, and Operations.',
  });

  const subUcCreators = await SubCategoryModel.create({
    category_id: catUseCases._id,
    name: 'AI for Creators & Media',
    slug: 'ai-for-creators-media',
  });

  const subUcRealEstate = await SubCategoryModel.create({
    category_id: catUseCases._id,
    name: 'AI for Real Estate & Sales',
    slug: 'ai-for-real-estate-sales',
  });

  const subUcEcom = await SubCategoryModel.create({
    category_id: catUseCases._id,
    name: 'AI for E-commerce & Online Business',
    slug: 'ai-for-e-commerce-online-business',
  });

  const subUcMarketers = await SubCategoryModel.create({
    category_id: catUseCases._id,
    name: 'AI for Marketers & Agencies',
    slug: 'ai-for-marketers-agencies',
  });

  const subUcOperations = await SubCategoryModel.create({
    category_id: catUseCases._id,
    name: 'AI for Operations & Productivity',
    slug: 'ai-for-operations-productivity',
  });

  // Category 1: AI Content & Copywriting
  const catContent = await CategoryModel.create({
    name: 'AI Content & Copywriting',
    slug: 'ai-content-copywriting',
    description: 'AI writing assistants, SEO content optimization tools, and automated ad copy generators.',
  });

  const subWriting = await SubCategoryModel.create({
    category_id: catContent._id,
    name: 'AI Blog & Article Writers',
    slug: 'ai-blog-article-writers',
  });

  const subSeo = await SubCategoryModel.create({
    category_id: catContent._id,
    name: 'AI SEO & Content Optimization',
    slug: 'ai-seo-content-optimization',
  });

  const subSocial = await SubCategoryModel.create({
    category_id: catContent._id,
    name: 'AI Social Media & Ad Copy',
    slug: 'ai-social-ad-copy',
  });

  // Category 2: AI Visual & Video Generation
  const catVisual = await CategoryModel.create({
    name: 'AI Visual & Video Generation',
    slug: 'ai-visual-video-generation',
    description: 'AI image art generators, digital avatar creators, video editing, and graphic tools.',
  });

  const subImage = await SubCategoryModel.create({
    category_id: catVisual._id,
    name: 'AI Image & Art Generators',
    slug: 'ai-image-art-generators',
  });

  const subVideo = await SubCategoryModel.create({
    category_id: catVisual._id,
    name: 'AI Video Creators & Avatars',
    slug: 'ai-video-creators-avatars',
  });

  const subPhoto = await SubCategoryModel.create({
    category_id: catVisual._id,
    name: 'AI Photo & Graphic Enhancers',
    slug: 'ai-photo-graphic-enhancers',
  });

  // Category 3: AI Audio, Voice & Music
  const catAudio = await CategoryModel.create({
    name: 'AI Audio, Voice & Music',
    slug: 'ai-audio-voice-music',
    description: 'Text-to-speech voice cloning, AI music synthesis, and studio podcast editors.',
  });

  const subVoice = await SubCategoryModel.create({
    category_id: catAudio._id,
    name: 'Text-to-Speech & Voice Cloning',
    slug: 'text-to-speech-voice-cloning',
  });

  const subMusic = await SubCategoryModel.create({
    category_id: catAudio._id,
    name: 'AI Music & Podcast Editors',
    slug: 'ai-music-podcast-editors',
  });

  // Category 4: AI Coding & Developer Tools
  const catCoding = await CategoryModel.create({
    name: 'AI Coding & Developer Tools',
    slug: 'ai-coding-developer-tools',
    description: 'AI code assistants, autonomous dev agents, LLM APIs, and cloud vector databases.',
  });

  const subCode = await SubCategoryModel.create({
    category_id: catCoding._id,
    name: 'AI Code Assistants & IDEs',
    slug: 'ai-code-assistants-ides',
  });

  const subApi = await SubCategoryModel.create({
    category_id: catCoding._id,
    name: 'AI APIs, Cloud & Vector DBs',
    slug: 'ai-apis-cloud-vector-dbs',
  });

  // Category 5: AI Productivity & Automation
  const catProductivity = await CategoryModel.create({
    name: 'AI Productivity & Automation',
    slug: 'ai-productivity-automation',
    description: 'AI search engines, workflow agent automations, smart note-taking, and research tools.',
  });

  const subChat = await SubCategoryModel.create({
    category_id: catProductivity._id,
    name: 'AI Chatbots & Search Engines',
    slug: 'ai-chatbots-search-engines',
  });

  const subAutomation = await SubCategoryModel.create({
    category_id: catProductivity._id,
    name: 'AI Workflow & Agent Automation',
    slug: 'ai-workflow-agent-automation',
  });

  const subNotes = await SubCategoryModel.create({
    category_id: catProductivity._id,
    name: 'AI Notes & Research Assistants',
    slug: 'ai-notes-research-assistants',
  });

  // 3. Seed Top AI Affiliate Picks
  const affHeyGen = await AffiliateLinkModel.create({
    name: 'HeyGen Avatar Presenters',
    base_url: 'https://heygen.com/?sid=affiliate202',
    commission: '20% Recurring Commission',
    cookie: '30 Days',
    is_top_pick: true,
  });

  const affJasper = await AffiliateLinkModel.create({
    name: 'Jasper AI Copywriter',
    base_url: 'https://jasper.ai/?fpr=affiliate123',
    commission: '30% Recurring Commission',
    cookie: '30 Days',
    is_top_pick: true,
  });

  const affElevenLabs = await AffiliateLinkModel.create({
    name: 'ElevenLabs Voice AI',
    base_url: 'https://elevenlabs.io/?from=affiliate456',
    commission: '30% Recurring Commission',
    cookie: '60 Days',
    is_top_pick: true,
  });

  const affCursor = await AffiliateLinkModel.create({
    name: 'Cursor AI Code Editor',
    base_url: 'https://cursor.com/?ref=affiliate789',
    commission: '20% Recurring Commission',
    cookie: '30 Days',
    is_top_pick: true,
  });

  const affSurfer = await AffiliateLinkModel.create({
    name: 'Surfer SEO AI',
    base_url: 'https://surferseo.com/?fpr=affiliate101',
    commission: '25% Recurring Commission',
    cookie: '60 Days',
    is_top_pick: true,
  });

  // 4. Seed Articles
  const article1 = await ArticleModel.create({
    author_id: editorJohn._id,
    category_id: catUseCases._id,
    sub_category_id: subUcCreators._id,
    title: 'Case Study: Faceless YouTube Automation with AI Avatars & Voice Synthesis',
    slug: 'case-study-faceless-youtube-automation-ai-avatars',
    excerpt: 'How creators are scaling automated faceless YouTube channels using AI scriptwriters, voice synthesis, and automated video editors.',
    content: '<p>Building a faceless YouTube channel is one of the highest ROI content business models in 2026. Learn how to connect ChatGPT, ElevenLabs, and Runway ML to produce daily video uploads on autopilot.</p>',
    status: 'published',
    is_featured: true,
    view_count: 64200,
    revenue: 4120,
    meta_title: 'Faceless YouTube Automation Case Study 2026',
    meta_description: 'Complete case study on building automated faceless YouTube channels using top AI tools.',
    thumbnail_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
  });

  const article2 = await ArticleModel.create({
    author_id: editorJohn._id,
    category_id: catUseCases._id,
    sub_category_id: subUcRealEstate._id,
    title: 'Real Estate Case Study: Automating Lead Distribution & Virtual Staging with AI',
    slug: 'real-estate-case-study-automating-lead-distribution-virtual-staging',
    excerpt: 'How to automate client lead routing using n8n, OpenAI API, and Google Sheets to increase real estate closing rates by 45%.',
    content: '<p>Speed-to-lead is critical in real estate sales. By implementing automated lead enrichment and CRM distribution, agencies instantly qualify leads 24/7.</p>',
    status: 'published',
    is_featured: true,
    view_count: 29800,
    revenue: 1850,
    meta_title: 'AI Real Estate Lead Distribution & Virtual Staging Case Study',
    meta_description: 'Automate lead scoring and virtual staging for real estate teams using n8n and AI.',
    thumbnail_url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=1200&auto=format&fit=crop',
  });

  const article3 = await ArticleModel.create({
    author_id: authorSarah._id,
    category_id: catContent._id,
    sub_category_id: subWriting._id,
    title: 'Jasper AI vs Copy.ai Review 2026: Best AI Copywriter for Content Creators',
    slug: 'jasper-ai-vs-copy-ai-review-2026',
    excerpt: 'Comparing brand voice features, SEO integrations, long-form content generation speed, and team collaboration plans.',
    content: '<p>Both Jasper AI and Copy.ai have evolved into full-fledged marketing hubs. We benchmarked their output quality across 50 real-world content briefs.</p>',
    status: 'published',
    is_featured: true,
    view_count: 31800,
    revenue: 1240,
    meta_title: 'Jasper AI vs Copy.ai Review 2026',
    meta_description: 'In-depth comparison of Jasper AI and Copy.ai for bloggers and affiliate marketers.',
    thumbnail_url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=1200&auto=format&fit=crop',
  });

  const article4 = await ArticleModel.create({
    author_id: authorSarah._id,
    category_id: catCoding._id,
    sub_category_id: subCode._id,
    title: 'Cursor AI vs GitHub Copilot: Which AI Coding Assistant Will Boost Your Productivity?',
    slug: 'cursor-ai-vs-github-copilot-comparison',
    excerpt: 'Comparing multi-file code editing, context-aware codebase indexing, Claude 3.5 Sonnet integration, and auto-debugging.',
    content: '<p>AI pair programming has transformed software development. Cursor AI introduces agentic codebase edits that outpace traditional line completion.</p>',
    status: 'published',
    is_featured: false,
    view_count: 41200,
    revenue: 2100,
    meta_title: 'Cursor AI vs GitHub Copilot 2026',
    meta_description: 'Comprehensive evaluation of Cursor AI vs GitHub Copilot for developers and engineering teams.',
    thumbnail_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop',
  });

  const article5 = await ArticleModel.create({
    author_id: editorJohn._id,
    category_id: catProductivity._id,
    sub_category_id: subChat._id,
    title: 'Perplexity Pro vs ChatGPT Plus: In-Depth Comparison of AI Search & Chat Assistants',
    slug: 'perplexity-pro-vs-chatgpt-plus-comparison',
    excerpt: 'Evaluating real-time web citation accuracy, Deep Research agents, image generation, and workflow integrations.',
    content: '<p>Choosing between ChatGPT Plus and Perplexity Pro depends on whether your priority is creative synthesis or cited web research.</p>',
    status: 'published',
    is_featured: false,
    view_count: 36500,
    revenue: 1450,
    meta_title: 'Perplexity Pro vs ChatGPT Plus 2026',
    meta_description: 'Comparison of Perplexity Pro and ChatGPT Plus features, pricing, and search capabilities.',
    thumbnail_url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1200&auto=format&fit=crop',
  });

  // 5. Seed Article-Affiliate Relations
  await ArticleAffiliateRelationModel.create({
    article_id: article1._id,
    affiliate_link_id: affHeyGen._id,
    position_label: 'top_cta',
  });
  await ArticleAffiliateRelationModel.create({
    article_id: article1._id,
    affiliate_link_id: affElevenLabs._id,
    position_label: 'middle_comparison',
  });
  await ArticleAffiliateRelationModel.create({
    article_id: article3._id,
    affiliate_link_id: affJasper._id,
    position_label: 'top_cta',
  });
  await ArticleAffiliateRelationModel.create({
    article_id: article3._id,
    affiliate_link_id: affSurfer._id,
    position_label: 'middle_comparison',
  });
  await ArticleAffiliateRelationModel.create({
    article_id: article4._id,
    affiliate_link_id: affCursor._id,
    position_label: 'top_cta',
  });

  // 6. Seed Subscribers
  await SubscriberModel.create({ email: 'creator@aistudio.io' });
  await SubscriberModel.create({ email: 'agency@digitalmarketing.com' });

  // 7. Seed Site Settings
  await SettingModel.create({
    site_title: 'AIDEALSUK',
    metaDescription:
      'Discover top AI tool categories, real-world AI use-case case studies, high-paying affiliate programs, and revenue automation strategies.',
    focusKeywords: 'ai use-cases, ai case studies, ai affiliate programs, ai content copywriting, ai coding tools',
    canonicalUrl: 'https://aidealsuk.com',
    hreflang: 'en-US',
    geoTarget: 'GLOBAL',
    businessName: 'AIDEALSUK Ltd',
    businessAddress: '500 Innovation Way, Suite 300, San Francisco, CA 94105, USA',
    businessPhone: '+1 (800) 555-0188',
    ogImageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    schemaJsonld: JSON.stringify({ '@context': 'https://schema.org', '@type': 'NewsMediaOrganization' }, null, 2),
    headScripts: '<!-- Google Tag Manager -->',
    primary_color: '#0f172a',
    accent_color: '#3b82f6',
    theme_mode: 'dark',
    font_family: 'Inter',
  });

  console.log('Successfully seeded MongoDB Atlas with AI Categories & Use-Cases dataset!');
}

if (typeof require !== 'undefined' && require.main === module) {
  seedMongoDB()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Failed to seed MongoDB Atlas:', err);
      process.exit(1);
    });
}

