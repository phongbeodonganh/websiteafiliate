import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { slugifyFileName } from '@/lib/file-name';

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Configure Cloudflare R2 env vars in .env.local.`);
  }
  return value;
}

function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: getEnv('R2_ENDPOINT'),
    credentials: {
      accessKeyId: getEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
    },
  });
}

function fileExtension(originalName: string): string {
  const ext = originalName.includes('.') ? originalName.split('.').pop() || '' : '';
  return ext.toLowerCase().replace(/[^a-z0-9]/g, '');
}

async function objectExists(client: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  folder = 'uploads',
  customName?: string
): Promise<string> {
  const bucket = getEnv('R2_BUCKET_NAME');
  const publicUrl = getEnv('R2_PUBLIC_URL').replace(/\/$/, '');
  const client = getR2Client();

  // SEO-friendly name: admin-supplied > original file name > random id. R2 objects are
  // served immutable, so never overwrite an existing key — add a short suffix instead.
  const slug = slugifyFileName(customName || originalName) || randomUUID();
  const ext = fileExtension(originalName);
  const withExt = (name: string) => (ext ? `${name}.${ext}` : name);
  let key = `${folder}/${withExt(slug)}`;
  if (await objectExists(client, bucket, key)) {
    key = `${folder}/${withExt(`${slug}-${randomUUID().slice(0, 6)}`)}`;
  }

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return `${publicUrl}/${key}`;
}

export async function deleteFile(publicUrl: string): Promise<void> {
  const bucket = getEnv('R2_BUCKET_NAME');
  const base = getEnv('R2_PUBLIC_URL').replace(/\/$/, '');
  if (!publicUrl.startsWith(base)) return;

  const key = publicUrl.slice(base.length + 1);
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
