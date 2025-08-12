import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...');
  
  // テスト用環境変数の設定
  process.env.NODE_ENV = 'test';
  process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3005/api';
  
  // データベースのセットアップ（必要に応じて）
  if (process.env.RESET_DB === 'true') {
    console.log('📦 Resetting test database...');
    // ここでテスト用データベースのリセットやシード投入を行う
    // const { execSync } = require('child_process');
    // execSync('cd ../api && npx prisma migrate reset --force', { stdio: 'inherit' });
    // execSync('cd ../api && npx prisma db seed', { stdio: 'inherit' });
  }
  
  // テストユーザーの作成や認証トークンの生成など
  console.log('👤 Creating test users...');
  // ここでテストユーザーの作成やトークン生成を行う
  
  // グローバルな状態の初期化
  console.log('✅ E2E test setup completed');
  
  return async () => {
    // グローバルティアダウンで実行したい処理
    console.log('🧹 Cleaning up after tests...');
  };
}

export default globalSetup;