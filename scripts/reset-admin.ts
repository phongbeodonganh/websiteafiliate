import { connectToDatabase } from '../src/lib/db/mongodb';
import { UserModel } from '../src/lib/db/models';
import { hashPassword } from '../src/lib/auth';

// SEC-01/D-04: khôi phục mật khẩu admin chỉ tồn tại duy nhất ở đây (CLI trên
// VPS) — KHÔNG có đường dẫn web nào cho việc này (route seed đã bị xóa hẳn,
// D-01). Cấu trúc copy 1:1 từ scripts/create-admin.ts.
async function resetAdmin() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Usage: tsx scripts/reset-admin.ts <username> <password>');
    process.exit(1);
  }

  await connectToDatabase();

  const password_hash = await hashPassword(password);

  // Upsert: user chưa có → tạo mới với role admin/status active;
  // đã có → đặt lại mật khẩu (bcrypt) và kích hoạt lại tài khoản.
  const user = await UserModel.findOneAndUpdate(
    { username },
    { $set: { password_hash, role: 'admin', status: 'active' } },
    { upsert: true, new: true }
  );

  // Chỉ in username + id — không bao giờ echo/log/persist giá trị mật khẩu gốc.
  console.log(`Admin password reset: ${user.username} (id: ${user._id})`);
  process.exit(0);
}

resetAdmin().catch((err) => {
  console.error('Failed to reset admin password:', err);
  process.exit(1);
});
