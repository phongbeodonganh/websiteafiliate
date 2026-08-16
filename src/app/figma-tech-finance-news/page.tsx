import type { Metadata } from "next";
import TechFinanceNewsClient from "./news-client";

export const metadata: Metadata = {
  title: "Tech & Finance News",
  description: "Latest technology and finance articles from AIDEALSUK.",
};

export default function FigmaTechFinanceNewsPage() {
  return <TechFinanceNewsClient />;
}
