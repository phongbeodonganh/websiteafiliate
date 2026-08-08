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
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

// Simple CSV Line Parser handling quotes & commas
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// POST /api/v1/cms/blacklist/import-sheet-url
export async function POST(req: NextRequest) {
  try {
    const user = await verifyAdminAuth();
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ status: 'error', message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sheetUrl } = body;

    if (!sheetUrl || typeof sheetUrl !== 'string') {
      return NextResponse.json({ status: 'error', message: 'Vui lòng cung cấp URL Google Sheet hợp lệ.' }, { status: 400 });
    }

    // Extract Document ID and GID from Google Sheet URL
    const docIdMatch = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!docIdMatch || !docIdMatch[1]) {
      return NextResponse.json({ status: 'error', message: 'Không thể nhận diện Google Sheet ID từ URL.' }, { status: 400 });
    }

    const docId = docIdMatch[1];
    const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    const csvExportUrl = `https://docs.google.com/spreadsheets/d/${docId}/export?format=csv&gid=${gid}`;

    // Fetch CSV from Google Sheets
    const csvResponse = await fetch(csvExportUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!csvResponse.ok) {
      return NextResponse.json(
        { status: 'error', message: `Không thể tải file CSV từ Google Sheet. Vui lòng đảm bảo Google Sheet đã mở quyền xem (Public). Status: ${csvResponse.status}` },
        { status: 400 }
      );
    }

    const csvText = await csvResponse.text();
    const lines = csvText.split(/\r?\n/);

    await connectToDatabase();

    let importedCount = 0;
    let sweptCampaignsCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const columns = parseCsvLine(line);
      const projectName = columns[0] || '';
      const websiteUrl = columns[1] || '';
      const reason = columns[2] || 'Bắt Ads - Không trả tiền';
      const blockedCountriesStr = columns[7] || columns[3] || '';

      // Skip header rows or invalid rows
      if (
        !websiteUrl ||
        websiteUrl.toLowerCase().includes('website') ||
        projectName.toLowerCase().includes('tên dự án') ||
        projectName.toLowerCase().includes('bảng cập nhật')
      ) {
        continue;
      }

      const blockedCountries = typeof blockedCountriesStr === 'string'
        ? blockedCountriesStr.replace(/^"/, '').replace(/"$/, '').split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      const { rootDomain, hostname } = extractDomainFromUrl(websiteUrl);
      const domainToSave = rootDomain || hostname || websiteUrl.trim().toLowerCase();

      if (!domainToSave || domainToSave.length < 3) continue;

      await BlacklistModel.findOneAndUpdate(
        { extracted_domain: domainToSave },
        {
          project_name: projectName || domainToSave,
          website_url: websiteUrl,
          extracted_domain: domainToSave,
          match_type: 'domain',
          reason: reason || 'Bắt Ads - Không trả tiền',
          blocked_countries: blockedCountries,
          status: 'active',
          created_by: user.id,
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
        csvExportUrl,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}
