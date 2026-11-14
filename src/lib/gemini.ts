/**
 * Gemini AI Engine Utility for SEO & GEO V5.3 Auto Article Generation
 * Model: gemini-2.5-flash
 * Temperature: 0.2 (disciplined, high precision)
 * Response Mime Type: application/json
 * JSON Schema Enforcement for seo_meta, geo_data, and content_html.
 * 
 * """
    Tạo bài viết marketing dựa trên 4 nguyên lý: Khác biệt, Lặp lại, Giác quan, Chất lượng.
    """
    # Khởi tạo client (tự động đọc GEMINI_API_KEY từ os.environ)
    client = genai.Client()

    # Thiết lập System Instruction đóng vai trò Requirement kỹ thuật
    system_instruction = f"""
    Bạn là một Chuyên gia Content Marketing hàng đầu. Khi viết bài, bạn BẮT BUỘC tuân thủ nghiêm ngặt 4 nguyên lý sau:

    1. KHÁC BIỆT CỰC ĐOAN (Differentiation):
       - Mở đầu ngay lập tức bằng 1 hook gây tò mò, đảo ngược tư duy thông thường hoặc đưa ra con số ấn tượng.
       - CẤM TUYỆT ĐỐI các câu mở đầu sáo rỗng như: "Trong thời đại ngày nay...", "Bạn có biết...", "Chắc hẳn ai trong chúng ta...".

    2. LẶP ĐI LẶP LẠI (Repetition):
       - Thông điệp cốt lõi là: "{core_message}".
       - Hãy lặp lại và lồng ghép thông điệp này tối thiểu 3 lần trong bài (Mở bài, Thân bài, Kết bài) bằng các cách diễn đạt linh hoạt khác nhau.

    3. TÁC ĐỘNG GIÁC QUAN (Sensory & Layout):
       - Sử dụng ít nhất 3-5 từ ngữ gợi hình, gợi cảm giác (thị giác, xúc giác, độ bền, sự tinh khiết...).
       - Trình bày tối ưu cho mắt đọc: câu ngắn, xuống dòng nhiều, dùng BOLD ở từ khóa quan trọng và danh sách gạch đầu dòng.

    4. CHẤT LƯỢNG CAO (Product Quality & Actionable):
       - Không viết câu vô nghĩa. Mỗi đoạn văn phải mang lại 1 giá trị hoặc thông tin thực tế.
       - Kết thúc bằng một lời kêu gọi hành động (CTA) cụ thể, rõ ràng.
    """

    user_prompt = f"""
    Hãy viết một bài đăng tiếp thị với thông số sau:
    - Chủ đề bài viết: {topic}
    - Đối tượng độc giả mục tiêu: {target_audience}
    """
 */

export interface IGeminiArticlePayload {
  seo_meta: {
    h1: string;
    meta_title: string;
    meta_description: string;
    focus_keywords: string[];
  };
  geo_data: {
    key_takeaways: string[];
    entities: string[];
    faq_list?: { question: string; answer: string }[];
    faq_schema_jsonld: string;
  };
  content_html: string;
}

export interface IGenerateArticleOptions {
  topic: string;
  landingPageContext?: string;
  campaignName?: string;
  trackingUrl?: string;
  apiKey?: string;
  language?: string; // default: 'vi-VN'
}

