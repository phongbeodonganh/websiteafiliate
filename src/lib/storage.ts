import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

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

function safeFileName(originalName: string): string {
  const ext = originalName.includes('.') ? originalName.split('.').pop() : '';
  const base = randomUUID();
  return ext ? `${base}.${ext.toLowerCase().replace(/[^a-z0-9]/g, '')}` : base;
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  folder = 'uploads'
): Promise<string> {
  const bucket = getEnv('R2_BUCKET_NAME');
  const publicUrl = getEnv('R2_PUBLIC_URL').replace(/\/$/, '');
  const key = `${folder}/${safeFileName(originalName)}`;

  const client = getR2Client();
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
