import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckItem, CheckList, InfoCallout, InfoSection, InstitutionalPage } from '@/components/InstitutionalPage';
import { BRAND_EMAIL } from '@/lib/brand';
import { createPageMetadata } from '@/lib/seo';

export const metadata: Metadata = createPageMetadata({
  title: 'Chính sách bảo mật',
  description: 'Cách GoodPick thu thập, sử dụng, bảo vệ và chia sẻ thông tin khi bạn dùng website và bản tin.',
  path: '/privacy-policy',
});

const UPDATED = '10 tháng 10, 2026';
const navItems = [
  { id: 'scope', label: 'Phạm vi' },
  { id: 'collection', label: 'Dữ liệu được thu thập' },
  { id: 'use', label: 'Mục đích sử dụng' },
  { id: 'sharing', label: 'Chia sẻ dữ liệu' },
  { id: 'cookies', label: 'Cookie & liên kết ngoài' },
  { id: 'retention', label: 'Lưu trữ & bảo mật' },
  { id: 'rights', label: 'Quyền của bạn' },
  { id: 'children', label: 'Trẻ em' },
  { id: 'changes', label: 'Thay đổi & liên hệ' },
];

export default function PrivacyPolicyPage() {
  return (
    <InstitutionalPage
      eyebrow="Chính sách bảo mật"
      title="Dữ liệu của bạn, được giải thích rõ ràng."
      description="Chính sách này mô tả dữ liệu GoodPick thu thập, mục đích sử dụng, trường hợp chia sẻ và lựa chọn của bạn."
      documentCode="BẢO MẬT / 001"
      statusLabel="Đang áp dụng"
      updated={UPDATED}
      navItems={navItems}
      readingTime="7 phút đọc"
      asideTitle="Yêu cầu về dữ liệu?"
      asideCopy={`Email ${BRAND_EMAIL} với tiêu đề “Yêu cầu quyền riêng tư”.`}
    >
      <InfoSection id="scope" eyebrow="01 / Phạm vi" title="Phạm vi áp dụng">
        <p>Chính sách áp dụng khi bạn truy cập website GoodPick, đăng ký bản tin, liên hệ hoặc nhấp liên kết affiliate trên website. “GoodPick”, “chúng tôi” trong chính sách này chỉ đơn vị vận hành website.</p>
        <InfoCallout title="Liên hệ về quyền riêng tư" tone="accent"><p>Gửi email đến <a href={`mailto:${BRAND_EMAIL}?subject=${encodeURIComponent('Yêu cầu quyền riêng tư')}`}>{BRAND_EMAIL}</a>. Không gửi giấy tờ tùy thân trừ khi chúng tôi yêu cầu để xác minh.</p></InfoCallout>
      </InfoSection>

      <InfoSection id="collection" eyebrow="02 / Thu thập" title="Thông tin chúng tôi có thể thu thập">
        <ul>
          <li><strong>Thông tin bạn cung cấp:</strong> email đăng ký bản tin, tên, nội dung liên hệ và thông tin bạn chủ động gửi.</li>
          <li><strong>Dữ liệu tương tác affiliate:</strong> sản phẩm hoặc vị trí CTA, ưu đãi được chọn, thời gian nhấp và địa chỉ IP.</li>
          <li><strong>Nhật ký kỹ thuật:</strong> địa chỉ IP, thời gian yêu cầu, trình duyệt hoặc thiết bị, URL và dữ liệu chẩn đoán.</li>
        </ul>
        <p>Website công khai không yêu cầu tạo tài khoản mua hàng và không trực tiếp thu thập thông tin thẻ thanh toán.</p>
      </InfoSection>

      <InfoSection id="use" eyebrow="03 / Mục đích" title="Cách chúng tôi sử dụng thông tin">
        <CheckList>
          <CheckItem>Gửi bản tin hoặc xác nhận mà bạn yêu cầu và quản lý danh sách đăng ký.</CheckItem>
          <CheckItem>Phản hồi liên hệ, xử lý đính chính và quản lý hợp tác.</CheckItem>
          <CheckItem>Đo lường tổng hợp mức quan tâm tới nội dung và ưu đãi.</CheckItem>
          <CheckItem>Phát hiện lạm dụng, bảo vệ website và chẩn đoán lỗi.</CheckItem>
          <CheckItem>Tuân thủ nghĩa vụ pháp lý và bảo vệ quyền hợp pháp.</CheckItem>
        </CheckList>
        <p>Chúng tôi không bán thông tin cá nhân của bạn.</p>
      </InfoSection>

      <InfoSection id="sharing" eyebrow="04 / Bên nhận" title="Khi nào thông tin được chia sẻ">
        <p>Dữ liệu chỉ được chia sẻ ở mức cần thiết với nhà cung cấp hạ tầng, cơ sở dữ liệu, bảo mật, gửi email; cố vấn chuyên môn hoặc cơ quan có thẩm quyền khi pháp luật yêu cầu; và bên kế nhiệm hợp pháp nếu website được chuyển giao.</p>
        <p>Nhà bán lẻ bạn truy cập qua liên kết ngoài tự chịu trách nhiệm về hoạt động xử lý dữ liệu trên website của họ.</p>
      </InfoSection>

      <InfoSection id="cookies" eyebrow="05 / Công nghệ" title="Cookie & liên kết bên thứ ba">
        <p>GoodPick có thể dùng lưu trữ kỹ thuật cần thiết cho bảo mật và vận hành. Nhà bán lẻ hoặc mạng affiliate có thể đặt cookie sau khi bạn rời website, theo chính sách riêng của họ.</p>
        <p>Hãy kiểm tra chính sách của website đích trước khi cung cấp dữ liệu hoặc thay đổi tùy chọn trình duyệt.</p>
      </InfoSection>

      <InfoSection id="retention" eyebrow="06 / Bảo vệ" title="Lưu trữ & bảo mật">
        <p>Thông tin được giữ trong thời gian cần thiết cho mục đích đã nêu, nghĩa vụ pháp lý, giải quyết tranh chấp và an toàn hệ thống. Chúng tôi áp dụng biện pháp kỹ thuật và tổ chức hợp lý, nhưng không hệ thống truyền hoặc lưu trữ nào an toàn tuyệt đối.</p>
      </InfoSection>

      <InfoSection id="rights" eyebrow="07 / Lựa chọn" title="Quyền của bạn">
        <p>Tùy nơi cư trú và luật áp dụng, bạn có thể yêu cầu truy cập, sửa, xóa, hạn chế hoặc phản đối xử lý dữ liệu; nhận bản sao dữ liệu; hoặc rút lại đồng ý nhận bản tin.</p>
        <p>Gửi yêu cầu đến <a href={`mailto:${BRAND_EMAIL}?subject=${encodeURIComponent('Yêu cầu quyền dữ liệu')}`}>{BRAND_EMAIL}</a>. Chúng tôi có thể cần xác minh danh tính ở mức phù hợp.</p>
      </InfoSection>

      <InfoSection id="children" eyebrow="08 / Độ tuổi" title="Trẻ em">
        <p>GoodPick dành cho đối tượng chung và không chủ đích thu thập thông tin cá nhân của trẻ em dưới 16 tuổi. Nếu cho rằng trẻ đã gửi dữ liệu, hãy liên hệ để chúng tôi xem xét.</p>
      </InfoSection>

      <InfoSection id="changes" eyebrow="09 / Cập nhật" title="Thay đổi & liên hệ">
        <p>Chính sách có thể được cập nhật khi dịch vụ, nhà cung cấp hoặc yêu cầu pháp lý thay đổi. Ngày cập nhật ở đầu trang cho biết phiên bản hiện hành.</p>
        <p>Câu hỏi về chính sách có thể gửi đến <a href={`mailto:${BRAND_EMAIL}`}>{BRAND_EMAIL}</a>. Xem thêm <Link href="/terms">Điều khoản sử dụng</Link> và <Link href="/affiliate-disclosure">Công bố liên kết tiếp thị</Link>.</p>
      </InfoSection>
    </InstitutionalPage>
  );
}
