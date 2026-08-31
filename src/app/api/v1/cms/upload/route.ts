import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { uploadFile } from '@/lib/storage';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// SVG is intentionally excluded — it can embed <script>/event-handler XSS payloads
// that would execute wherever the "image" is rendered.
export async function POST(req: Request) {
  const user = getAuthUser(req);
  if (!user) {
    return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ status: 'error', message: 'No file provided' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { status: 'error', message: 'Unsupported file type. Allowed: JPEG, PNG, WEBP, GIF.' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { status: 'error', message: 'File too large. Max size is 5MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadFile(buffer, file.name, file.type);

    return NextResponse.json({ status: 'success', data: { url } }, { status: 201 });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ status: 'error', message: 'Failed to upload file' }, { status: 500 });
  }
}