export async function generateSeoGeoArticleWithGemini(
  options: IGenerateArticleOptions
): Promise<IGeminiArticlePayload> {
  const {
    topic,
    landingPageContext = '',
    campaignName = '',
    trackingUrl = '#',
    apiKey = process.env.GEMINI_API_KEY || 'AQ.Ab8RN6LfIjKqSrL5Ax8dYKyuMyapxXiVpsfSI2OoFDJuBB-kZQ',
    language = 'vi-VN',
  } = options;

  if (!apiKey) {
    throw new Error('Chưa cung cấp Gemini API Key. Vui lòng nhập API Key vào Cài Đặt Hệ Thống hoặc ô Gemini API Key.');
  }

  const systemInstructionText = `
Bạn là Trưởng biên tập viên công nghệ và tài chính Senior với hơn 10 năm kinh nghiệm biên soạn bài viết B2B SaaS.
Nhiệm vụ của bạn là tạo bài viết chuyên sâu chuẩn SEO & GEO V5.3 nhằm chuyển đổi độc giả và đạt thứ hạng cao trên Google Search, ChatGPT, Perplexity và Google SGE.

QUY TẮC BẮT BUỘC:
1. KHÔNG sử dụng các từ ngữ rập khuôn AI như: "Tóm lại", "Trong thế giới ngày nay", "Hãy cùng khám phá", "Như một AI", "Trong thời đại kỹ thuật số".
2. Ngôn ngữ: ${language === 'vi-VN' ? 'Tiếng Việt chuẩn mực, chuyên nghiệp, súc tích' : 'Tiếng Anh chuẩn B2B SaaS'}.
3. Tích hợp link Affiliate: Chèn 2-3 hộp Call-To-Action (CTA) nổi bật và các liên kết tự nhiên chứa URL theo dõi: "${trackingUrl}" với tên thương hiệu "${campaignName}".
4. Cấu trúc bài viết: Có Sapo thu hút, phân chia các thẻ <h2> và <h3> rõ ràng, dùng <ul> / <li> để trình bày dữ liệu dạng danh sách.
5. GEO (Generative Engine Optimization): Trích xuất 3-5 Key Takeaways cô đọng (để SearchGPT/Perplexity dẫn nguồn), danh sách các Thực thể (Entities).
6. FAQ Schema & Rows: Tạo 3 câu hỏi FAQ thực tế (câu hỏi & câu trả lời chi tiết) vừa điền vào mảng faq_list vừa sinh mã JSON-LD hợp lệ.
7. QUY TẮC LIÊN KẾT NGHIÊM NGẶT: Thẻ <a href="..."> CHỈ được phép dùng cho URL theo dõi Affiliate "${trackingUrl}" ở trên. TUYỆT ĐỐI KHÔNG tự tạo bất kỳ link nội bộ nào khác (không link về trang chủ, không link "đọc thêm bài viết khác", không tự đoán URL bài viết). KHÔNG BAO GIỜ viết cú pháp Markdown [text](url) trong content_html — content_html chỉ được chứa HTML thuần, không lẫn Markdown.
`;

  const userPrompt = `
Chủ đề bài viết: "${topic}"
Thương hiệu Affiliate: "${campaignName}"
URL Affiliate Tracking: "${trackingUrl}"

DỮ LIỆU CÀO TỪ LANDING PAGE SẢN PHẨM (Nguồn bối cảnh):
---
${landingPageContext ? landingPageContext.slice(0, 15000) : 'Sản phẩm SaaS công nghệ hàng đầu.'}
---

Hãy viết bài viết hoàn chỉnh và trả về định dạng JSON đúng chuẩn JSON Schema được yêu cầu.
`;

  const jsonSchema = {
    type: "OBJECT",
    properties: {
      seo_meta: {
        type: "OBJECT",
        properties: {
          h1: { type: "STRING" },
          meta_title: { type: "STRING" },
          meta_description: { type: "STRING" },
          focus_keywords: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["h1", "meta_title", "meta_description", "focus_keywords"]
      },
      geo_data: {
        type: "OBJECT",
        properties: {
          key_takeaways: { type: "ARRAY", items: { type: "STRING" } },
          entities: { type: "ARRAY", items: { type: "STRING" } },
          faq_list: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                question: { type: "STRING" },
                answer: { type: "STRING" }
              },
              required: ["question", "answer"]
            }
          },
          faq_schema_jsonld: { type: "STRING" }
        },
        required: ["key_takeaways", "entities", "faq_list", "faq_schema_jsonld"]
      },
      content_html: { type: "STRING" }
    },
    required: ["seo_meta", "geo_data", "content_html"]
  };

  const payload = {
    system_instruction: {
      parts: [{ text: systemInstructionText }]
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      response_mime_type: "application/json",
      response_schema: jsonSchema
    }
  };

  // Try model candidate endpoints in order: gemini-3.6-flash -> gemini-3.5-flash -> gemini-3.1-flash-lite -> gemini-2.0-flash
  const modelCandidates = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-2.0-flash'];
  let lastError = '';

  for (const model of modelCandidates) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const rawJsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJsonText) {
          const parsedData: IGeminiArticlePayload = JSON.parse(rawJsonText);
          return parsedData;
        }
      } else {
        const errorText = await response.text();
        lastError = `Model ${model} status ${response.status}: ${errorText}`;
        console.warn(`Gemini Model ${model} failed, trying next candidate... ${lastError}`);
      }
    } catch (err: any) {
      lastError = err.message;
    }
  }

  if (lastError.includes('API_KEY_INVALID') || lastError.includes('API key not valid')) {
    throw new Error(
      `Lỗi API Key (${apiKey.slice(0, 8)}...): Google báo API Key chưa được kích hoạt dịch vụ hoặc không hợp lệ.\n` +
      `👉 Nếu key tạo từ Google Cloud (Project 1050033519961): Hãy đảm bảo đã bật "Generative Language API" tại https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com\n` +
      `👉 Hoặc tạo Key trực tiếp miễn phí 100% tại: https://aistudio.google.com/app/apikey`
    );
  }

  throw new Error(`Gemini API Error: ${lastError}`);
}
