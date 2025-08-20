import { FullConfig, chromium } from '@playwright/test';
import { E2E_CONFIG, getApiBaseUrl } from './config';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...');
  
  // テスト用環境変数の設定
  // TypeScript strictモードでprocess.envは読み取り専用のため、型アサーションを使用
  (process.env as any).NODE_ENV = 'e2e';
  (process.env as any).NEXT_PUBLIC_API_URL = E2E_CONFIG.api.baseUrl;
  
  console.log(`📡 API URL: ${E2E_CONFIG.api.baseUrl}`);
  console.log(`🌐 Frontend URL: ${E2E_CONFIG.frontend.baseUrl}`);
  
  // データベースのセットアップ（必要に応じて）
  if (process.env.RESET_DB === 'true') {
    console.log('📦 Resetting test database...');
    // ここでテスト用データベースのリセットやシード投入を行う
    // const { execSync } = require('child_process');
    // execSync('cd ../api && npx prisma migrate reset --force', { stdio: 'inherit' });
    // execSync('cd ../api && npx prisma db seed', { stdio: 'inherit' });
  }
  
  // テストユーザーの作成
  console.log('👤 Setting up test users...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    const apiBaseUrl = getApiBaseUrl();
    const setupUrl = `${apiBaseUrl}/api/test/setup`;
    
    console.log(`🔧 Attempting test user setup at: ${setupUrl}`);
    
    // テストユーザーの作成/確認
    const response = await page.request.post(setupUrl, {
      data: {
        email: E2E_CONFIG.auth.testUser.email,
        password: E2E_CONFIG.auth.testUser.password,
        name: E2E_CONFIG.auth.testUser.name,
        role: E2E_CONFIG.auth.testUser.role
      },
      headers: {
        'Content-Type': 'application/json'
      }
    }).catch(error => {
      // テストエンドポイントが存在しない場合は警告のみ
      console.warn('⚠️ Test setup endpoint not available:', error.message);
      console.warn('📝 Assuming test user already exists or will be created manually');
      return null;
    });
    
    if (response) {
      if (response.ok()) {
        const data = await response.json();
        console.log('✅ Test user setup response:', data.message);
      } else {
        console.warn(`⚠️ Test user setup failed with status ${response.status()}`);
        const responseText = await response.text();
        console.warn('Response:', responseText);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during test user setup:', error);
    // テストユーザーのセットアップに失敗してもテストは続行
    console.warn('⚠️ Continuing without test user setup...');
  } finally {
    await browser.close();
  }
  
  console.log('✅ E2E test setup completed');
  
  return async () => {
    // グローバルティアダウンで実行したい処理
    console.log('🧹 Cleaning up after tests...');
  };
}

export default globalSetup;