import mongoose from 'mongoose';
import { seedTaxonomy } from '../src/lib/seed-taxonomy';

// CLI entry: `npx tsx scripts/seed-taxonomy.ts`
// Idempotent — a second run reports 0/0 and changes nothing (D-11). Logs counts
// only; never echoes the connection string or any credential (T-02-23).
async function main() {
  const { createdCategories, createdSubCategories } = await seedTaxonomy();
  console.log(
    `Taxonomy seed complete: ${createdCategories} category(ies) and ${createdSubCategories} sub-category(ies) created.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Taxonomy seed failed:', e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => mongoose.connection.close());
