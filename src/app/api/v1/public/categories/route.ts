import { NextResponse } from 'next/server';
import { getPublicTaxonomy } from '@/lib/public-data-cache';

export async function GET() {
  try {
    const data = await getPublicTaxonomy();
    return NextResponse.json({ status: 'success', data });
  } catch {
    return NextResponse.json({ status: 'error', message: 'Failed to fetch public categories' }, { status: 500 });
  }
}
