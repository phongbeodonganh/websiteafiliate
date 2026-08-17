import type { Metadata } from "next";
import TechFinanceNewsClient from "./figma-tech-finance-news/news-client";

export const metadata: Metadata = {
  title: "Tech & Finance News",
  description: "Latest technology and finance articles from AIDEALSUK.",
};

export default function HomePage() {
  return <TechFinanceNewsClient />;
}
