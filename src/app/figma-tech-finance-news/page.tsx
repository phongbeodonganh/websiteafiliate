import type { Metadata } from "next";
import { Suspense } from "react";
import TechFinanceNewsClient from "./news-client";
import { connectToDatabase } from "@/lib/db/mongodb";
import { SettingModel } from "@/lib/db/models";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// SEO-05: trang này nhận query search (?q=...) từ ô tìm kiếm ở header — mỗi từ
// khoá tạo ra 1 URL riêng, nội dung mỏng/trùng lặp nên không nên để Google index
// từng biến thể search. Trang gốc không filter (?q= trống) vẫn index bình thường.
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";

  await connectToDatabase();
  const settings = await SettingModel.findOne();
  const baseUrl = (settings?.canonicalUrl || "https://aidealsuk.com").replace(/\/$/, "");
  const canonicalUrl = `${baseUrl}/figma-tech-finance-news`;

  return {
    title: "AIDEALSUK - Technology News",
    description: "Latest technology and finance articles from AIDEALSUK.",
    alternates: { canonical: canonicalUrl },
    ...(q ? { robots: { index: false, follow: true } } : {}),
  };
}

export default function FigmaTechFinanceNewsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#111111] text-white flex items-center justify-center p-8">Loading...</div>}>
      <TechFinanceNewsClient />
    </Suspense>
  );
}
