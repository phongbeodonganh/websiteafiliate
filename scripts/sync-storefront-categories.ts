import mongoose from 'mongoose';
import { syncDefaultStorefrontCategories } from '../src/lib/storefront-categories';

async function main() {
  const result = await syncDefaultStorefrontCategories();
  console.log(`Storefront categories synced: ${result.createdCategories} created, ${result.updatedCategories} updated.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Storefront category sync failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => mongoose.connection.close());
