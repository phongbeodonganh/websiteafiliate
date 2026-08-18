import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { BlacklistModel, AffiliateLinkModel } from '@/lib/db/models';
import { extractDomainFromUrl, sweepRetroactiveBlacklist } from '@/lib/blacklist';
import { headers } from 'next/headers';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'nexus_super_secret_jwt_key_2026';

async function verifyAdminAuth() {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

// POST /api/v1/cms/blacklist/quick-blacklist
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAdminAuth();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { campaignId, reason } = body;

    if (!campaignId) {
      return NextResponse.json({ status: 'error', message: 'Campaign ID is required.' }, { status: 400 });
    }

    await connectToDatabase();
    const campaign = await AffiliateLinkModel.findById(campaignId);
    if (!campaign) {
      return NextResponse.json({ status: 'error', message: 'Campaign not found.' }, { status: 404 });
    }

    // Extract domain & create Blacklist entry
    const { rootDomain, hostname } = extractDomainFromUrl(campaign.base_url);
    const domainToSave = rootDomain || hostname || campaign.base_url;
    const finalReason = reason || 'Nền tảng lừa đảo / Không trả hoa hồng';

    await BlacklistModel.findOneAndUpdate(
      { extracted_domain: domainToSave },
      {
        project_name: campaign.name,
        website_url: campaign.base_url,
        extracted_domain: domainToSave,
        match_type: 'domain',
        reason: finalReason,
        status: 'active',
        created_by: user.id,
      },
      { upsert: true, new: true }
    );

    // Update campaign status to blacklisted
    campaign.status = 'blacklisted';
    await campaign.save();

    // Trigger retroactive sweep for all matching links
    const sweepRes = await sweepRetroactiveBlacklist(domainToSave);

    return NextResponse.json({
      status: 'success',
      data: {
        campaignId: campaign._id.toString(),
        campaignName: campaign.name,
        domainBlacklisted: domainToSave,
        reason: finalReason,
        sweptCount: sweepRes.totalUpdatedLinks,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
