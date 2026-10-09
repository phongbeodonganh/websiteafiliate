import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoCallout, InfoSection, InstitutionalPage } from '@/components/InstitutionalPage';
import { BRAND_EMAIL } from '@/lib/brand';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Điều khoản sử dụng',
  description: 'Các điều khoản điều chỉnh việc truy cập và sử dụng website, nội dung, bản tin và liên kết đối tác của GoodPick.',
  path: '/terms',
});

const UPDATED = '10 tháng 10, 2026';
const navItems = [
  { id: 'acceptance', label: 'Chấp nhận điều khoản' },
  { id: 'service', label: 'Phạm vi dịch vụ' },
  { id: 'information', label: 'Thông tin & quyết định mua' },
  { id: 'acceptable-use', label: 'Sử dụng hợp lệ' },
  { id: 'intellectual-property', label: 'Sở hữu trí tuệ' },
  { id: 'third-parties', label: 'Website bên thứ ba' },
  { id: 'newsletter', label: 'Bản tin' },
  { id: 'disclaimers', label: 'Tuyên bố miễn trừ' },
  { id: 'liability', label: 'Giới hạn trách nhiệm' },
  { id: 'changes', label: 'Thay đổi & liên hệ' },
];

export default function TermsPage() {
  return (
    <InstitutionalPage
      eyebrow="Điều khoản sử dụng"
      title="Nguyên tắc khi sử dụng GoodPick."
      description="Các điều khoản này áp dụng cho website công khai, nội dung biên tập, bản tin và liên kết đến sản phẩm của bên thứ ba."
      documentCode="ĐIỀU KHOẢN / 001"
      statusLabel="Đang áp dụng"
      updated={UPDATED}
      navItems={navItems}
      readingTime="7 phút đọc"
      asideTitle="Cần giải thích?"
      asideCopy="Liên hệ nếu có điều khoản nào chưa rõ trước khi tiếp tục sử dụng website."
    >
      <InfoSection id="acceptance" eyebrow="01 / Đồng ý" title="Chấp nhận điều khoản">
        <p>Khi truy cập hoặc sử dụng GoodPick, bạn đồng ý với Điều khoản này và xác nhận đã đọc <Link href="/privacy-policy">Chính sách bảo mật</Link> cùng <Link href="/affiliate-disclosure">Công bố liên kết tiếp thị</Link>. Nếu không đồng ý, vui lòng ngừng sử dụng website.</p>
      </InfoSection>

      <InfoSection id="service" eyebrow="02 / Dịch vụ" title="Phạm vi nội dung">
        <p>GoodPick xuất bản đánh giá, so sánh, hướng dẫn chọn mua, bản tin và thông tin về sản phẩm hoặc ưu đãi của bên thứ ba. Tính năng, danh mục và phạm vi nội dung có thể thay đổi.</p>
      </InfoSection>

      <InfoSection id="information" eyebrow="03 / Quyết định" title="Thông tin & quyết định mua hàng">
        <p>Nội dung mang tính thông tin chung, không phải tư vấn cá nhân, kỹ thuật, y tế, pháp lý hoặc tài chính. Giá, tồn kho, thông số, bảo hành và chính sách có thể thay đổi.</p>
        <InfoCallout title="Hãy xác minh trước khi mua" tone="accent"><p>Kiểm tra thông tin quan trọng trực tiếp với nhà bán lẻ và cân nhắc nhu cầu, ngân sách, điều kiện sử dụng của riêng bạn.</p></InfoCallout>
      </InfoSection>

      <InfoSection id="acceptable-use" eyebrow="04 / Hành vi" title="Sử dụng hợp lệ">
        <p>Bạn có thể dùng website cho mục đích cá nhân hoặc nghiên cứu nội bộ hợp pháp. Không được xâm nhập, phá hoại, phát tán mã độc, thu thập dữ liệu quy mô lớn trái phép, mạo danh GoodPick, xóa công bố hoặc gửi nội dung lừa đảo.</p>
      </InfoSection>

      <InfoSection id="intellectual-property" eyebrow="05 / Quyền sở hữu" title="Sở hữu trí tuệ">
        <p>Văn bản, thiết kế, thương hiệu, đồ họa, cách tuyển chọn và phần mềm gốc thuộc GoodPick hoặc được sử dụng theo giấy phép. Bạn có thể dẫn liên kết và trích đoạn giới hạn theo pháp luật; không được sao chép toàn bộ hoặc thương mại hóa nếu chưa được phép.</p>
        <p>Tên, hình ảnh và nhãn hiệu sản phẩm thuộc chủ sở hữu tương ứng.</p>
      </InfoSection>

      <InfoSection id="third-parties" eyebrow="06 / Bên ngoài" title="Liên kết & giao dịch với bên thứ ba">
        <p>GoodPick liên kết tới website do bên thứ ba vận hành và không kiểm soát giá, tồn kho, bảo mật, thanh toán, giao hàng, đổi trả hoặc hỗ trợ khách hàng của họ. Giao dịch của bạn được thực hiện với nhà bán lẻ và tuân theo điều khoản của họ.</p>
        <p>Một số liên kết là affiliate và có thể mang lại hoa hồng mà không làm tăng giá bạn trả.</p>
      </InfoSection>

      <InfoSection id="newsletter" eyebrow="07 / Email" title="Bản tin">
        <p>Khi đăng ký, bạn cho phép chúng tôi gửi nội dung đã yêu cầu đến email đã cung cấp. Bạn có thể hủy đăng ký bằng liên kết trong email hoặc liên hệ <a href={`mailto:${BRAND_EMAIL}?subject=${encodeURIComponent('Hủy đăng ký bản tin')}`}>{BRAND_EMAIL}</a>.</p>
      </InfoSection>

      <InfoSection id="disclaimers" eyebrow="08 / Bảo đảm" title="Tuyên bố miễn trừ">
        <p>Trong phạm vi pháp luật cho phép, website và nội dung được cung cấp theo trạng thái hiện có. Chúng tôi áp dụng sự cẩn trọng hợp lý nhưng không bảo đảm nội dung luôn đầy đủ, không lỗi, phù hợp cho mọi nhu cầu hoặc website luôn hoạt động liên tục.</p>
      </InfoSection>

      <InfoSection id="liability" eyebrow="09 / Rủi ro" title="Giới hạn trách nhiệm">
        <p>Trong phạm vi pháp luật cho phép, GoodPick và cộng tác viên không chịu trách nhiệm cho tổn thất gián tiếp hoặc phát sinh từ việc dựa vào nội dung, sử dụng dịch vụ bên thứ ba hoặc không thể truy cập website. Các quyền người tiêu dùng không thể bị loại trừ theo luật vẫn được giữ nguyên.</p>
      </InfoSection>

      <InfoSection id="changes" eyebrow="10 / Vận hành" title="Thay đổi & liên hệ">
        <p>Chúng tôi có thể cập nhật Điều khoản khi dịch vụ hoặc yêu cầu pháp lý thay đổi. Ngày ở đầu trang xác định phiên bản hiện hành. Nếu một điều khoản không thể thi hành, các phần còn lại vẫn có hiệu lực.</p>
        <p>Câu hỏi có thể gửi tới <a href={`mailto:${BRAND_EMAIL}?subject=${encodeURIComponent('Câu hỏi về điều khoản')}`}>{BRAND_EMAIL}</a>.</p>
      </InfoSection>
    </InstitutionalPage>
  );
}
