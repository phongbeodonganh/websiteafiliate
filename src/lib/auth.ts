import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { isBlacklisted } from './tokenBlacklist';

// Đọc lazy (lúc thực sự sign/verify token) thay vì lúc import module — import module
// này (vd Next.js phân tích route lúc build, hoặc 1 test file import gián tiếp) không
// còn tự throw nữa; chỉ throw khi có request thật cần JWT_SECRET, đúng lúc bắt buộc
// phải có nó. Cùng lý do/pattern với getMongoUri() trong mongodb.ts.
function getJwtSecret(): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Provide it via the JWT_SECRET environment variable.');
  }
  return process.env.JWT_SECRET;
}

export interface AuthPayload {
  userId: string | number;
  username: string;
  role: 'admin' | 'editor' | 'author';
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Sign JWT Token (thời hạn 24h theo spec)
export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '24h' });
}

// Verify JWT Token
export function verifyToken(token: string): AuthPayload | null {
  if (isBlacklisted(token)) return null;
  try {
    return jwt.verify(token, getJwtSecret()) as AuthPayload;
  } catch (error) {
    return null;
  }
}

// Lấy thông tin user đăng nhập từ Request Header
export function getAuthUser(req: Request): AuthPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}
