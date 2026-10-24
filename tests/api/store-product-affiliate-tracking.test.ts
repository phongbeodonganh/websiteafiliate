import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectToDatabase } from "@/lib/db/mongodb";
import { StoreModel, StoreMetricsModel } from "@/lib/db/store-models";
import { ProductModel } from "@/lib/db/product-models";
import { BlacklistModel, CategoryModel, ClickLogModel } from "@/lib/db/models";
import { prepareAffiliateContent } from "@/lib/affiliate-content";
import { normalizeProductInput } from "@/lib/products/validation";
import { getStorefrontProducts } from "@/lib/products/public";
import { GET as redirectStore } from "@/app/api/v1/public/stores/redirect/route";
import { POST as viewStore } from "@/app/api/v1/public/stores/view/route";
import { GET as redirectProduct } from "@/app/api/v1/public/products/redirect/route";
import { _resetForTests } from "@/lib/rateLimit";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const affiliateContent = '<p>Read more <a href="https://partner.example.com/buy?ref=test&amp;campaign=1" rel="nofollow sponsored">Buy now</a> <a href="https://docs.example.com/">Documentation</a></p>';
const storeUrl = (query = "") => new Request(`http://localhost/api/v1/public/stores/redirect?store=test${query}`);
const view = (slug = "test", headers: Record<string, string> = {}) => new Request("http://localhost/api/v1/public/stores/view", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ slug }) });

beforeEach(async () => { _resetForTests(); await connectToDatabase(); });

async function seedStore() {
  return StoreModel.create({ slug: "test", name: "Test", destination: "https://store.example.com/?aff=123", content: affiliateContent, status: "published", offers: [
    { id: "valid", kind: "coupon", title: "Deal", active: true, destination: "https://store.example.com/sale?aff=123" },
    { id: "expired", kind: "coupon", title: "Old", active: true, expiresAt: new Date(Date.now() - 1000).toISOString() },
  ] });
}

describe("Store and product affiliate links", () => {
  it("rewrites only sponsored links and strips executable HTML", () => {
    const prepared = prepareAffiliateContent(`${affiliateContent}<script>alert(1)</script><a href="javascript:alert(1)" rel="sponsored">Bad</a>`, "/redirect?store=test");
    expect(prepared.links).toEqual(["https://partner.example.com/buy?ref=test&campaign=1"]);
    expect(prepared.html).toContain("/redirect?store=test&amp;link=0");
    expect(prepared.html).toContain('href="https://docs.example.com/"');
    expect(prepared.html).not.toMatch(/javascript:|<script/);
    expect(prepareAffiliateContent(prepared.html).links).toEqual([]);
    expect(normalizeProductInput({ description: affiliateContent + '<img src="https://images.example.com/a.png" onerror="alert(1)">' }, true).data.description).not.toContain("onerror");
  });

  it("tracks store detail views separately from affiliate clicks and deduplicates rapid repeats", async () => {
    await seedStore();
    expect((await viewStore(view())).status).toBe(204);
    expect((await viewStore(view())).status).toBe(204);
    expect((await redirectStore(storeUrl())).headers.get("location")).toBe("https://store.example.com/?aff=123");
    expect((await redirectStore(storeUrl("&link=0"))).headers.get("location")).toBe("https://partner.example.com/buy?ref=test&campaign=1");
    const metrics = await StoreMetricsModel.findOne({ slug: "test" });
    expect(metrics?.viewCount).toBe(1);
    expect(metrics?.clickCount).toBe(1);
    _resetForTests();
    const offer = await redirectStore(storeUrl("&offer=valid"));
    expect(offer.headers.get("location")).toBe("https://store.example.com/sale?aff=123");
    expect(offer.headers.get("cache-control")).toBe("no-store");
    expect((await StoreMetricsModel.findOne({ slug: "test" }))?.clickCount).toBe(2);
  });

  it("rejects hidden stores, unsafe indices, expired offers and blacklisted destinations", async () => {
    const store = await seedStore();
    for (const query of ["&offer=expired", "&offer=missing", "&link=-1", "&link=999", "&link=https://evil.example.com"]) {
      expect((await redirectStore(storeUrl(query))).headers.get("location")).toBe("http://localhost/stores");
    }
    expect(await StoreMetricsModel.countDocuments()).toBe(0);
    await BlacklistModel.create({ website_url: "https://partner.example.com/", extracted_domain: "partner.example.com", match_type: "domain", reason: "test", status: "active" });
    expect((await redirectStore(storeUrl("&link=0"))).headers.get("location")).toBe("http://localhost/store/test");
    store.status = "archived"; await store.save();
    expect((await viewStore(view())).status).toBe(404);
    expect((await redirectStore(storeUrl())).headers.get("location")).toBe("http://localhost/stores");
    expect(await StoreMetricsModel.countDocuments()).toBe(0);
  });

  it("does not count bots or cross-origin view requests and supports built-in stores", async () => {
    await seedStore();
    expect((await viewStore(view("test", { origin: "https://evil.example.com" }))).status).toBe(403);
    expect((await viewStore(view("test", { "user-agent": "Googlebot" }))).status).toBe(204);
    expect(await StoreMetricsModel.countDocuments()).toBe(0);
    expect((await viewStore(view("beavercraft"))).status).toBe(204);
    expect((await StoreMetricsModel.findOne({ slug: "beavercraft" }))?.viewCount).toBe(1);
    expect(await StoreModel.exists({ slug: "beavercraft" })).toBeNull();
  });

  it("tracks product description affiliates without an article ID or offer ID", async () => {
    const product = await ProductModel.create({ name: "Test Product", slug: "test-product", sku: "TEST", status: "published", description: affiliateContent });
    const request = () => new Request(`http://localhost/api/v1/public/products/redirect?product_id=${product._id}&link=0&placement=article_box`);
    expect((await redirectProduct(request())).headers.get("location")).toBe("https://partner.example.com/buy?ref=test&campaign=1");
    await redirectProduct(request());
    expect((await ProductModel.findById(product._id))?.click_count).toBe(1);
    expect(await ClickLogModel.countDocuments({ product_id: product._id, placement: "article_box" })).toBe(1);
    product.status = "draft"; await product.save();
    expect((await redirectProduct(request())).headers.get("location")).toBe("http://localhost/");
  });

  it("filters products by the shared category before applying the result limit", async () => {
    const category = await CategoryModel.create({ name: "AI", slug: "ai" });
    await ProductModel.create({ name: "Other", slug: "other", sku: "OTHER", status: "published", is_featured: true });
    await ProductModel.create({ name: "AI Product", slug: "ai-product", sku: "AI", category_id: category._id, status: "published" });
    const products = await getStorefrontProducts({ category: "ai", limit: 1 });
    expect(products.map((product) => product.slug)).toEqual(["ai-product"]);
    expect(await getStorefrontProducts({ category: "unknown", limit: 1 })).toEqual([]);
  });
});
