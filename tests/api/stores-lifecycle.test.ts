import { describe, expect, it, vi } from "vitest";
import { connectToDatabase } from "@/lib/db/mongodb";
import { StoreModel } from "@/lib/db/store-models";
import { UserModel, CategoryModel } from "@/lib/db/models";
import { signToken } from "@/lib/auth";
import { GET, POST } from "@/app/api/v1/cms/stores/route";
import { PUT, DELETE } from "@/app/api/v1/cms/stores/[id]/route";
import { getPublishedStores, getStoreCatalogue } from "@/lib/stores/public";
import sitemap from "@/app/sitemap";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

async function token(role: "admin" | "editor" | "author" = "admin") {
  await connectToDatabase();
  // Wait for the unique slug index before testing duplicate/tombstone writes.
  await StoreModel.init();
  const user = await UserModel.create({ username: `${role}-${Math.random()}`, password_hash: "test", role, status: "active" });
  return signToken({ userId: user._id.toString(), username: user.username, role });
}
function request(method: string, auth = "", body?: unknown) {
  return new Request("http://localhost/api/v1/cms/stores", {
    method, headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
const context = (id: string) => ({ params: Promise.resolve({ id }) });
const offer = (data: Record<string, unknown> = {}) => ({ id: "offer-one", kind: "code", title: "Save on your order", saving: "20% off", code: "SAVE20", active: true, ...data });
const store = (data: Record<string, unknown> = {}) => ({ name: "Test Store", slug: "test-store", destination: "https://store.example.com/", status: "published", showOnHomepage: true, offers: [offer()], ...data });

describe("Admin stores and public coupon lifecycle", () => {
  it("archives and deletes built-in stores directly without allowing them to reappear", async () => {
    const auth = await token();
    expect((await DELETE(request("DELETE", auth), context("legacy-beavercraft"))).status).toBe(200);
    const archived = await StoreModel.findOne({ slug: "beavercraft" });
    expect(archived?.status).toBe("archived");
    expect((await getPublishedStores()).some((item) => item.slug === "beavercraft")).toBe(false);
    expect((await DELETE(new Request("http://localhost/api/v1/cms/stores/legacy-beavercraft?action=delete", { method: "DELETE", headers: { Authorization: `Bearer ${auth}` } }), context("legacy-beavercraft"))).status).toBe(200);
    const listed = (await (await GET(request("GET", auth))).json()).data;
    expect(listed.some((item: { slug: string }) => item.slug === "beavercraft")).toBe(false);
    expect((await getPublishedStores()).some((item) => item.slug === "beavercraft")).toBe(false);
    expect((await PUT(request("PUT", auth, store({ slug: "beavercraft" })), context(archived!._id.toString()))).status).toBe(404);
    expect((await POST(request("POST", auth, store({ slug: "beavercraft" })))).status).toBe(400);
  });

  it("uses product categories for stores and preserves affiliate URLs in descriptions", async () => {
    const auth = await token();
    await CategoryModel.create({ name: "AI", slug: "ai", show_on_homepage: true });
    const body = store({ categorySlug: "ai", content: '<p>Review <a href="https://partner.example.com/?ref=abc&amp;offer=1" target="_blank" rel="nofollow sponsored noopener noreferrer">Buy now</a></p>' });
    expect((await POST(request("POST", auth, body))).status).toBe(201);
    const saved = (await getPublishedStores()).find((item) => item.slug === body.slug);
    expect(saved?.categorySlug).toBe("ai");
    expect(saved?.content).toContain('rel="nofollow sponsored noopener noreferrer"');
    expect(saved?.content).toContain("ref=abc&amp;offer=1");
    expect((await POST(request("POST", auth, store({ slug: "invalid-category", categorySlug: "missing-category" })))).status).toBe(400);
  });

  it("requires authentication and denies every CMS method to editor and author", async () => {
    expect((await GET(request("GET"))).status).toBe(401);
    expect((await POST(request("POST", "", store()))).status).toBe(401);
    for (const role of ["editor", "author"] as const) {
      const auth = await token(role);
      expect((await GET(request("GET", auth))).status).toBe(403);
      expect((await POST(request("POST", auth, store()))).status).toBe(403);
      expect((await PUT(request("PUT", auth, store()), context("000000000000000000000001"))).status).toBe(403);
      expect((await DELETE(request("DELETE", auth), context("000000000000000000000001"))).status).toBe(403);
    }
    expect(await StoreModel.countDocuments()).toBe(0);
  });

  it("round-trips images, sanitized article, Q&A and promo codes; publishes, archives and restores", async () => {
    const auth = await token();
    const body = store({ status: "draft", imageUrl: "https://media.example.com/store.webp", imageAlt: "Store banner", content: '<p>Store info</p><img src="https://media.example.com/ad.webp" onerror="alert(1)"><script>alert(1)</script>', faqs: [{ question: "How to use a code?", answer: "Apply it at checkout." }] });
    const created = await POST(request("POST", auth, body));
    expect(created.status).toBe(201);
    const id = (await created.json()).data.id;
    expect((await getPublishedStores()).some((record) => record.slug === "test-store")).toBe(false);
    const saved = await StoreModel.findById(id);
    expect(saved?.content).toContain("ad.webp");
    expect(saved?.content).not.toMatch(/onerror|script/);
    const listed = (await (await GET(request("GET", auth))).json()).data.find((record: { id: string }) => record.id === id);
    expect(listed.imageAlt).toBe("Store banner");
    expect(listed.faqs[0].answer).toBe("Apply it at checkout.");
    expect(listed.offers[0].code).toBe("SAVE20");
    expect((await PUT(request("PUT", auth, { ...body, status: "published" }), context(id))).status).toBe(200);
    expect((await getPublishedStores()).find((record) => record.id === id)?.showOnHomepage).toBe(true);
    expect((await sitemap()).some((entry) => entry.url.endsWith("/store/test-store"))).toBe(true);
    expect((await DELETE(request("DELETE", auth), context(id))).status).toBe(200);
    expect((await getPublishedStores()).some((record) => record.id === id)).toBe(false);
    expect((await sitemap()).some((entry) => entry.url.endsWith("/store/test-store"))).toBe(false);
    expect((await PUT(request("PUT", auth, body), context(id))).status).toBe(200);
    expect((await StoreModel.findById(id))?.status).toBe("draft");
  });

  it("revokes store management after an admin is demoted even with their old token", async () => {
    const auth = await token();
    await UserModel.updateOne({ role: "admin" }, { $set: { role: "editor" } });
    expect((await POST(request("POST", auth, store()))).status).toBe(403);
    expect(await StoreModel.countDocuments()).toBe(0);
  });

  it("filters expired, scheduled and disabled coupons while keeping active codes and codeless coupons", async () => {
    const auth = await token();
    const now = Date.now();
    const offers = [
      offer(),
      offer({ id: "coupon", kind: "coupon", code: "", title: "Automatic sale" }),
      offer({ id: "expired", expiresAt: new Date(now - 1000).toISOString() }),
      offer({ id: "scheduled", startsAt: new Date(now + 86400000).toISOString() }),
      offer({ id: "disabled", active: false }),
    ];
    expect((await POST(request("POST", auth, store({ offers })))).status).toBe(201);
    const record = (await getPublishedStores()).find((record) => record.slug === "test-store");
    expect(record?.offers.map((item) => item.id)).toEqual(["offer-one", "coupon"]);
    expect((await StoreModel.findOne({ slug: "test-store" }))?.offers).toHaveLength(5);
    const catalogue = await getStoreCatalogue();
    expect(catalogue.deals.filter((deal) => deal.storeSlug === "test-store")).toHaveLength(2);
    expect(catalogue.stores.find((store) => store.slug === "test-store")?.offerCount).toBe(2);
  });

  it("rejects unsafe URLs, missing promo code, bad dates and duplicates without writing", async () => {
    const auth = await token();
    for (const body of [
      store({ destination: "javascript:alert(1)" }),
      store({ imageUrl: "data:image/svg+xml,test" }),
      store({ offers: [offer({ destination: "javascript:alert(1)" })] }),
      store({ offers: [offer({ code: "" })] }),
      store({ offers: [offer({ expiresAt: "not-a-date" })] }),
      store({ offers: [offer({ startsAt: "2026-10-15T00:00:00Z", expiresAt: "2026-10-14T00:00:00Z" })] }),
      store({ offers: [offer(), offer()] }),
    ]) expect((await POST(request("POST", auth, body))).status).toBe(400);
    expect(await StoreModel.countDocuments()).toBe(0);
    expect((await POST(request("POST", auth, store()))).status).toBe(201);
    expect((await POST(request("POST", auth, store()))).status).toBe(400);
  });

  it("rejects invalid IDs and slug changes, and returns 404 for missing stores", async () => {
    const auth = await token();
    const created = await POST(request("POST", auth, store()));
    const id = (await created.json()).data.id;
    expect((await PUT(request("PUT", auth, store({ slug: "renamed" })), context(id))).status).toBe(400);
    expect((await DELETE(request("DELETE", auth), context("invalid"))).status).toBe(400);
    expect((await DELETE(request("DELETE", auth), context("000000000000000000000001"))).status).toBe(404);
    expect((await StoreModel.findById(id))?.slug).toBe("test-store");
  });

  it("overrides legacy stores once and does not resurrect them after archival", async () => {
    const auth = await token();
    const body = store({ slug: "beavercraft", name: "BeaverCraft managed" });
    const created = await POST(request("POST", auth, body));
    const id = (await created.json()).data.id;
    expect((await getPublishedStores()).filter((record) => record.slug === "beavercraft")).toHaveLength(1);
    await DELETE(request("DELETE", auth), context(id));
    expect((await getPublishedStores()).some((record) => record.slug === "beavercraft")).toBe(false);
    const catalogue = await getStoreCatalogue();
    expect(catalogue.stores.some((record) => record.slug === "beavercraft")).toBe(false);
    expect(catalogue.deals.some((deal) => deal.storeSlug === "beavercraft")).toBe(false);
  });
});
