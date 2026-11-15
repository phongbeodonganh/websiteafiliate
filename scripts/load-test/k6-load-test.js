import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Grafana k6 Load Test Script (Max 500 VUs)
 * Mô phỏng 500 người dùng đồng thời (500 Concurrent Users) đọc bài viết.
 */

const TARGET_URL = __ENV.TARGET_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '20s', target: 50 },   // 20s đầu: tăng dần lên 50 user (Warmup)
    { duration: '40s', target: 200 },  // 40s tiếp: tăng lên 200 user (Medium Ads traffic)
    { duration: '1m',  target: 500 },  // 1 phút: duy trì 500 user đọc bài cùng lúc (Peak Ads)
    { duration: '20s', target: 0 },    // 20s cuối: hạ tải về 0 (Cooldown)
  ],

  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<3500'],
    http_req_failed: ['rate<0.01'],
  },

  batch: 20,
  batchPerHost: 20,
};

export default function () {
  const params = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LoadTestBot/1.0',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
    },
    timeout: '10s',
  };

  const res = http.get(TARGET_URL, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response body received': (r) => r.body && r.body.length > 500,
  });

  const readingTime = Math.random() * 5 + 3; // dừng lại đọc 3 - 8s
  sleep(readingTime);
}
