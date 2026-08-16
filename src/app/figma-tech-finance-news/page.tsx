import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Figma Tech Finance News",
  description: "A grayscale tech and finance news homepage based on the Figma frame.",
};

const aiHandImage =
  "https://www.figma.com/api/mcp/asset/87db92e3-29b4-41ad-9663-06858883397d.png";
const claudeImage =
  "https://www.figma.com/api/mcp/asset/909ce0a5-61b7-4f2c-93a2-ce7cf7b390eb.png";
const claudeWideImage =
  "https://www.figma.com/api/mcp/asset/5467a74f-dac9-4248-b838-150dd57b2c55.png";
const editorImage =
  "https://www.figma.com/api/mcp/asset/f486de2e-c35f-4d2d-a764-81de88e58d3b.png";

const latestArticles = [
  {
    time: "8 MIN AGO",
    category: "AI",
    title: "Why smaller models are becoming a big deal",
    image: aiHandImage,
  },
  {
    time: "24 MIN AGO",
    category: "MARKETS",
    title: "Markets react to a new chip-industry forecast",
    image: claudeImage,
  },
  {
    time: "41 MIN AGO",
    category: "SECURITY",
    title: "The hidden cost of always-on cybersecurity",
    image: aiHandImage,
  },
  {
    time: "1 HOUR AGO",
    category: "STARTUPS",
    title: "The startup rebuilding the personal computer",
    image: aiHandImage,
  },
  {
    time: "2 HOURS AGO",
    category: "MONEY",
    title: "A new era for digital payments begins",
    image: claudeImage,
  },
];

const footerColumns = ["ABOUT", "CATEGORIES", "SUPPORT", "CONNECT"];

export default function FigmaTechFinanceNewsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.logo} href="/">
          AIDEALSUK
        </Link>

        <label className={styles.searchBox}>
          <Search aria-hidden="true" className={styles.searchIcon} size={32} strokeWidth={1.7} />
          <span className={styles.searchPlaceholder}>Search</span>
        </label>

        <nav className={styles.actions} aria-label="Account links">
          <Link href="/admin/login">Sign up</Link>
          <Link href="/admin/login">Sign in</Link>
        </nav>
      </header>

      <div className={styles.shell}>
        <section className={styles.featured} aria-labelledby="featured-title">
          <div className={styles.sectionRule} />
          <div className={styles.featuredCopy}>
            <p className={styles.eyebrow}>FEATURED STORY</p>
            <h1 id="featured-title">The next wave of AI in finance is arriving faster than expected</h1>
            <p className={styles.lede}>
              A sharp, magazine-style lead story area. Use this for the most important article of the day.
            </p>
            <p className={styles.meta}>12 MIN READ &middot; TECHNOLOGY</p>
          </div>
          <div className={styles.featuredMedia}>
            <img src={aiHandImage} alt="AI finance interface projected above a hand" />
          </div>
        </section>

        <aside className={styles.latest} aria-labelledby="latest-title">
          <div className={styles.sectionRule} />
          <h2 id="latest-title">LATEST ARTICLES</h2>
          <div className={styles.latestList}>
            {latestArticles.map((article) => (
              <article className={styles.latestItem} key={`${article.time}-${article.category}`}>
                <img src={article.image} alt="" />
                <div>
                  <p className={styles.meta}>
                    {article.time} &middot; {article.category}
                  </p>
                  <h3>{article.title}</h3>
                </div>
              </article>
            ))}
          </div>
          <a className={styles.blackButton} href="#latest-title">
            VIEW ALL LATEST ARTICLES
          </a>
        </aside>

        <section className={styles.hottest} aria-labelledby="hottest-title">
          <div className={styles.sectionRule} />
          <h2 id="hottest-title">HOTTEST ARTICLES</h2>
          <p className={styles.meta}>MOST READ / MOST SHARED TODAY</p>

          <article className={styles.hotItem}>
            <strong>01</strong>
            <div>
              <p className={styles.meta}>TECHNOLOGY &middot; 10 MIN READ</p>
              <h3>Inside the race to build the next AI operating system</h3>
            </div>
            <img src={claudeWideImage} alt="" />
          </article>

          <article className={styles.hotItem}>
            <strong>02</strong>
            <div>
              <p className={styles.meta}>FINANCE &middot; 7 MIN READ</p>
              <h3>Why investors are watching the semiconductor supply chain</h3>
            </div>
            <img src={aiHandImage} alt="" />
          </article>
        </section>

        <section className={styles.editorial} aria-labelledby="editorial-title">
          <div className={styles.sectionRule} />
          <p className={styles.eyebrow}>CURATED BY OUR EDITORS</p>
          <h2 id="editorial-title">EDITORIAL PICKS</h2>

          <article className={styles.editorialLead}>
            <img src={editorImage} alt="Claude assistant interface on a phone" />
            <div>
              <p className={styles.meta}>EDITOR&apos;S PICK &middot; 14 MIN READ</p>
              <h3>The technologies that quietly changed how we work</h3>
              <p>Long-form, curated story with stronger editorial voice.</p>
            </div>
          </article>

          <div className={styles.miniGrid}>
            <article>
              <p className={styles.meta}>DESIGN &middot; 6 MIN</p>
              <h3>How interface design is changing for an AI-first internet</h3>
            </article>
            <article>
              <p className={styles.meta}>BUSINESS &middot; 9 MIN</p>
              <h3>What the next generation of media companies looks like</h3>
            </article>
          </div>
        </section>

        <a className={styles.productLink} href="#editorial-title">
          VIEW PRODUCT -&gt;
        </a>
      </div>

      <footer className={styles.footer}>
        <div>
          <p className={styles.eyebrow}>FOOTER</p>
          <Link className={styles.footerLogo} href="/">
            SIGNAL<span>/</span>
          </Link>
        </div>

        {footerColumns.map((column) => (
          <div className={styles.footerColumn} key={column}>
            <h2>{column}</h2>
            <span />
            <span />
            <span />
          </div>
        ))}

        <form className={styles.newsletter}>
          <h2>NEWSLETTER</h2>
          <div>
            <input aria-label="Email address" placeholder="Email address" type="email" />
            <button type="submit">Join</button>
          </div>
        </form>

        <p className={styles.copyright}>© 2026 SIGNAL. All rights reserved.</p>
      </footer>
    </main>
  );
}
