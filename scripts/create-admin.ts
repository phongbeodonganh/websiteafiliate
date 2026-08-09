import { connectToDatabase } from '../src/lib/db/mongodb';
import { UserModel } from '../src/lib/db/models';
import { hashPassword } from '../src/lib/auth';

async function createAdmin() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Usage: tsx scripts/create-admin.ts <username> <password>');
    process.exit(1);
  }

  await connectToDatabase();

  const password_hash = await hashPassword(password);

  const user = await UserModel.findOneAndUpdate(
    { username },
    {
      $set: {
        password_hash,
        role: 'admin',
        status: 'active',
        name: username,
      },
      $setOnInsert: { avatar: username.charAt(0).toUpperCase() },
    },
    { upsert: true, new: true }
  );

  console.log(`Admin user ready: ${user.username} (id: ${user._id})`);
  process.exit(0);
}

createAdmin().catch((err) => {
  console.error('Failed to create admin user:', err);
  process.exit(1);
});
