// Builder thuần cho FAQPage JSON-LD (CMS-02 / C-1).
// Không truy cập DB, không import Next — chỉ biến đổi dữ liệu đã lưu thành
// object structured data. Quy tắc lọc trùng khớp với editor (D-10): chỉ giữ
// cặp khi cả question lẫn answer đều là string có nội dung sau khi trim.

export interface FaqPair {
  question: string;
  answer: string;
}

interface FaqPageQuestion {
  '@type': 'Question';
  name: string;
  acceptedAnswer: { '@type': 'Answer'; text: string };
}

/**
 * Dựng object FAQPage từ `faq_schema` của article.
 * Trả về null khi không có cặp hoàn chỉnh nào (để caller không render script).
 */
export function buildFaqPageSchema(faqSchema?: FaqPair[]): object | null {
  if (!Array.isArray(faqSchema) || faqSchema.length === 0) {
    return null;
  }

  const mainEntity: FaqPageQuestion[] = [];

  for (const pair of faqSchema) {
    if (!pair || typeof pair !== 'object') continue;

    const { question, answer } = pair as Partial<FaqPair>;
    if (typeof question !== 'string' || typeof answer !== 'string') continue;

    const trimmedQuestion = question.trim();
    const trimmedAnswer = answer.trim();
    if (!trimmedQuestion || !trimmedAnswer) continue;

    mainEntity.push({
      '@type': 'Question',
      name: trimmedQuestion,
      acceptedAnswer: { '@type': 'Answer', text: trimmedAnswer },
    });
  }

  if (mainEntity.length === 0) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  };
}
