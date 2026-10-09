import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeDollarSign, Compass, RefreshCw, SearchCheck, UsersRound } from 'lucide-react';
import { CheckItem, CheckList, InfoCallout, InfoSection, InstitutionalPage } from '@/components/InstitutionalPage';
import styles from '@/components/InstitutionalPage.module.css';
import { BRAND_EMAIL } from '@/lib/brand';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Về GoodPick',
  description: 'Tìm hiểu cách GoodPick đánh giá, so sánh giá và chọn sản phẩm công nghệ, gia dụng, làm vườn cho người mua.',
  path: '/about',
});

const navItems = [
  { id: 'mission', label: 'Sứ mệnh' },
  { id: 'work', label: 'Nội dung chúng tôi làm' },
  { id: 'standards', label: 'Tiêu chuẩn biên tập' },
  { id: 'independence', label: 'Tính độc lập' },
  { id: 'audience', label: 'GoodPick dành cho ai' },
  { id: 'corrections', label: 'Đính chính & góp ý' },
];

export default function AboutPage() {
  return (
    <InstitutionalPage
      eyebrow="Về GoodPick"
      title="Chọn đúng, trước khi xuống tiền."
      description="GoodPick là nền tảng nội dung độc lập giúp người mua hiểu sản phẩm vật lý, so sánh ưu đãi và nhìn rõ cả điểm mạnh lẫn hạn chế."
      documentCode="BIÊN TẬP / 001"
      statusLabel="Nội dung độc lập"
      navItems={navItems}
      readingTime="4 phút đọc"
      asideTitle="Có thông tin cần đính chính?"
      asideCopy="Chúng tôi tiếp nhận nguồn tin, trải nghiệm sản phẩm thực tế và góp ý có căn cứ."
    >
      <InfoSection id="mission" eyebrow="Mục đích" title="Sứ mệnh của chúng tôi">
        <p>Giữa hàng nghìn mẫu mã, thông số và lời quảng cáo, GoodPick giúp rút ngắn quá trình tìm hiểu. Chúng tôi chuyển dữ liệu sản phẩm, giá bán, chính sách và tình huống sử dụng thành thông tin dễ ra quyết định.</p>
        <InfoCallout title="Cam kết biên tập" tone="accent"><p>Mỗi nội dung phải giúp bạn hiểu rõ hơn trước khi mua — không chỉ khiến sản phẩm trông hấp dẫn hơn.</p></InfoCallout>
      </InfoSection>

      <InfoSection id="work" eyebrow="Phạm vi" title="Nội dung chúng tôi thực hiện">
        <div className={styles.valueGrid}>
          <div className={styles.valueCard}><SearchCheck aria-hidden="true" /><h3>Đánh giá sản phẩm</h3><p>Tập trung vào tính năng, chất lượng, hạn chế và người dùng phù hợp.</p></div>
          <div className={styles.valueCard}><Compass aria-hidden="true" /><h3>So sánh lựa chọn</h3><p>Đặt các phương án cạnh nhau theo nhu cầu thực tế, không chỉ theo cấu hình.</p></div>
          <div className={styles.valueCard}><RefreshCw aria-hidden="true" /><h3>Kiểm tra ưu đãi</h3><p>Ghi rõ nơi bán, giá, mã giảm và thời điểm thông tin được kiểm tra.</p></div>
          <div className={styles.valueCard}><BadgeDollarSign aria-hidden="true" /><h3>Hướng dẫn chọn mua</h3><p>Giải thích thuật ngữ và tiêu chí quan trọng bằng ngôn ngữ dễ hiểu.</p></div>
        </div>
      </InfoSection>

      <InfoSection id="standards" eyebrow="Phương pháp" title="Tiêu chuẩn biên tập">
        <CheckList>
          <CheckItem>Đánh giá sản phẩm theo công việc và nhu cầu mà sản phẩm tuyên bố đáp ứng.</CheckItem>
          <CheckItem>Tách biệt dữ kiện, nhận định biên tập và tuyên bố từ nhà sản xuất.</CheckItem>
          <CheckItem>Nêu cả ưu điểm, hạn chế và trường hợp không nên mua.</CheckItem>
          <CheckItem>Cập nhật hoặc đính chính khi có thông tin đáng tin cậy hơn.</CheckItem>
        </CheckList>
      </InfoSection>

      <InfoSection id="independence" eyebrow="Minh bạch" title="Cách chúng tôi giữ tính độc lập">
        <p>Một số liên kết có thể mang lại hoa hồng cho GoodPick khi bạn mua hàng, nhưng không làm tăng giá bạn trả. Hoa hồng không mua được điểm số, kết luận tích cực hoặc vị trí trong danh sách đề xuất.</p>
        <p>Chi tiết được trình bày tại trang <Link href="/affiliate-disclosure">Công bố liên kết tiếp thị</Link>.</p>
      </InfoSection>

      <InfoSection id="audience" eyebrow="Người đọc" title="GoodPick dành cho ai">
        <CheckList>
          <CheckItem>Người muốn mua đồ công nghệ, gia dụng, làm vườn hoặc sản phẩm thiết thực.</CheckItem>
          <CheckItem>Người cần so sánh nhanh nhưng vẫn muốn hiểu rõ đánh đổi.</CheckItem>
          <CheckItem>Người quan tâm giá, bảo hành, vận chuyển và đổi trả trước khi chốt.</CheckItem>
        </CheckList>
        <div className={styles.valueCard}><UsersRound aria-hidden="true" /><h3>Ưu tiên người đọc</h3><p>Chúng tôi viết cho người đang ra quyết định, không viết lại thông cáo quảng cáo.</p></div>
      </InfoSection>

      <InfoSection id="corrections" eyebrow="Trách nhiệm" title="Đính chính & góp ý">
        <p>Nếu phát hiện lỗi, giá cũ hoặc thiếu công bố, hãy gửi URL trang cùng nguồn đối chiếu đến <a href={`mailto:${BRAND_EMAIL}?subject=${encodeURIComponent('Đính chính nội dung GoodPick')}`}>{BRAND_EMAIL}</a>. Với câu hỏi chung hoặc hợp tác, vui lòng dùng trang <Link href="/contact">Liên hệ</Link>.</p>
      </InfoSection>
    </InstitutionalPage>
  );
}
