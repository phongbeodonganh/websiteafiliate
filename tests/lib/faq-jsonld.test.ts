import { describe, expect, it } from 'vitest';
import { buildFaqPageSchema } from '@/lib/faq-jsonld';
import { serializeJsonLd } from '@/lib/seo';

describe('buildFaqPageSchema (CMS-02 / C-1 FAQPage JSON-LD)', () => {
  it('builds a FAQPage object with one Question per complete pair, in stored order', () => {
    const schema = buildFaqPageSchema([
      { question: 'What is AI?', answer: 'Artificial intelligence.' },
      { question: 'Is it free?', answer: 'There is a free tier.' },
    ]);

    expect(schema).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What is AI?',
          acceptedAnswer: { '@type': 'Answer', text: 'Artificial intelligence.' },
        },
        {
          '@type': 'Question',
          name: 'Is it free?',
          acceptedAnswer: { '@type': 'Answer', text: 'There is a free tier.' },
        },
      ],
    });
  });

  it('returns null for undefined, empty, and all-incomplete lists (edge: empty)', () => {
    expect(buildFaqPageSchema(undefined)).toBeNull();
    expect(buildFaqPageSchema([])).toBeNull();
    expect(buildFaqPageSchema([{ question: '', answer: 'a' }])).toBeNull();
    expect(buildFaqPageSchema([{ question: 'q', answer: '   ' }])).toBeNull();
    expect(buildFaqPageSchema([{ question: '   ', answer: '' }])).toBeNull();
  });

  it('keeps only complete pairs from a mixed list and reflects the filtered count', () => {
    const schema = buildFaqPageSchema([
      { question: 'kept?', answer: 'yes' },
      { question: '', answer: 'orphan answer' },
      { question: 'answer missing', answer: '' },
      { question: 'also kept?', answer: 'sure' },
    ]);

    expect(schema).not.toBeNull();
    const mainEntity = (schema as { mainEntity: unknown[] }).mainEntity;
    expect(mainEntity).toHaveLength(2);
    expect(mainEntity).toEqual([
      {
        '@type': 'Question',
        name: 'kept?',
        acceptedAnswer: { '@type': 'Answer', text: 'yes' },
      },
      {
        '@type': 'Question',
        name: 'also kept?',
        acceptedAnswer: { '@type': 'Answer', text: 'sure' },
      },
    ]);
  });

  it('trims emitted question and answer values', () => {
    const schema = buildFaqPageSchema([{ question: '  padded q  ', answer: '  padded a  ' }]);

    expect(schema).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'padded q',
          acceptedAnswer: { '@type': 'Answer', text: 'padded a' },
        },
      ],
    });
  });

  it('drops non-string question/answer values defensively', () => {
    const schema = buildFaqPageSchema([
      { question: 123 as unknown as string, answer: 'numeric question' },
      { question: 'string question', answer: null as unknown as string },
      { question: 'valid', answer: 'valid answer' },
    ]);

    expect(schema).not.toBeNull();
    const mainEntity = (schema as { mainEntity: Array<{ name: string }> }).mainEntity;
    expect(mainEntity).toHaveLength(1);
    expect(mainEntity[0].name).toBe('valid');
  });

  it('escapes a markup-closing question so the serialized output contains no raw "<" (T-02-06)', () => {
    const schema = buildFaqPageSchema([
      { question: 'Is this safe? </script><script>alert(1)</script>', answer: 'Yes' },
    ]);

    expect(schema).not.toBeNull();
    const serialized = serializeJsonLd(schema);
    expect(serialized).not.toContain('<');
    expect(serialized).toContain('\\u003c');
  });
});
