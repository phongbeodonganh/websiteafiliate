import { NextResponse } from 'next/server';
import { confirmInsider, getInsiderSiteUrl } from '@/lib/insider/subscribers';

function redirectToResult(result: 'confirmed' | 'already-active' | 'invalid') {
  const path = result === 'invalid' ? '/insider/failed' : '/insider/success';
  const destination = new URL(path, getInsiderSiteUrl());
  if (result !== 'invalid') destination.searchParams.set('status', result);
  return NextResponse.redirect(destination, 303);
}

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) return redirectToResult('invalid');

  try {
    const result = await confirmInsider(token);
    return redirectToResult(result.alreadyActive ? 'already-active' : 'confirmed');
  } catch (error) {
    console.error('Confirm Insider API error:', error);
    return redirectToResult('invalid');
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null) as { token?: unknown } | null;
    if (typeof body?.token !== 'string' || !body.token) {
      return NextResponse.json({ status: 'error', message: 'Confirmation token is required' }, { status: 400 });
    }

    const result = await confirmInsider(body.token);
    return NextResponse.json({
      status: 'success',
      message: result.alreadyActive
        ? 'This email is already an AIDEALSUK Insider.'
        : 'Your Insider subscription is confirmed.',
      alreadyActive: result.alreadyActive,
    });
  } catch (error) {
    console.error('Confirm Insider API error:', error);
    return NextResponse.json({ status: 'error', message: 'Invalid or expired confirmation link.' }, { status: 400 });
  }
}
