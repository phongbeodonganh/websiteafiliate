import { NextResponse } from 'next/server';
import { parseCommissionRate, parseCookieDays } from '@/lib/utils';
import { connectToDatabase } from '@/lib/db/mongodb';
import { AffiliateLinkModel } from '@/lib/db/models';
import { getAuthUser } from '@/lib/auth';
import { isHttpUrl } from '@/lib/seo';
import { isDuplicateKeyError, normalizeAffiliateUrl } from '@/lib/affiliate-url';

async function findDuplicateUrl(normalizedUrl: string, excludedId: string) {
  const indexedMatch = await AffiliateLinkModel.findOne({
    normalized_base_url: normalizedUrl,
    _id: { $ne: excludedId },
  }).select('_id');
  if (indexedMatch) return indexedMatch;

  const legacyLinks = await AffiliateLinkModel.find(
    { normalized_base_url: { $exists: false }, _id: { $ne: excludedId } },
    { _id: 1, base_url: 1 }
  ).lean();
  return legacyLinks.find((candidate) => normalizeAffiliateUrl(candidate.base_url) === normalizedUrl) || null;
}

function duplicateUrlResponse(existingId?: unknown) {
  return NextResponse.json(
    {
      status: 'error',
      code: 'AFFILIATE_URL_EXISTS',
      message: 'An affiliate campaign with this tracking URL already exists.',
      ...(existingId ? { existingId: String(existingId) } : {}),
    },
    { status: 409 }
  );
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: 'Only administrators can manage affiliate links.' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, base_url, commission, cookie, is_top_pick, isTopPick } = body;
    if (description !== undefined && (typeof description !== 'string' || description.trim().length > 300)) {
      return NextResponse.json({ status: 'error', message: 'Short description must be text of at most 300 characters.' }, { status: 400 });
    }

    await connectToDatabase();
    await AffiliateLinkModel.init();
    const link = await AffiliateLinkModel.findById(id);

    if (!link) {
      return NextResponse.json({ status: 'error', message: 'Link not found' }, { status: 404 });
    }

    // AFF-01 scheme gate: a provided base_url must be http(s) BEFORE assignment —
    // a rejected value leaves the stored document untouched. When base_url is absent
    // from the body the update proceeds unchanged (partial-update semantics).
    if (
      base_url !== undefined &&
      (typeof base_url !== 'string' || !base_url.trim() || !isHttpUrl(base_url))
    ) {
      return NextResponse.json(
        { status: 'error', message: 'The tracking URL must use HTTP or HTTPS.' },
        { status: 400 }
      );
    }

    if (base_url !== undefined) {
      const cleanBaseUrl = base_url.trim();
      const normalizedBaseUrl = normalizeAffiliateUrl(cleanBaseUrl);
      if (!normalizedBaseUrl) {
        return NextResponse.json(
          { status: 'error', message: 'Enter a non-empty HTTP or HTTPS tracking URL.' },
          { status: 400 }
        );
      }

      const duplicate = await findDuplicateUrl(normalizedBaseUrl, id);
      if (duplicate) return duplicateUrlResponse(duplicate._id);

      link.base_url = cleanBaseUrl;
      link.normalized_base_url = normalizedBaseUrl;
    }

    if (name !== undefined) link.name = name;
    if (description !== undefined) link.description = description.trim();
    if (commission !== undefined) {
      link.commission = commission;
      link.commission_rate = parseCommissionRate(commission);
    }
    if (cookie !== undefined) {
      link.cookie = cookie;
      link.cookie_days = parseCookieDays(cookie);
    }
    if (is_top_pick !== undefined) link.is_top_pick = Boolean(is_top_pick);
    if (isTopPick !== undefined) link.is_top_pick = Boolean(isTopPick);

    await link.save();

    return NextResponse.json({
      status: 'success',
      data: {
        id: link._id.toString(),
        name: link.name,
        description: link.description || '',
        baseUrl: link.base_url,
        base_url: link.base_url,
        commission: link.commission,
        cookie: link.cookie,
        isTopPick: link.is_top_pick,
        is_top_pick: link.is_top_pick,
        clickCount: link.click_count || 0,
        click_count: link.click_count || 0,
        createdAt: link.created_at,
      },
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) return duplicateUrlResponse();
    return NextResponse.json({ status: 'error', message: 'Unable to update the affiliate link.' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json(
      { status: 'error', message: 'Only administrators can manage affiliate links.' },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    await connectToDatabase();
    await AffiliateLinkModel.findByIdAndDelete(id);

    return NextResponse.json({
      status: 'success',
      message: 'Affiliate link deleted successfully.',
    });
  } catch {
    return NextResponse.json({ status: 'error', message: 'Unable to delete the affiliate link.' }, { status: 500 });
  }
}
