import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
  dns.setDefaultResultOrder('ipv4first');
} catch { }

function getMongoUri(): string {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/MONGODB_URI="?([^"\n\r]+)"?/);
      if (match && match[1]) return match[1].trim();
    }
    const mongodbEnvPath = path.join(process.cwd(), 'mongodb.env');
    if (fs.existsSync(mongodbEnvPath)) {
      const content = fs.readFileSync(mongodbEnvPath, 'utf8');
      const match = content.match(/MONGODB_URI="?([^"\n\r]+)"?/);
      if (match && match[1]) return match[1].trim();
    }
  } catch {
    // Ignore error
  }
  throw new Error(
    'MONGODB_URI is not set. Provide it via the MONGODB_URI environment variable, .env.local, or mongodb.env.'
  );
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached = global.mongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

async function connectWithRetry(
  uri: string,
  opts: { bufferCommands: boolean; serverSelectionTimeoutMS: number },
  attempt = 1
): Promise<typeof mongoose> {
  try {
    return await mongoose.connect(uri, opts);
  } catch (e) {
    const isDnsRefused = e instanceof Error && e.message.includes('querySrv ECONNREFUSED');
    if (isDnsRefused && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      return connectWithRetry(uri, opts, attempt + 1);
    }
    throw e;
  }
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached!.conn) {
    return cached!.conn;
  }

  try {
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    dns.setDefaultResultOrder('ipv4first');
  } catch {
    // Ignore DNS override errors if in restricted environment
  }

  if (!cached!.promise) {
    const uri = getMongoUri();
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    };

    cached!.promise = connectWithRetry(uri, opts);
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}
