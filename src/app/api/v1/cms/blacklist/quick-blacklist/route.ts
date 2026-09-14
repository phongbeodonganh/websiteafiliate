import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { BlacklistModel, AffiliateLinkModel } from '@/lib/db/models';
import { extractDomainFromUrl, sweepRetroactiveBlacklist } from '@/lib/blacklist';
import { getAuthUser } from '@/lib/auth';

// POST /api/v1/cms/blacklist/quick-blacklist
export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
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
        created_by: user.userId,
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
