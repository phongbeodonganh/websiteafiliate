import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { connectToDatabase } from "@/lib/db/mongodb";
import { SettingModel } from "@/lib/db/models";
import PublicMotion from "@/components/PublicMotion";
import SocialFloatingBar from "@/components/SocialFloatingBar";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_SITE_NAME,
  normalizeLocale,
  normalizeHttpUrl,
  normalizeSiteUrl,
  sanitizeStoredJsonLd,
} from "@/lib/seo";
import { sanitizeCssColor } from "@/lib/sanitize";

export async function generateMetadata(): Promise<Metadata> {
  try {
    await connectToDatabase();
    const sysSettings = await SettingModel.findOne();
    const siteTitle = sysSettings?.site_title || DEFAULT_SITE_NAME;
    const desc = sysSettings?.metaDescription || DEFAULT_DESCRIPTION;
    const ogImg = normalizeHttpUrl(sysSettings?.ogImageUrl, DEFAULT_OG_IMAGE);
    const baseUrl = normalizeSiteUrl(sysSettings?.canonicalUrl);
    const locale = normalizeLocale(sysSettings?.hreflang);

    return {
      metadataBase: new URL(baseUrl),
      applicationName: siteTitle,
      title: {
        default: siteTitle,
        template: `%s | ${siteTitle}`,
      },
      description: desc,
      alternates: {
        canonical: "/",
      },
      openGraph: {
        title: siteTitle,
        description: desc,
        url: "/",
        siteName: siteTitle,
        locale,
        type: "website",
        images: [{ url: ogImg, width: 1200, height: 630, alt: siteTitle }],
      },
      twitter: {
        card: "summary_large_image",
        title: siteTitle,
        description: desc,
        images: [ogImg],
      },
      icons: {
        icon: sysSettings?.favicon_url || "/favicon/favicon.png",
        shortcut: sysSettings?.favicon_url || "/favicon/favicon.png",
        apple: sysSettings?.favicon_url || "/favicon/favicon.png",
      },
    };
  } catch {
    return {
      metadataBase: new URL(normalizeSiteUrl()),
      applicationName: DEFAULT_SITE_NAME,
      title: { default: DEFAULT_SITE_NAME, template: `%s | ${DEFAULT_SITE_NAME}` },
      description: DEFAULT_DESCRIPTION,
      alternates: { canonical: "/" },
      openGraph: {
        title: DEFAULT_SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        url: "/",
        siteName: DEFAULT_SITE_NAME,
        locale: "en_US",
        type: "website",
        images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: DEFAULT_SITE_NAME }],
      },
      twitter: {
        card: "summary_large_image",
        title: DEFAULT_SITE_NAME,
        description: DEFAULT_DESCRIPTION,
        images: [DEFAULT_OG_IMAGE],
      },
      icons: {
        icon: "/favicon/favicon.png",
        shortcut: "/favicon/favicon.png",
        apple: "/favicon/favicon.png",
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
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  let sysSettings;
  try {
    await connectToDatabase();
    sysSettings = await SettingModel.findOne();
  } catch { }

  const geoRegion = sysSettings?.geo_region_name || "US-NY";
  const geoPlace = sysSettings?.geo_placename || "New York";
  const lat = sysSettings?.geo_latitude ?? 40.7128;
  const lng = sysSettings?.geo_longitude ?? -74.0060;
  // SEC-03 / CONCERNS #11 (plan 06 Task 4): route the stored admin color
  // reads through sanitizeCssColor before the <style> interpolation below.
  // A dirty stored value (one written before this phase's validator, or a
  // stored XSS attempt via another write path) falls back to the site
  // defaults rather than reaching every visitor's DOM. The write boundary
  // (PUT /api/v1/cms/settings) rejects malformed values with 400 via
  // isValidCssColor; this render boundary is belt-and-braces for historical
  // rows. Defaults match the previous || fallbacks so the happy path is
  // visually unchanged.
  const primaryColor = sanitizeCssColor(sysSettings?.primary_color, "#111111");
  const accentColor = sanitizeCssColor(sysSettings?.accent_color, "#000000");
  const customCss = sysSettings?.custom_css || "";
  const schemaJsonld = sysSettings?.schemaJsonld || "";
  const safeSchemaJsonld = sanitizeStoredJsonLd(schemaJsonld);
  const gaId = sysSettings?.googleAnalyticsId || "";
  const gscVerification = sysSettings?.googleSiteVerification || "";

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
        {gscVerification && (
          <meta name="google-site-verification" content={gscVerification} />
        )}
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
        {safeSchemaJsonld && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: safeSchemaJsonld }}
          />
        )}
        {gaId && (
          <>
            <script
              async
              nonce={nonce}
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <script
              nonce={nonce}
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}');
                `,
              }}
            />
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased selection:bg-[#0D766E]/15 selection:text-[#0D766E]">
        <PublicMotion />
        <SocialFloatingBar />
        {children}
      </body>
    </html>
  );
}
