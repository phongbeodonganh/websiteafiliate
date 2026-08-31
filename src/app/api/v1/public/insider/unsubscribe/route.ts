import { NextResponse } from 'next/server';
import { getInsiderSiteUrl, unsubscribeInsider } from '@/lib/insider/subscribers';

function redirectToResult(result: 'unsubscribed' | 'invalid') {
  const path = result === 'invalid' ? '/insider/failed' : '/insider/success';
  const destination = new URL(path, getInsiderSiteUrl());
  if (result === 'unsubscribed') destination.searchParams.set('status', result);
  return NextResponse.redirect(destination, 303);
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return redirectToResult('invalid');

  try {
    await unsubscribeInsider(token);
    return redirectToResult('unsubscribed');
  } catch (error) {
    console.error('Unsubscribe Insider API error:', error);
    return redirectToResult('invalid');
  }
}

export async function POST(req: Request) {
  try {
    const requestUrl = new URL(req.url);
    let token = requestUrl.searchParams.get('token');
    if (!token) {
      const body = await req.json().catch(() => null) as { token?: unknown } | null;
      token = typeof body?.token === 'string' ? body.token : null;
    }
    if (!token) {
      return NextResponse.json({ status: 'error', message: 'Unsubscribe token is required' }, { status: 400 });
    }

    await unsubscribeInsider(token);
    return NextResponse.json({ status: 'success', message: 'You have been unsubscribed.' });
  } catch (error) {
    console.error('Unsubscribe Insider API error:', error);
    return NextResponse.json({ status: 'error', message: 'Invalid unsubscribe link.' }, { status: 400 });
  }
}
