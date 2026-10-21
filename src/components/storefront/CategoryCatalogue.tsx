import ProductCard from "./ProductCard";
import StoreCard from "./StoreCard";
import { getStorefrontProducts } from "@/lib/products/public";
import { getPublishedStores } from "@/lib/stores/public";
import styles from "./storefront.module.css";
import storeStyles from "./stores.module.css";

export default async function CategoryCatalogue({ slug, name }: { slug: string; name: string }) {
  const [products, allStores] = await Promise.all([
    getStorefrontProducts({ category: slug, limit: 60 }), getPublishedStores(),
  ]);
  const stores = allStores.filter((store) => store.categorySlug === slug);
  return <div>
    <section className={styles.section} aria-label={`Products in ${name}`}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{name}</p><h2>Products in {name}</h2></div></div>
      {products.length ? <div className={styles.productGrid}>{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p>No published products in this category yet.</p>}
    </section>
    <section className={styles.section} aria-label={`Stores in ${name}`}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Related stores</p><h2>Stores in {name}</h2></div></div>
      {stores.length ? <div className={storeStyles.grid}>{stores.map((store) => <StoreCard key={store.slug} store={store} />)}</div> : <p>No published stores in this category yet.</p>}
    </section>
  </div>;
}
