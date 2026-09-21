import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { BlacklistModel } from '@/lib/db/models';
import { extractDomainFromUrl, sweepRetroactiveBlacklist } from '@/lib/blacklist';
import { getAuthUser } from '@/lib/auth';

// POST /api/v1/cms/blacklist/import
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { items } = body; // Array of { projectName, websiteUrl, reason, blockedCountries }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ status: 'error', message: 'Items array is empty or invalid.' }, { status: 400 });
    }

    await connectToDatabase();

    let importedCount = 0;
    let sweptCampaignsCount = 0;

    for (const raw of items) {
      const websiteUrl = raw.websiteUrl || raw.website || raw.url || raw.domain;
      if (!websiteUrl) continue;

      const reason = raw.reason || raw.note || raw.Note || 'Bắt Ads - Không trả tiền';
      const projectName = raw.projectName || raw.project_name || raw['Tên Dự Án'] || raw.Name || '';
      const blockedCountriesStr = raw.blockedCountries || raw.blocked_countries || raw['Quốc Gia'] || '';

      const blockedCountries = typeof blockedCountriesStr === 'string'
        ? blockedCountriesStr.split(',').map((s: string) => s.trim()).filter(Boolean)
        : Array.isArray(blockedCountriesStr) ? blockedCountriesStr : [];

      const { rootDomain, hostname } = extractDomainFromUrl(websiteUrl);
      const domainToSave = rootDomain || hostname || websiteUrl.trim().toLowerCase();

      await BlacklistModel.findOneAndUpdate(
        { extracted_domain: domainToSave },
        {
          project_name: projectName || domainToSave,
          website_url: websiteUrl,
          extracted_domain: domainToSave,
          match_type: 'domain',
          reason,
          blocked_countries: blockedCountries,
          status: 'active',
          created_by: user.userId,
        },
        { upsert: true, new: true }
      );

      importedCount++;

      // Trigger retroactive sweep for each imported domain
      const sweepRes = await sweepRetroactiveBlacklist(domainToSave);
      sweptCampaignsCount += sweepRes.totalUpdatedLinks;
    }

    return NextResponse.json({
      status: 'success',
      data: {
        totalImported: importedCount,
        totalSweptCampaigns: sweptCampaignsCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
