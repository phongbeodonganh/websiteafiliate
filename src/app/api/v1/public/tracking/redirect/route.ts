import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db/mongodb';
import { ClickLogModel, AffiliateLinkModel, ArticleModel } from '@/lib/db/models';
import { getClientIp, appendSubId } from '@/lib/utils';
import { checkUrlAgainstBlacklist } from '@/lib/blacklist';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const articleId = searchParams.get('article_id');
  const affiliateLinkId = searchParams.get('affiliate_link_id');
  const fallbackUrl = new URL('/', req.url);

  if (!affiliateLinkId || !mongoose.isValidObjectId(affiliateLinkId)) {
    return NextResponse.redirect(fallbackUrl);
  }

  try {
    await connectToDatabase();

    const [affiliateLink, article] = await Promise.all([
      AffiliateLinkModel.findById(affiliateLinkId),
      articleId && mongoose.isValidObjectId(articleId)
        ? ArticleModel.findById(articleId)
        : null,
    ]);

    if (!affiliateLink) {
      return NextResponse.redirect(fallbackUrl);
    }

    await ClickLogModel.create({
      ...(article ? { article_id: article._id } : {}),
      affiliate_link_id: affiliateLink._id,
      ip_address: getClientIp(req),
    });

    const blacklistCheck = await checkUrlAgainstBlacklist(affiliateLink.base_url);
    if (affiliateLink.status === 'blacklisted' || blacklistCheck.isBlacklisted) {
      const reason =
        blacklistCheck.reason ||
        'Nền tảng vi phạm chính sách an toàn / bùng hoa hồng';
      const projectName = blacklistCheck.projectName || affiliateLink.name;

      const warningHtml = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Cảnh Báo An Toàn | AI AFFILIATE HUB</title>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-950 text-slate-100 font-sans min-h-screen flex items-center justify-center p-6">
          <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl space-y-6">
            <div class="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold border border-rose-500/30">
              🛑
            </div>
            <div>
              <span class="text-xs font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                Blacklist Interceptor Guard
              </span>
              <h1 class="text-2xl font-black text-white mt-3 mb-2">Đã Chặn Liên Kết Rủi Ro</h1>
              <p class="text-xs text-slate-400 leading-relaxed">
                Đường dẫn tới dự án <strong class="text-rose-400">${projectName}</strong> đã bị hệ thống <strong class="text-amber-400">AI AFFILIATE HUB</strong> vô hiệu hóa nhằm bảo vệ độc giả.
              </p>
            </div>
            <div class="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left text-xs space-y-2">
              <p class="text-slate-400"><strong class="text-slate-200">Lý do chặn:</strong> ${reason}</p>
              ${blacklistCheck.blockedCountries &&
          blacklistCheck.blockedCountries.length > 0
          ? `<p class="text-slate-400"><strong class="text-slate-200">Quốc gia cấm:</strong> ${blacklistCheck.blockedCountries.join(', ')}</p>`
          : ''
        }
            </div>
            <a href="/" class="inline-block w-full py-3.5 bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 text-slate-950 font-bold rounded-xl text-sm hover:scale-[1.02] transition-transform">
              ← Quay Về Trang Chủ An Toàn
            </a>
          </div>
        </body>
        </html>
      `;

      return new Response(warningHtml, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const destinationUrl = appendSubId(
      affiliateLink.base_url,
      article?.slug || 'homepage',
    );
    const response = NextResponse.redirect(destinationUrl, 302);
    response.headers.set('Cache-Control', 'no-store');
    return response;
  } catch (error) {
    console.error('Redirect tracking error:', error);
    return NextResponse.redirect(fallbackUrl);
  }
}
