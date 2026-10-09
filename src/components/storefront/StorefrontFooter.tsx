import Link from "next/link";
import { BadgeCheck, Mail, Sparkles } from "lucide-react";
import styles from "./storefront.module.css";

export default function StorefrontFooter() {
  return (
    <footer className={styles.footer} data-motion="fade">
      <div className={styles.footerGrid}>
        <div className={styles.footerBrand}>
          <Link href="/" className={styles.logo} aria-label="Trang chủ GoodPick">
            <span className={styles.logoMark}><Sparkles size={18} /></span>
            <span>GOOD<span>PICK</span></span>
          </Link>
          <p>Đánh giá độc lập, so sánh dễ hiểu và ưu đãi được kiểm tra để bạn chọn đúng sản phẩm ngay từ đầu.</p>
          <span className={styles.footerPromise}><BadgeCheck size={15} /> Minh bạch liên kết tiếp thị</span>
        </div>
        <div>
          <strong>Danh mục</strong>
          <Link href="/?category=tech#deals">Công nghệ</Link>
          <Link href="/?category=home-kitchen#deals">Nhà &amp; Bếp</Link>
          <Link href="/?category=garden#deals">Làm vườn</Link>
          <Link href="/#guides">Hướng dẫn chọn mua</Link>
        </div>
        <div>
          <strong>Thông tin tin cậy</strong>
          <Link href="/about">Về chúng tôi</Link>
          <Link href="/contact">Liên hệ</Link>
          <Link href="/privacy-policy">Chính sách bảo mật</Link>
          <Link href="/terms">Điều khoản sử dụng</Link>
          <Link href="/affiliate-disclosure">Công bố liên kết tiếp thị</Link>
        </div>
        <div className={styles.footerNewsletter}>
          <Mail size={20} />
          <strong>Điều đáng biết, mỗi tuần một lần.</strong>
          <p>Giá giảm và hướng dẫn chọn mua thực sự hữu ích. Không gửi thư mỗi ngày.</p>
          <Link href="/#newsletter">Đăng ký bản tin</Link>
        </div>
      </div>
      <div className={styles.footerDisclosure}>
        <strong>Công bố liên kết tiếp thị:</strong> GoodPick có thể nhận hoa hồng khi bạn mua qua liên kết trên trang. Bạn không phải trả thêm phí và hoa hồng không ảnh hưởng đến đánh giá của chúng tôi.
      </div>
      <div className={styles.footerBottom}>
        <span>© {new Date().getFullYear()} GoodPick. Bảo lưu mọi quyền.</span>
        <span>Thông tin giá có thể thay đổi tại website của nhà bán lẻ.</span>
      </div>
    </footer>
  );
}
