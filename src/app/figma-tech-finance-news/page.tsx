import type { Metadata } from "next";
import { Suspense } from "react";
import TechFinanceNewsClient from "./news-client";

export const metadata: Metadata = {
  title: "Tech & Finance News",
  description: "Latest technology and finance articles from AIDEALSUK.",
};

export default function FigmaTechFinanceNewsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#111111] text-white flex items-center justify-center p-8">Loading...</div>}>
      <TechFinanceNewsClient />
    </Suspense>
  );
}
