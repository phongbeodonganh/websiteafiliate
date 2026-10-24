import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from '../src/lib/db/models';
import { seedTaxonomy } from '../src/lib/seed-taxonomy';

// A persistent, isolated local database; no production credentials are needed.
async function main() {
  const localDir = path.join(process.cwd(), '.local');
  const dbPath = path.join(localDir, 'mongodb');
  await mkdir(dbPath, { recursive: true });
  const credentialsPath = path.join(localDir, 'credentials.json');
  let credentials: { username: string; password: string; jwtSecret: string };
  try {
    credentials = JSON.parse(await readFile(credentialsPath, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    credentials = {
      username: 'admin.local',
      password: randomBytes(12).toString('base64url'),
      jwtSecret: randomBytes(48).toString('hex'),
    };
    await writeFile(credentialsPath, JSON.stringify(credentials, null, 2), { mode: 0o600 });
  }

  const mongo = await MongoMemoryServer.create({
    binary: { downloadDir: path.join(localDir, 'mongodb-binaries') },
    instance: { ip: '127.0.0.1', dbPath, storageEngine: 'wiredTiger' },
  });
  process.env.MONGODB_URI = mongo.getUri('aidealsuk_local');
  process.env.JWT_SECRET = credentials.jwtSecret;

  await mongoose.connect(process.env.MONGODB_URI);
  if (!(await UserModel.exists({ username: credentials.username }))) {
    await UserModel.create({
      username: credentials.username,
      password_hash: await bcrypt.hash(credentials.password, 10),
      name: 'Local Admin', role: 'admin', status: 'active', avatar: 'A',
    });
  }
  await seedTaxonomy();
  await mongoose.disconnect();
  // seedTaxonomy uses the application's connection cache; only the child server
  // will access the database from here onward.

  console.log('Local admin: http://localhost:3000/admin');
  console.log(`Username: ${credentials.username}\nPassword: ${credentials.password}`);
  const next = spawn(process.execPath, [
    'node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3000',
  ], { stdio: 'inherit', env: process.env });

  let stopping = false;
  const stop = async (code: number) => {
    if (stopping) return;
    stopping = true;
    next.kill('SIGTERM');
    await mongo.stop({ doCleanup: false });
    process.exit(code);
  };
  process.once('SIGINT', () => void stop(0));
  process.once('SIGTERM', () => void stop(0));
  next.once('error', (error) => { console.error(error); void stop(1); });
  next.once('exit', (code) => void stop(code ?? 1));
}

main().catch((error) => { console.error(error); process.exit(1); });
