import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Handshake, MessageSquareText, Newspaper, ShieldAlert } from 'lucide-react';
import { CheckItem, CheckList, InfoCallout, InfoSection, InstitutionalPage } from '@/components/InstitutionalPage';
import styles from '@/components/InstitutionalPage.module.css';
import { BRAND_EMAIL } from '@/lib/brand';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Liên hệ GoodPick',
  description: 'Liên hệ GoodPick về nội dung, đính chính, hợp tác tiếp thị liên kết, quyền riêng tư hoặc pháp lý.',
  path: '/contact',
});

const navItems = [
  { id: 'channels', label: 'Chọn nội dung liên hệ' },
  { id: 'details', label: 'Thông tin nên cung cấp' },
  { id: 'response', label: 'Thời gian phản hồi' },
  { id: 'privacy', label: 'Quyền riêng tư & an toàn' },
];

const emailHref = (subject: string) => `mailto:${BRAND_EMAIL}?subject=${encodeURIComponent(subject)}`;

export default function ContactPage() {
  return (
    <InstitutionalPage
      eyebrow="Liên hệ"
      title="Gửi đúng thông tin, nhận đúng hỗ trợ."
      description="GoodPick tiếp nhận câu hỏi, đính chính có căn cứ và đề xuất hợp tác minh bạch."
      documentCode="LIÊN HỆ / MỞ"
      statusLabel="Hộp thư đang hoạt động"
      navItems={navItems}
      readingTime="Phản hồi thường trong 2–3 ngày làm việc"
      asideTitle="Một địa chỉ liên hệ"
      asideCopy={`Mọi yêu cầu bắt đầu tại ${BRAND_EMAIL}. Tiêu đề rõ ràng giúp chúng tôi xử lý nhanh hơn.`}
    >
      <InfoSection id="channels" eyebrow="Kết nối" title="Chọn nội dung liên hệ">
        <div className={styles.channelGrid}>
          <div className={styles.channelCard}><MessageSquareText aria-hidden="true" /><h3>Câu hỏi chung</h3><p>Hỏi về GoodPick, cách website hoạt động hoặc nội dung đã đăng.</p><a href={emailHref('Câu hỏi chung')}>Gửi email <ArrowUpRight aria-hidden="true" /></a></div>
          <div className={styles.channelCard}><Newspaper aria-hidden="true" /><h3>Nội dung & đính chính</h3><p>Báo lỗi dữ kiện, giá cũ, thông tin sản phẩm thay đổi hoặc cung cấp nguồn.</p><a href={emailHref('Đính chính nội dung')}>Liên hệ biên tập <ArrowUpRight aria-hidden="true" /></a></div>
          <div className={styles.channelCard}><Handshake aria-hidden="true" /><h3>Hợp tác</h3><p>Chương trình affiliate, quyền truy cập sản phẩm và đề xuất thương mại minh bạch.</p><a href={emailHref('Đề xuất hợp tác')}>Trao đổi hợp tác <ArrowUpRight aria-hidden="true" /></a></div>
          <div className={styles.channelCard}><ShieldAlert aria-hidden="true" /><h3>Quyền riêng tư & pháp lý</h3><p>Yêu cầu dữ liệu, công bố liên kết, bản quyền hoặc vấn đề pháp lý.</p><a href={emailHref('Yêu cầu quyền riêng tư hoặc pháp lý')}>Gửi yêu cầu <ArrowUpRight aria-hidden="true" /></a></div>
        </div>
        <InfoCallout title="Địa chỉ chính" tone="accent"><p>Email <a href={`mailto:${BRAND_EMAIL}`}>{BRAND_EMAIL}</a>. Không gửi mật khẩu, thông tin thẻ, mã API hoặc dữ liệu nhạy cảm khác.</p></InfoCallout>
      </InfoSection>

      <InfoSection id="details" eyebrow="Chuẩn bị" title="Thông tin nên cung cấp">
        <CheckList>
          <CheckItem>Tiêu đề ngắn gọn mô tả yêu cầu.</CheckItem>
          <CheckItem>URL trang GoodPick liên quan, nếu có.</CheckItem>
          <CheckItem>Nguồn đối chiếu cho nội dung cần đính chính.</CheckItem>
          <CheckItem>Tên và địa chỉ email bạn muốn nhận phản hồi.</CheckItem>
        </CheckList>
        <p>Với đề xuất hợp tác, hãy ghi rõ website sản phẩm, vấn đề sản phẩm giải quyết, giá, khu vực phân phối và quan hệ thương mại được đề xuất.</p>
      </InfoSection>

      <InfoSection id="response" eyebrow="Thời gian" title="Thời gian phản hồi">
        <p>Chúng tôi cố gắng xem xét yêu cầu hợp lệ trong 2–3 ngày làm việc. Đính chính phức tạp, yêu cầu quyền dữ liệu và vấn đề pháp lý có thể cần thêm thời gian xác minh.</p>
        <dl className={styles.detailGrid}>
          <div><dt>Email</dt><dd>{BRAND_EMAIL}</dd></div>
          <div><dt>Ngôn ngữ</dt><dd>Tiếng Việt / English</dd></div>
          <div><dt>Đính chính</dt><dd>Cần nguồn đối chiếu</dd></div>
          <div><dt>Tệp đính kèm lạ</dt><dd>Nên gửi liên kết thay thế</dd></div>
        </dl>
      </InfoSection>

      <InfoSection id="privacy" eyebrow="An toàn" title="Quyền riêng tư & an toàn">
        <p>Thông tin bạn gửi được dùng để hiểu, phản hồi yêu cầu, lưu hồ sơ phù hợp và bảo vệ hệ thống. Chỉ chia sẻ nội dung cần thiết. Xem thêm tại <Link href="/privacy-policy">Chính sách bảo mật</Link>.</p>
        <InfoCallout title="Không bán kết luận"><p>Việc gửi mẫu sản phẩm hoặc đề xuất thương mại không bảo đảm được đăng bài, xếp hạng hoặc nhận đánh giá tích cực.</p></InfoCallout>
      </InfoSection>
    </InstitutionalPage>
  );
}
