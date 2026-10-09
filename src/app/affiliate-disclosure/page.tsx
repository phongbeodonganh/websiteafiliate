import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckItem, CheckList, InfoCallout, InfoSection, InstitutionalPage } from '@/components/InstitutionalPage';
import { BRAND_EMAIL } from '@/lib/brand';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Công bố liên kết tiếp thị',
  description: 'Cách liên kết affiliate tạo doanh thu cho GoodPick và nguyên tắc bảo vệ tính độc lập của nội dung.',
  path: '/affiliate-disclosure',
});

const UPDATED = '10 tháng 10, 2026';
const navItems = [
  { id: 'summary', label: 'Tóm tắt' },
  { id: 'mechanics', label: 'Cách liên kết hoạt động' },
  { id: 'labels', label: 'Cách nhận biết' },
  { id: 'independence', label: 'Tính độc lập' },
  { id: 'selection', label: 'Cách chọn ưu đãi' },
  { id: 'prices', label: 'Giá & tình trạng hàng' },
  { id: 'privacy', label: 'Theo dõi & quyền riêng tư' },
  { id: 'contact', label: 'Liên hệ' },
];

export default function AffiliateDisclosurePage() {
  return (
    <InstitutionalPage
      eyebrow="Công bố liên kết tiếp thị"
      title="GoodPick tạo doanh thu như thế nào?"
      description="Sự minh bạch thương mại là một phần của nội dung hữu ích. Trang này giải thích khi nào GoodPick có thể nhận hoa hồng."
      documentCode="CÔNG BỐ / 001"
      statusLabel="Đang áp dụng"
      updated={UPDATED}
      navItems={navItems}
      readingTime="5 phút đọc"
      asideTitle="Thiếu công bố?"
      asideCopy="Gửi URL và vị trí liên kết để chúng tôi kiểm tra."
    >
      <InfoSection id="summary" eyebrow="01 / Tóm tắt" title="Phiên bản ngắn gọn">
        <InfoCallout title="Một số liên kết mang lại hoa hồng" tone="accent"><p>Khi bạn nhấp liên kết và hoàn tất giao dịch đủ điều kiện, nhà bán lẻ có thể trả hoa hồng cho GoodPick. Thông thường việc này không làm tăng giá bạn trả.</p></InfoCallout>
        <p>Doanh thu affiliate hỗ trợ chi phí nghiên cứu, xuất bản và vận hành. Đối tác không được mua kết luận tích cực, ngăn chúng tôi nêu hạn chế hoặc bảo đảm xuất hiện trên trang.</p>
      </InfoSection>

      <InfoSection id="mechanics" eyebrow="02 / Cơ chế" title="Liên kết affiliate hoạt động ra sao">
        <p>Liên kết có thể chứa mã ghi nhận lượt truy cập hoặc giao dịch từ GoodPick. Khi bạn nhấp, hệ thống có thể ghi lại sản phẩm, vị trí liên kết, ưu đãi được chọn và thời điểm chuyển hướng.</p>
        <p>Nhà bán lẻ có thể dùng cookie hoặc mã giới thiệu theo chính sách riêng. Nếu giao dịch đáp ứng điều kiện chương trình, họ có thể trả một khoản hoặc tỷ lệ hoa hồng.</p>
      </InfoSection>

      <InfoSection id="labels" eyebrow="03 / Nhận biết" title="Cách chúng tôi nhận diện liên kết thương mại">
        <CheckList>
          <CheckItem>Liên kết affiliate dùng thuộc tính sponsored/nofollow khi phù hợp.</CheckItem>
          <CheckItem>CTA mua hàng và khu vực ưu đãi được trình bày tách biệt với nội dung đánh giá.</CheckItem>
          <CheckItem>Footer trên trang công khai luôn có thông báo affiliate.</CheckItem>
        </CheckList>
      </InfoSection>

      <InfoSection id="independence" eyebrow="04 / Ranh giới" title="Tính độc lập biên tập">
        <CheckList>
          <CheckItem>Hoa hồng không bảo đảm được đăng hoặc nhận điểm tích cực.</CheckItem>
          <CheckItem>Hạn chế và đánh đổi quan trọng phải được giữ lại.</CheckItem>
          <CheckItem>Ưu đãi không an toàn, sai lệch hoặc hết hiệu lực có thể bị gỡ bỏ.</CheckItem>
        </CheckList>
        <p>Xem thêm quy trình tại trang <Link href="/about">Về GoodPick</Link>.</p>
      </InfoSection>

      <InfoSection id="selection" eyebrow="05 / Chọn lọc" title="Cách ưu đãi được lựa chọn">
        <p>Chúng tôi cân nhắc mức độ phù hợp, tính hữu ích, chất lượng sản phẩm, sự rõ ràng của giá, uy tín nơi bán, tình trạng hàng và chính sách sau mua. Điều kiện hoa hồng không thay thế đánh giá về lợi ích cho người đọc.</p>
      </InfoSection>

      <InfoSection id="prices" eyebrow="06 / Xác minh" title="Giá, tuyên bố và tình trạng hàng">
        <p>Nhà bán lẻ kiểm soát giá, mã giảm, phí vận chuyển, đổi trả và tồn kho. Các thông tin này có thể thay đổi sau thời điểm GoodPick kiểm tra.</p>
        <InfoCallout title="Kiểm tra lần cuối trước khi trả tiền"><p>Hãy xác nhận giá cuối cùng, phí giao hàng, bảo hành, đổi trả và thông tin người bán trên trang thanh toán.</p></InfoCallout>
      </InfoSection>

      <InfoSection id="privacy" eyebrow="07 / Dữ liệu" title="Theo dõi & quyền riêng tư">
        <p>Chuyển hướng affiliate có thể ghi nhận ưu đãi, vị trí CTA, thời điểm nhấp và địa chỉ IP để đo lường, bảo mật và chống gian lận. Đối tác xử lý dữ liệu giao dịch theo chính sách của họ. Xem <Link href="/privacy-policy">Chính sách bảo mật</Link>.</p>
      </InfoSection>

      <InfoSection id="contact" eyebrow="08 / Trách nhiệm" title="Câu hỏi hoặc quan ngại">
        <p>Nếu công bố chưa rõ hoặc bị thiếu, hãy gửi URL và mô tả vị trí đến <a href={`mailto:${BRAND_EMAIL}?subject=${encodeURIComponent('Câu hỏi về công bố affiliate')}`}>{BRAND_EMAIL}</a>.</p>
      </InfoSection>
    </InstitutionalPage>
  );
}
