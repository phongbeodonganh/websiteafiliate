import mongoose from 'mongoose';
import { connectToDatabase } from '../src/lib/db/mongodb';
import {
  AffiliateLinkModel,
  CategoryModel,
  SubCategoryModel,
  ArticleModel,
  UserModel,
} from '../src/lib/db/models';

async function upsertCategory(name: string, slug: string, description: string) {
  const existing = await CategoryModel.findOne({ slug });
  if (existing) return existing;
  return CategoryModel.create({ name, slug, description });
}

async function upsertSubCategory(categoryId: any, name: string, slug: string) {
  const existing = await SubCategoryModel.findOne({ slug });
  if (existing) return existing;
  return SubCategoryModel.create({ category_id: categoryId, name, slug });
}

async function upsertAffiliateLink(id: string, data: {
  name: string;
  base_url: string;
  commission: string;
  cookie: string;
  is_top_pick: boolean;
  created_at: Date;
}) {
  return AffiliateLinkModel.findByIdAndUpdate(
    id,
    { $set: data },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function main() {
  await connectToDatabase();

  const admin = await UserModel.findOne({ role: 'admin' });
  if (!admin) throw new Error('No admin user found. Create one first.');

  // 1. Affiliate links (only the two NOT marked blacklisted in the source CSV)
  const elevenLabs = await upsertAffiliateLink('6a71b7551827086f47552b40', {
    name: 'ElevenLabs Voice AI',
    base_url: 'https://elevenlabs.io/?from=affiliate456',
    commission: '30% Recurring Commission',
    cookie: '60 Days',
    is_top_pick: true,
    created_at: new Date('2026-08-04T09:56:37.798Z'),
  });

  const cursor = await upsertAffiliateLink('6a71b7551827086f47552b41', {
    name: 'Cursor AI Code Editor',
    base_url: 'https://cursor.com/?ref=affiliate789',
    commission: '20% Recurring Commission',
    cookie: '30 Days',
    is_top_pick: true,
    created_at: new Date('2026-08-04T09:56:37.848Z'),
  });

  console.log('Upserted affiliate links:', elevenLabs.name, '/', cursor.name);

  // 2. Categories
  const catCoding = await upsertCategory(
    'AI Coding & Developer Tools',
    'ai-coding-developer-tools',
    'AI code assistants, autonomous dev agents, and IDE integrations.'
  );
  const subCodeAssistants = await upsertSubCategory(
    catCoding._id,
    'AI Code Assistants & IDEs',
    'ai-code-assistants-ides'
  );

  const catAudio = await upsertCategory(
    'AI Audio, Voice & Music',
    'ai-audio-voice-music',
    'Text-to-speech, voice cloning, and AI audio production tools.'
  );
  const subVoice = await upsertSubCategory(
    catAudio._id,
    'Text-to-Speech & Voice Cloning',
    'text-to-speech-voice-cloning'
  );

  // 3. Review articles with affiliate CTA placements
  const articles = [
    {
      author_id: admin._id,
      category_id: catCoding._id,
      sub_category_id: subCodeAssistants._id,
      title: 'Cursor AI Code Editor Review 2026: Features, Pricing & Is It Worth It?',
      slug: 'cursor-ai-code-editor-review-2026',
      excerpt:
        'Cursor pairs a familiar VS Code-style editor with an agentic AI that can read your whole codebase, write multi-file changes, and fix its own errors. Here is how it actually performs.',
      content: `<p><strong>Cursor</strong> is an AI-first code editor built as a fork of VS Code, designed around an agentic coding assistant rather than simple line-by-line autocomplete. Instead of just suggesting the next few tokens, Cursor's agent mode can read multiple files across a project, plan a change, edit several files at once, run the result, and iterate on errors.</p>

<h2>Key Features</h2>
<ul>
<li><strong>Agent Mode:</strong> Give Cursor a task in plain language and it can search the codebase, propose a multi-file diff, and apply it after your review.</li>
<li><strong>Codebase-Aware Chat:</strong> Ask questions about your project and get answers grounded in your actual files, not generic documentation.</li>
<li><strong>Inline Predictive Edits:</strong> Goes beyond autocomplete by predicting the next logical edit as you work through a file.</li>
<li><strong>Model Flexibility:</strong> Supports multiple underlying LLMs, so teams can pick the model that fits their budget and task.</li>
<li><strong>Familiar Interface:</strong> Since it's a VS Code fork, most extensions, keybindings, and settings carry over with no relearning curve.</li>
</ul>

<h2>Who Cursor Is Best For</h2>
<p>Cursor is aimed at developers who already work in VS Code and want to delegate mechanical, multi-file work — refactors, boilerplate, test scaffolding, bug triage — to an agent while keeping full control over what gets merged. It is less useful if you need an editor independent of the VS Code ecosystem.</p>

<h2>Pricing</h2>
<p>Cursor offers a free tier with limited agent usage, plus paid plans for individuals and teams that unlock higher usage limits and premium model access. Check the current pricing page for exact tiers, as AI tool pricing changes frequently.</p>

<h2>Strengths & Limitations</h2>
<ul>
<li><strong>Strength:</strong> Multi-file agentic edits save real time on repetitive refactors compared to single-line autocomplete tools.</li>
<li><strong>Strength:</strong> Low switching cost from VS Code.</li>
<li><strong>Limitation:</strong> Like any LLM-based tool, agent output still needs human code review before merging, especially for security-sensitive changes.</li>
<li><strong>Limitation:</strong> Heavy agent usage on large codebases can consume usage quotas quickly on lower-tier plans.</li>
</ul>

<h2>Verdict</h2>
<p>For developers already comfortable in VS Code, Cursor is one of the more capable agentic coding tools available in 2026 — the agent mode genuinely handles multi-file tasks rather than just completing single lines.</p>

<p><em>Disclosure: This article contains an affiliate link. We may earn a commission if you sign up through our link, at no extra cost to you.</em></p>`,
      status: 'published' as const,
      is_featured: false,
      meta_title: 'Cursor AI Code Editor Review 2026',
      meta_description:
        'An in-depth look at Cursor AI code editor: agent mode, codebase-aware chat, pricing, and whether it is worth switching from plain VS Code.',
      thumbnail_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop',
      focus_keyword: 'Cursor AI code editor',
      key_takeaways: [
        'Cursor is a VS Code fork built around an agentic AI that can read and edit multiple files across a codebase.',
        'Agent Mode plans and applies multi-file diffs; Codebase-Aware Chat answers questions grounded in your actual project.',
        'Best suited for developers already using VS Code who want to delegate refactors and boilerplate to an AI agent.',
        'Human code review is still recommended before merging agent-generated changes, especially for security-sensitive code.',
      ],
      entities: ['Cursor', 'VS Code', 'AI code assistant', 'Agent Mode', 'GitHub Copilot'],
      faq_schema: [
        {
          question: 'Is Cursor better than GitHub Copilot?',
          answer:
            'Cursor focuses on agentic, multi-file edits and codebase-aware chat, while Copilot is more focused on inline autocomplete. Which is "better" depends on whether you want an autonomous agent or a lightweight completion assistant.',
        },
        {
          question: 'Does Cursor support existing VS Code extensions?',
          answer:
            'Yes, since Cursor is a fork of VS Code, most existing extensions, themes, and keybindings work without modification.',
        },
        {
          question: 'Is Cursor free to use?',
          answer:
            'Cursor offers a free tier with limited agent usage, plus paid individual and team plans for higher usage limits and premium model access.',
        },
        {
          question: 'Do I still need to review code written by Cursor\'s agent?',
          answer:
            'Yes. Agent-generated changes should go through the same code review process as human-written code, particularly for security-sensitive or production-critical changes.',
        },
      ],
      affiliate_placements: [
        { affiliate_link_id: cursor._id, position_label: 'top_cta' },
        { affiliate_link_id: cursor._id, position_label: 'middle' },
      ],
    },
    {
      author_id: admin._id,
      category_id: catAudio._id,
      sub_category_id: subVoice._id,
      title: 'ElevenLabs Voice AI Review 2026: Text-to-Speech & Voice Cloning Tested',
      slug: 'elevenlabs-voice-ai-review-2026',
      excerpt:
        'ElevenLabs remains one of the most natural-sounding text-to-speech and voice cloning platforms available. Here is what it does well, what to watch for, and who it is built for.',
      content: `<p><strong>ElevenLabs</strong> is an AI voice platform offering text-to-speech, voice cloning, and dubbing tools used widely for podcasts, audiobooks, video narration, and faceless content channels. This review covers its core features, pricing structure, and where it fits compared to alternatives.</p>

<h2>Key Features</h2>
<ul>
<li><strong>Text-to-Speech:</strong> Converts written scripts into natural-sounding speech across a large library of stock voices and languages.</li>
<li><strong>Voice Cloning:</strong> Creates a synthetic version of a specific voice from sample audio, used for consistent narrator branding or localization.</li>
<li><strong>Dubbing:</strong> Automatically translates and re-voices video or audio content into other languages while preserving vocal tone.</li>
<li><strong>API Access:</strong> Developers can integrate voice generation directly into apps, games, or automated content pipelines.</li>
</ul>

<h2>Who ElevenLabs Is Best For</h2>
<p>Content creators running faceless YouTube channels, podcast producers who need consistent narration, and localization teams that need to dub content into multiple languages are the main use cases. Developers building voice features into products also use the API tier.</p>

<h2>Pricing</h2>
<p>ElevenLabs uses a character-based credit system with a free tier for testing, and paid subscription tiers that scale with monthly usage volume and add features like voice cloning and commercial licensing. Confirm current tier limits on the official pricing page, as usage caps and pricing are updated periodically.</p>

<h2>Strengths & Limitations</h2>
<ul>
<li><strong>Strength:</strong> Voice quality and prosody are consistently rated among the more natural-sounding options in independent comparisons.</li>
<li><strong>Strength:</strong> Dubbing feature significantly speeds up multi-language content production.</li>
<li><strong>Limitation:</strong> Voice cloning raises consent and disclosure considerations — always get explicit permission before cloning someone else's voice, and disclose AI-generated voice where required by platform policy or law.</li>
<li><strong>Limitation:</strong> Heavy usage (long-form audiobooks, daily content) can get expensive on lower tiers due to character-based pricing.</li>
</ul>

<h2>Verdict</h2>
<p>For creators and teams that need natural-sounding narration, voice cloning, or fast multi-language dubbing, ElevenLabs remains a strong option in 2026, provided usage volume fits your subscription tier.</p>

<p><em>Disclosure: This article contains an affiliate link. We may earn a commission if you sign up through our link, at no extra cost to you.</em></p>`,
      status: 'published' as const,
      is_featured: false,
      meta_title: 'ElevenLabs Voice AI Review 2026',
      meta_description:
        'A hands-on look at ElevenLabs text-to-speech and voice cloning: features, pricing, strengths, limitations, and who should use it.',
      thumbnail_url: 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=1200&auto=format&fit=crop',
      focus_keyword: 'ElevenLabs voice AI',
      key_takeaways: [
        'ElevenLabs offers text-to-speech, voice cloning, dubbing, and a developer API for voice generation.',
        'Pricing is character-based, with a free tier and paid plans that scale with monthly usage volume.',
        'Best suited for faceless content creators, podcast producers, and localization teams needing multi-language dubbing.',
        'Voice cloning requires explicit consent from the voice owner and appropriate disclosure of AI-generated audio.',
      ],
      entities: ['ElevenLabs', 'Text-to-speech', 'Voice cloning', 'AI dubbing', 'Voice AI API'],
      faq_schema: [
        {
          question: 'Is ElevenLabs good for audiobook narration?',
          answer:
            'Yes, ElevenLabs is commonly used for audiobook and long-form narration due to its natural-sounding prosody, though high usage volume should be checked against pricing tier limits.',
        },
        {
          question: 'Can I clone my own voice with ElevenLabs?',
          answer:
            'Yes, ElevenLabs supports voice cloning from sample audio. You should only clone voices you have explicit permission to use, and disclose AI-generated audio where required.',
        },
        {
          question: 'Does ElevenLabs support multiple languages?',
          answer:
            'Yes, ElevenLabs supports text-to-speech and dubbing across a wide range of languages, making it useful for localizing video and audio content.',
        },
        {
          question: 'Is there a free version of ElevenLabs?',
          answer:
            'ElevenLabs offers a free tier with limited monthly character credits for testing before upgrading to a paid subscription.',
        },
      ],
      affiliate_placements: [
        { affiliate_link_id: elevenLabs._id, position_label: 'top_cta' },
        { affiliate_link_id: elevenLabs._id, position_label: 'middle' },
      ],
    },
  ];

  for (const art of articles) {
    const existing = await ArticleModel.findOne({ slug: art.slug });
    if (existing) {
      console.log(`Skipping (already exists): ${art.slug}`);
      continue;
    }
    const created = await ArticleModel.create(art);
    console.log(`Created: ${created.title} -> /${created.slug}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => mongoose.connection.close());
