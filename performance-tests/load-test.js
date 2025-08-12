import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// カスタムメトリクス
const errorRate = new Rate('errors');

// テスト設定
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // 30秒で10ユーザーまで増加
    { duration: '1m', target: 10 },   // 1分間10ユーザーを維持
    { duration: '30s', target: 50 },  // 30秒で50ユーザーまで増加
    { duration: '2m', target: 50 },   // 2分間50ユーザーを維持
    { duration: '30s', target: 100 }, // 30秒で100ユーザーまで増加
    { duration: '1m', target: 100 },  // 1分間100ユーザーを維持
    { duration: '1m', target: 0 },    // 1分で0ユーザーまで減少
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95%のリクエストが500ms以内
    errors: ['rate<0.1'],              // エラー率が10%未満
    http_req_failed: ['rate<0.1'],     // リクエスト失敗率が10%未満
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const API_TOKEN = __ENV.API_TOKEN || '';

// Setup function - run once before the test
export function setup() {
  // ログイン処理やテストデータの準備
  const loginRes = http.post(`${BASE_URL}/api/auth/login`, {
    email: 'test@example.com',
    password: 'password',
  });
  
  if (loginRes.status !== 200) {
    console.error('Login failed');
    return { token: null };
  }
  
  const token = loginRes.json('access_token');
  return { token };
}

// Main test function
export default function (data) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: data.token ? `Bearer ${data.token}` : '',
    },
  };

  // シナリオ1: ダッシュボード表示
  let res = http.get(`${BASE_URL}/api/dashboard`, params);
  check(res, {
    'dashboard status is 200': (r) => r.status === 200,
    'dashboard response time < 200ms': (r) => r.timings.duration < 200,
  });
  errorRate.add(res.status !== 200);
  sleep(1);

  // シナリオ2: ケース一覧取得
  res = http.get(`${BASE_URL}/api/cases`, params);
  check(res, {
    'cases list status is 200': (r) => r.status === 200,
    'cases list response time < 300ms': (r) => r.timings.duration < 300,
    'cases list has data': (r) => JSON.parse(r.body).length > 0,
  });
  errorRate.add(res.status !== 200);
  sleep(1);

  // シナリオ3: ケース詳細取得
  const caseId = Math.floor(Math.random() * 100) + 1;
  res = http.get(`${BASE_URL}/api/cases/${caseId}`, params);
  check(res, {
    'case detail status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'case detail response time < 150ms': (r) => r.timings.duration < 150,
  });
  if (res.status !== 200 && res.status !== 404) {
    errorRate.add(1);
  }
  sleep(1);

  // シナリオ4: テンプレート一覧取得
  res = http.get(`${BASE_URL}/api/templates`, params);
  check(res, {
    'templates list status is 200': (r) => r.status === 200,
    'templates list response time < 250ms': (r) => r.timings.duration < 250,
  });
  errorRate.add(res.status !== 200);
  sleep(1);

  // シナリオ5: ケース作成（10%の確率で実行）
  if (Math.random() < 0.1) {
    const newCase = {
      templateId: 1,
      title: `Performance Test Case ${Date.now()}`,
      goalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    
    res = http.post(`${BASE_URL}/api/cases`, JSON.stringify(newCase), params);
    check(res, {
      'case creation status is 201': (r) => r.status === 201,
      'case creation response time < 500ms': (r) => r.timings.duration < 500,
    });
    errorRate.add(res.status !== 201);
  }
  sleep(2);

  // シナリオ6: ガントチャートデータ取得
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  
  res = http.get(
    `${BASE_URL}/api/gantt?startDate=${startDate}&endDate=${endDate}`,
    params
  );
  check(res, {
    'gantt data status is 200': (r) => r.status === 200,
    'gantt data response time < 400ms': (r) => r.timings.duration < 400,
  });
  errorRate.add(res.status !== 200);
  sleep(1);

  // シナリオ7: 検索機能
  res = http.get(`${BASE_URL}/api/cases?search=test`, params);
  check(res, {
    'search status is 200': (r) => r.status === 200,
    'search response time < 350ms': (r) => r.timings.duration < 350,
  });
  errorRate.add(res.status !== 200);
  sleep(1);
}

// Teardown function - run once after the test
export function teardown(data) {
  // クリーンアップ処理
  console.log('Test completed');
}