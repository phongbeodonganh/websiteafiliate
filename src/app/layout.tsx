import type { Metadata } from "next";
import "./globals.css";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const sysSettings = await db.select().from(settings).where(eq(settings.id, 1)).get();
    const siteTitle = sysSettings?.siteTitle || "NEXUS FINANCE GLOBAL";
    const desc = sysSettings?.metaDescription || "Empowering global investors with institutional crypto research & affiliate deals.";
    const ogImg = sysSettings?.ogImageUrl || "https://images.unsplash.com/photo-1621761191319-c6fb62004040?q=80&w=1200&auto=format&fit=crop";

    return {
      title: {
        default: siteTitle,
        template: `%s | ${siteTitle}`,
      },
      description: desc,
      keywords: sysSettings?.focusKeywords ? sysSettings.focusKeywords.split(',').map((k) => k.trim()) : ["crypto", "finance", "affiliate"],
      alternates: {
        canonical: sysSettings?.canonicalUrl || "/",
        languages: {
          [sysSettings?.hreflang || "en-US"]: "/",
        },
      },
      openGraph: {
        title: siteTitle,
        description: desc,
        url: sysSettings?.canonicalUrl || "https://nexusfinance.global",
        siteName: siteTitle,
        locale: sysSettings?.hreflang || "en_US",
        type: "website",
        images: [{ url: ogImg, width: 1200, height: 630, alt: siteTitle }],
      },
      icons: sysSettings?.faviconUrl ? [{ rel: "icon", url: sysSettings.faviconUrl }] : undefined,
    };
  } catch (error) {
    return {
      title: "NEXUS FINANCE GLOBAL",
      description: "Institutional Financial Intelligence & Affiliate Deals",
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let sysSettings;
  try {
    sysSettings = await db.select().from(settings).where(eq(settings.id, 1)).get();
  } catch (e) {}

  const geoRegion = sysSettings?.geoRegionName || "US-NY";
  const geoPlace = sysSettings?.geoPlacename || "New York";
  const lat = sysSettings?.geoLatitude ?? 40.7128;
  const lng = sysSettings?.geoLongitude ?? -74.0060;
  const primaryColor = sysSettings?.primaryColor || "#0f172a";
  const accentColor = sysSettings?.accentColor || "#f59e0b";
  const customCss = sysSettings?.customCss || "";
  const schemaJsonld = sysSettings?.schemaJsonld || "";

  return (
    <html lang={sysSettings?.hreflang || "en"} className="h-full antialiased dark">
      <head>
        <meta name="geo.region" content={geoRegion} />
        <meta name="geo.placename" content={geoPlace} />
        <meta name="geo.position" content={`${lat};${lng}`} />
        <meta name="ICBM" content={`${lat}, ${lng}`} />
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --primary-color: ${primaryColor};
              --accent-color: ${accentColor};
            }
            ${customCss}
          `
        }} />
        {schemaJsonld && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: schemaJsonld }}
          />
        )}
      </head>
      <body className="min-h-full flex flex-col bg-[#060608] text-slate-300 font-sans selection:bg-amber-500/30">
        {children}
      </body>
    </html>
  );
}
