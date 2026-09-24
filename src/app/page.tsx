import type { Metadata } from "next";
import TechFinanceNewsClient from "./news-client";
import { getHomepageArticles } from "@/lib/homepage-articles";
import { createPageMetadata } from "@/lib/seo";

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// D-13: Search URLs (/?q=...) produce noindex metadata to keep search-result
// pages out of Google's index. Normal homepage URL (no q) is fully indexable.
export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const baseMeta = createPageMetadata({
    title: "Technology News",
    description: "Latest technology and finance articles from AIDEALSUK.",
    path: "/",
  });
  if (typeof q === "string" && q.trim()) {
    return { ...baseMeta, robots: { index: false, follow: true } };
  }
  return baseMeta;
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
