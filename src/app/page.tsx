import type { Metadata } from "next";
import TechFinanceNewsClient from "./news-client";
import { getHomepageArticles } from "@/lib/homepage-articles";

export const metadata: Metadata = {
  title: "AIDEALSUK - Technology News",
  description: "Latest technology and finance articles from AIDEALSUK.",
};

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { q } = await searchParams;
  const initialQuery = typeof q === "string" ? q.trim() : "";
  let initialData: Awaited<ReturnType<typeof getHomepageArticles>> | undefined;

  try {
    initialData = await getHomepageArticles(initialQuery);
  } catch (error) {
    console.error("Unable to preload homepage articles:", error);
  }

  return (
    <TechFinanceNewsClient
      initialData={initialData}
      initialQuery={initialQuery}
    />
  );
}
