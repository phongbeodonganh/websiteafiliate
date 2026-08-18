import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { BlacklistModel } from '@/lib/db/models';
import { extractDomainFromUrl, sweepRetroactiveBlacklist } from '@/lib/blacklist';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_super_secret_jwt_key_2026';

async function verifyAdminAuth() {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded;
  } catch {
    return null;
  }
}

// GET /api/v1/cms/blacklist
export async function GET() {
  try {
    const user = await verifyAdminAuth();
    if (!user) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const list = await BlacklistModel.find().sort({ created_at: -1 });

    const formatted = list.map((item) => ({
      id: item._id.toString(),
      projectName: item.project_name || '',
      websiteUrl: item.website_url,
      extractedDomain: item.extracted_domain,
      matchType: item.match_type,
      reason: item.reason,
      blockedCountries: item.blocked_countries || [],
      status: item.status,
      createdAt: item.created_at,
    }));

    return NextResponse.json({ status: 'success', data: formatted });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}

// POST /api/v1/cms/blacklist
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAdminAuth();
    if (!user) {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { projectName, websiteUrl, matchType, reason, blockedCountries } = body;

    if (!websiteUrl || !reason) {
      return NextResponse.json(
        { status: 'error', message: 'Website URL and Reason are required fields.' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const { rootDomain, hostname } = extractDomainFromUrl(websiteUrl);
    const domainToSave = rootDomain || hostname || websiteUrl.trim().toLowerCase();

    const newEntry = await BlacklistModel.create({
      project_name: projectName || domainToSave,
      website_url: websiteUrl,
      extracted_domain: domainToSave,
      match_type: matchType || 'domain',
      reason,
      blocked_countries: Array.isArray(blockedCountries) ? blockedCountries : [],
      status: 'active',
      created_by: user.id,
    });

    // Run retroactive sweep
    const sweepResult = await sweepRetroactiveBlacklist(domainToSave);

    return NextResponse.json({
      status: 'success',
      data: {
        id: newEntry._id.toString(),
        projectName: newEntry.project_name,
        extractedDomain: newEntry.extracted_domain,
        reason: newEntry.reason,
        sweep: sweepResult,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}

// DELETE /api/v1/cms/blacklist
export async function DELETE(req: NextRequest) {
  try {
    const user = await verifyAdminAuth();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ status: 'error', message: 'Missing id parameter' }, { status: 400 });
    }

    await connectToDatabase();
    await BlacklistModel.findByIdAndDelete(id);

    return NextResponse.json({ status: 'success', message: 'Blacklist entry removed' });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
