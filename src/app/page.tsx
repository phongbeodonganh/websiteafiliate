import type { Metadata } from "next";
import TechFinanceNewsClient from "./news-client";
import { getHomepageArticles } from "@/lib/homepage-articles";
import { connectToDatabase } from "@/lib/db/mongodb";
import { SettingModel, type ISetting } from "@/lib/db/models";
import {
  createPageMetadata,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_SITE_NAME,
  normalizeHttpUrl,
} from "@/lib/seo";

interface HomePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// D-13: Search URLs (/?q=...) produce noindex metadata to keep search-result
// pages out of Google's index. Normal homepage URL (no q) is fully indexable.
export async function generateMetadata({ searchParams }: HomePageProps): Promise<Metadata> {
  const { q } = await searchParams;
  let settings: Pick<
    ISetting,
    "site_title" | "metaDescription" | "focusKeywords" | "ogImageUrl"
  > | null = null;
  try {
    await connectToDatabase();
    settings = await SettingModel.findOne().lean();
  } catch (error) {
    console.error("Unable to load settings for homepage metadata:", error);
  }

  const baseMeta = createPageMetadata({
    title: settings?.site_title || DEFAULT_SITE_NAME,
    description: settings?.metaDescription || DEFAULT_DESCRIPTION,
    keywords: settings?.focusKeywords,
    ogImage: normalizeHttpUrl(settings?.ogImageUrl, DEFAULT_OG_IMAGE),
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
