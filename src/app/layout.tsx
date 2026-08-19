import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { connectToDatabase } from "@/lib/db/mongodb";
import { SettingModel } from "@/lib/db/models";
import PublicMotion from "@/components/PublicMotion";

export async function generateMetadata(): Promise<Metadata> {
  try {
    await connectToDatabase();
    const sysSettings = await SettingModel.findOne();
    const siteTitle = sysSettings?.site_title || "AIDEALSUK";
    const desc = sysSettings?.metaDescription || "Discover high-paying AI affiliate programs, comprehensive AI tool reviews, and expert monetization strategies.";
    const ogImg = sysSettings?.ogImageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop";

    return {
      applicationName: "AIDEALSUK",
      title: {
        default: siteTitle,
        template: `%s | ${siteTitle}`,
      },
      description: desc,
      keywords: sysSettings?.focusKeywords ? sysSettings.focusKeywords.split(',').map((k) => k.trim()) : ["ai affiliate", "ai tools", "jasper ai", "elevenlabs"],
      alternates: {
        canonical: sysSettings?.canonicalUrl || "/",
        languages: {
          [sysSettings?.hreflang || "en-US"]: "/",
        },
      },
      openGraph: {
        title: siteTitle,
        description: desc,
        url: sysSettings?.canonicalUrl || "https://aidealsuk.com",
        siteName: siteTitle,
        locale: sysSettings?.hreflang || "en_US",
        type: "website",
        images: [{ url: ogImg, width: 1200, height: 630, alt: siteTitle }],
      },
      icons: {
        icon: sysSettings?.favicon_url || "/favicon/favicon.png",
        shortcut: sysSettings?.favicon_url || "/favicon/favicon.png",
      },
    };
  } catch (error) {
    return {
      applicationName: "AIDEALSUK",
      title: "AIDEALSUK",
      description: "Your Trusted Source for AI Tool Reviews, Tech News & Exclusive Affiliate Deals.",
      icons: {
        icon: "/favicon/favicon.png",
        shortcut: "/favicon/favicon.png",
      },
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Reading a dynamic API here opts the whole app out of static prerendering,
  // which is required for Next.js to pick up the per-request `x-nonce` header
  // (set in src/proxy.ts) and stamp it onto its own inline bootstrap scripts —
  // otherwise statically-optimized routes (e.g. /admin, /admin/login) ship
  // those scripts with no nonce and the CSP in proxy.ts blocks them outright.
  await headers();

  let sysSettings;
  try {
    await connectToDatabase();
    sysSettings = await SettingModel.findOne();
  } catch (e) { }

  const geoRegion = sysSettings?.geo_region_name || "US-NY";
  const geoPlace = sysSettings?.geo_placename || "New York";
  const lat = sysSettings?.geo_latitude ?? 40.7128;
  const lng = sysSettings?.geo_longitude ?? -74.0060;
  const primaryColor = sysSettings?.primary_color || "#111111";
  const accentColor = sysSettings?.accent_color || "#000000";
  const customCss = sysSettings?.custom_css || "";
  const schemaJsonld = sysSettings?.schemaJsonld || "";

  return (
    <html lang={sysSettings?.hreflang || "en"} className="h-full antialiased dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
        <meta name="geo.region" content={geoRegion} />
        <meta name="geo.placename" content={geoPlace} />
        <meta name="geo.position" content={`${lat};${lng}`} />
        <meta name="ICBM" content={`${lat}, ${lng}`} />
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --primary-color: ${primaryColor};
              --accent-color: ${accentColor};
              --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
              --font-heading: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
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
      <body className="min-h-full flex flex-col bg-[#F8F9FA] text-slate-700 font-sans selection:bg-[#FF6B6B]/20 selection:text-[#FF6B6B]">
        <PublicMotion />
        {children}
      </body>
    </html>
  );
}
