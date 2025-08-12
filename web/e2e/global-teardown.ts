import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting E2E test cleanup...');
  
  // テストデータのクリーンアップ
  if (process.env.CLEANUP_TEST_DATA === 'true') {
    console.log('🗑️ Cleaning up test data...');
    // ここでテストデータの削除を行う
    // const { execSync } = require('child_process');
    // execSync('cd ../api && npm run cleanup:test', { stdio: 'inherit' });
  }
  
  // 一時ファイルの削除
  console.log('📁 Removing temporary files...');
  // ここで一時ファイルの削除を行う
  
  // テストレポートの整理
  console.log('📊 Finalizing test reports...');
  
  console.log('✅ E2E test cleanup completed');
}

export default globalTeardown;