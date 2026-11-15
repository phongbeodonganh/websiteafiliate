/**
 * Stress Test Script for Next.js Affiliate Article (Node.js Autocannon)
 *
 * Chạy test tự động theo 3 cấp độ tải: 50 -> 200 -> 500 connections (Max 500)
 * Đo lường: Throughput (req/s), Latency (p50, p95, p99), Error Rate (5xx/Timeouts)
 *
 * Cách chạy:
 *   npm run test:load -- --url=https://aidealsuk.com/article/gohighlevel-vs-lemlist
 */

import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
let targetUrl = 'http://localhost:3000';

for (const arg of args) {
  if (arg.startsWith('--url=')) {
    targetUrl = arg.split('=')[1];
  }
}

if (!targetUrl.startsWith('http')) {
  console.error('❌ Lỗi: URL phải bắt đầu bằng http:// hoặc https://');
  process.exit(1);
}

// Giới hạn 3 giai đoạn tối đa 500 concurrent connections
const stages = [
  { name: 'Giai đoạn 1: Khởi động & Baseline', connections: 50, duration: 15 },
  { name: 'Giai đoạn 2: Tải trung bình (Ads chạy đều)', connections: 200, duration: 20 },
  { name: 'Giai đoạn 3: Tải cao điểm (500 Concurrent Peak)', connections: 500, duration: 25 },
];

console.log('================================================================');
console.log('🔥 BẮT ĐẦU TEST TẢI WEBSITE AFILIATE (MAX 500 CONNECTIONS)');
console.log(`🎯 Mục tiêu kiểm thử: ${targetUrl}`);
console.log('⚠️  LƯU Ý: Chạy script này từ MÁY CỦA BẠN (hoặc 1 VPS thứ 2),');
console.log('          KHÔNG CHẠY TRỰC TIẾP TRÊN CHÍNH VPS HOSTING!');
console.log('================================================================\n');

function runAutocannon(connections, duration) {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'npx' : 'npx';
    const childArgs = [
      'autocannon',
      '-c', connections.toString(),
      '-d', duration.toString(),
      '-p', '1',
      '-m', 'GET',
      '-H', 'Accept-Encoding: gzip, deflate, br',
      '-H', 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      '--renderStatusCodes',
      '-j',
      targetUrl,
    ];

    const child = spawn(cmd, childArgs, {
      shell: true, // Fix lỗi spawn EINVAL trên Windows
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Autocannon thoát với mã lỗi ${code}: ${stderr || stdout}`));
      }
      try {
        const jsonStart = stdout.indexOf('{');
        const jsonEnd = stdout.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) {
          throw new Error('Không tìm thấy JSON output');
        }
        const cleanJson = stdout.substring(jsonStart, jsonEnd + 1);
        const json = JSON.parse(cleanJson);
        resolve(json);
      } catch (e) {
        reject(new Error(`Không parse được kết quả: ${e.message}\nRaw output: ${stdout.slice(0, 300)}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function runAllStages() {
  const summaryResults = [];

  for (const stage of stages) {
    console.log(`\n▶️  [ĐANG CHẠY] ${stage.name}`);
    console.log(`   - Số kết nối đồng thời: ${stage.connections}`);
    console.log(`   - Thời gian test: ${stage.duration} giây...`);

    try {
      const res = await runAutocannon(stage.connections, stage.duration);
      
      const rps = res.requests?.average || 0;
      const p50 = res.latency?.p50 || res.latency?.average || 0;
      const p95 = res.latency?.p97_5 || res.latency?.p99 || 0;
      const timeouts = res.timeouts || 0;
      const non2xx = res.non2xx || 0;
      const totalRequests = res.requests?.total || 0;
      const errorRate = totalRequests > 0 ? (((timeouts + non2xx) / totalRequests) * 100).toFixed(2) : 0;

      const passed = Number(errorRate) < 1.0 && p95 < 2500;

      summaryResults.push({
        Stage: stage.name.split(':')[0],
        Connections: stage.connections,
        'Req/sec': Math.round(rps),
        'Latency p50': `${p50} ms`,
        'Latency p95': `${p95} ms`,
        'Lỗi/Timeouts': `${timeouts + non2xx} (${errorRate}%)`,
        'Đánh giá': passed ? '✅ ĐẠT' : '❌ NGHẼN/RỚT',
      });

      console.log(`   ➔ Kết quả: ${Math.round(rps)} req/s | p50: ${p50}ms | p95: ${p95}ms | Lỗi: ${errorRate}%`);
    } catch (err) {
      console.error(`   ❌ Lỗi: ${err.message}`);
      summaryResults.push({
        Stage: stage.name.split(':')[0],
        Connections: stage.connections,
        'Req/sec': 'ERR',
        'Latency p50': 'N/A',
        'Latency p95': 'N/A',
        'Lỗi/Timeouts': '100%',
        'Đánh giá': '💥 LỖI THỰC THI',
      });
      break;
    }
  }

  console.log('\n\n================================================================');
  console.log('📊 TỔNG HỢP KẾT QUẢ ĐỔ TẢI (MAX 500 CONCURRENT CONNECTIONS)');
  console.log('================================================================');
  console.table(summaryResults);

  console.log('\n💡 CÁCH ĐỌC KẾT QUẢ:');
  console.log('1. Đạt ở 200 & 500 connections: VPS 2 vCPU của bạn đủ sức cân peak time ads!');
  console.log('2. Báo lỗi/timeout ở 200 hoặc 500: Server bị nghẽn CPU hoặc chưa bật PM2 cluster.');
  console.log('================================================================\n');
}

runAllStages().catch(console.error);
