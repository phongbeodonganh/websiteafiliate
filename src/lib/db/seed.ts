import { seedMongoDB } from './seed-mongodb';

export async function seedDatabase() {
  return seedMongoDB();
}

if (typeof require !== 'undefined' && require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
