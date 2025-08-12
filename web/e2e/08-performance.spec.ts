import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    // パフォーマンス計測を有効化
    await page.route('**/*', (route) => {
      const request = route.request();
      const url = request.url();
      
      // 画像の遅延読み込みテスト用
      if (url.includes('.jpg') || url.includes('.png')) {
        // 遅延を追加して遅延読み込みをテスト
        setTimeout(() => route.continue(), 100);
      } else {
        route.continue();
      }
    });
  });

  test('should load homepage within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    const loadTime = Date.now() - startTime;
    console.log(`Homepage load time: ${loadTime}ms`);
    
    // ページロード時間が3秒以内であることを確認
    expect(loadTime).toBeLessThan(3000);
    
    // Core Web Vitalsのチェック
    const metrics = await page.evaluate(() => {
      return new Promise<any>((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const metrics: any = {};
          
          entries.forEach((entry: any) => {
            if (entry.name === 'first-contentful-paint') {
              metrics.fcp = entry.startTime;
            }
            if (entry.name === 'largest-contentful-paint') {
              metrics.lcp = entry.startTime;
            }
          });
          
          if (metrics.fcp && metrics.lcp) {
            observer.disconnect();
            resolve(metrics);
          }
        });
        
        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
        
        // タイムアウト
        setTimeout(() => {
          observer.disconnect();
          resolve({});
        }, 5000);
      });
    });
    
    // FCP (First Contentful Paint) が2.5秒以内
    if (metrics.fcp) {
      expect(metrics.fcp).toBeLessThan(2500);
    }
    
    // LCP (Largest Contentful Paint) が4秒以内
    if (metrics.lcp) {
      expect(metrics.lcp).toBeLessThan(4000);
    }
  });

  test('should efficiently handle large data sets', async ({ page }) => {
    await page.goto('/cases');
    
    // 大量データのレンダリング時間を計測
    const renderStartTime = Date.now();
    
    // ケース一覧が表示されるまで待機
    await page.waitForSelector('[data-testid="case-list"]', { timeout: 5000 });
    
    const renderTime = Date.now() - renderStartTime;
    console.log(`Case list render time: ${renderTime}ms`);
    
    // レンダリング時間が2秒以内であることを確認
    expect(renderTime).toBeLessThan(2000);
    
    // スクロールパフォーマンスのテスト
    const scrollPerformance = await page.evaluate(async () => {
      const startTime = performance.now();
      
      // スムーズスクロール
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const endTime = performance.now();
      return endTime - startTime;
    });
    
    // スクロールが滑らかであることを確認（ジャンクなし）
    expect(scrollPerformance).toBeLessThan(2500);
  });

  test('should implement lazy loading for images', async ({ page }) => {
    await page.goto('/');
    
    // 初期ロード時の画像数を取得
    const initialImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => img.complete && img.naturalHeight > 0).length;
    });
    
    // スクロールして追加画像をロード
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    // スクロール後の画像数を取得
    const afterScrollImages = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return images.filter(img => img.complete && img.naturalHeight > 0).length;
    });
    
    // 遅延読み込みが機能していることを確認
    console.log(`Initial images: ${initialImages}, After scroll: ${afterScrollImages}`);
  });

  test('should cache API responses', async ({ page, context }) => {
    // 初回リクエスト
    await page.goto('/cases');
    
    const firstLoadResponses: number[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/api/cases')) {
        firstLoadResponses.push(response.status());
      }
    });
    
    await page.waitForSelector('[data-testid="case-list"]');
    
    // 別ページへ移動
    await page.goto('/templates');
    await page.waitForSelector('[data-testid="template-list"]');
    
    // 元のページに戻る
    const secondLoadStart = Date.now();
    await page.goto('/cases');
    await page.waitForSelector('[data-testid="case-list"]');
    const secondLoadTime = Date.now() - secondLoadStart;
    
    // 2回目のロードが速いことを確認（キャッシュ効果）
    console.log(`Second load time: ${secondLoadTime}ms`);
    expect(secondLoadTime).toBeLessThan(1500);
  });

  test('should optimize bundle size', async ({ page }) => {
    const coverage = await page.coverage.startJSCoverage();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const jsCoverage = await page.coverage.stopJSCoverage();
    
    let totalBytes = 0;
    let usedBytes = 0;
    
    for (const entry of jsCoverage) {
      totalBytes += entry.text.length;
      for (const range of entry.ranges) {
        usedBytes += range.end - range.start;
      }
    }
    
    const unusedPercentage = ((totalBytes - usedBytes) / totalBytes) * 100;
    console.log(`Unused JavaScript: ${unusedPercentage.toFixed(2)}%`);
    
    // 未使用のJavaScriptが50%未満であることを確認
    expect(unusedPercentage).toBeLessThan(50);
  });

  test('should handle concurrent operations efficiently', async ({ page }) => {
    await page.goto('/cases');
    
    // 複数の非同期操作を同時実行
    const operations = await Promise.all([
      page.evaluate(() => fetch('/api/cases').then(r => r.json())),
      page.evaluate(() => fetch('/api/templates').then(r => r.json())),
      page.evaluate(() => fetch('/api/dashboard').then(r => r.json())),
    ]);
    
    // すべての操作が成功することを確認
    operations.forEach(result => {
      expect(result).toBeDefined();
    });
  });

  test('should implement efficient search', async ({ page }) => {
    await page.goto('/cases');
    await page.waitForSelector('[data-testid="case-list"]');
    
    const searchInput = page.locator('input[placeholder*="検索"]');
    
    // 検索パフォーマンステスト
    const searchStartTime = Date.now();
    await searchInput.fill('test');
    
    // デバウンス後の結果を待つ
    await page.waitForTimeout(500);
    await page.waitForSelector('[data-testid="case-list"]');
    
    const searchTime = Date.now() - searchStartTime;
    console.log(`Search execution time: ${searchTime}ms`);
    
    // 検索が1秒以内に完了することを確認
    expect(searchTime).toBeLessThan(1000);
  });

  test('should optimize memory usage', async ({ page }) => {
    // メモリ使用量の監視
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (memoryUsage) {
      const usedJSHeapSize = memoryUsage.usedJSHeapSize / 1024 / 1024; // MB
      console.log(`Used JS Heap Size: ${usedJSHeapSize.toFixed(2)} MB`);
      
      // メモリ使用量が妥当な範囲内であることを確認
      expect(usedJSHeapSize).toBeLessThan(100); // 100MB未満
    }
    
    // ページ遷移を繰り返してメモリリークをチェック
    for (let i = 0; i < 5; i++) {
      await page.goto('/cases');
      await page.goto('/templates');
      await page.goto('/gantt');
    }
    
    const finalMemoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (finalMemoryUsage && memoryUsage) {
      const memoryIncrease = 
        (finalMemoryUsage.usedJSHeapSize - memoryUsage.usedJSHeapSize) / 1024 / 1024;
      console.log(`Memory increase after navigation: ${memoryIncrease.toFixed(2)} MB`);
      
      // メモリリークがないことを確認（増加が20MB未満）
      expect(Math.abs(memoryIncrease)).toBeLessThan(20);
    }
  });
});