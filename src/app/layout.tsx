import type { Metadata } from "next";
import "./globals.css";
import { connectToDatabase } from "@/lib/db/mongodb";
import { SettingModel } from "@/lib/db/models";

export async function generateMetadata(): Promise<Metadata> {
  try {
    await connectToDatabase();
    const sysSettings = await SettingModel.findOne();
    const siteTitle = sysSettings?.site_title || "NEXUS FINANCE GLOBAL";
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
      icons: sysSettings?.favicon_url ? [{ rel: "icon", url: sysSettings.favicon_url }] : undefined,
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
    await connectToDatabase();
    sysSettings = await SettingModel.findOne();
  } catch (e) { }

  const geoRegion = sysSettings?.geo_region_name || "US-NY";
  const geoPlace = sysSettings?.geo_placename || "New York";
  const lat = sysSettings?.geo_latitude ?? 40.7128;
  const lng = sysSettings?.geo_longitude ?? -74.0060;
  const primaryColor = sysSettings?.primary_color || "#0f172a";
  const accentColor = sysSettings?.accent_color || "#f59e0b";
  const customCss = sysSettings?.custom_css || "";
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
