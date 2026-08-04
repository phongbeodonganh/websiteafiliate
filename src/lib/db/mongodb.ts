import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dns from 'dns';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  dns.setDefaultResultOrder('ipv4first');
} catch {}

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
  return 'mongodb+srv://pnv6555_db_user:LagoFHSUotjbc7HE@webafiliate.xbqpx7k.mongodb.net/websiteafiliate?retryWrites=true&w=majority';
}

const MONGODB_URI = getMongoUri();

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

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached!.conn) {
    return cached!.conn;
  }

  if (!cached!.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    };

    cached!.promise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      return m;
    });
  }

  try {
    cached!.conn = await cached!.promise;
  } catch (e) {
    cached!.promise = null;
    throw e;
  }

  return cached!.conn;
}
