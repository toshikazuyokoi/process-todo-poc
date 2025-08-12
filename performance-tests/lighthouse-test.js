const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const fs = require('fs').promises;
const path = require('path');

// テスト対象のURL
const urls = [
  { name: 'home', url: 'http://localhost:3000/' },
  { name: 'cases', url: 'http://localhost:3000/cases' },
  { name: 'templates', url: 'http://localhost:3000/templates' },
  { name: 'gantt', url: 'http://localhost:3000/gantt' },
  { name: 'case-detail', url: 'http://localhost:3000/cases/1' },
];

// Lighthouse設定
const options = {
  logLevel: 'info',
  output: ['html', 'json'],
  onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  throttling: {
    // ネットワークとCPUのスロットリング設定
    rttMs: 150,
    throughputKbps: 1638.4,
    cpuSlowdownMultiplier: 4,
  },
  screenEmulation: {
    mobile: false,
    width: 1350,
    height: 940,
    deviceScaleFactor: 1,
    disabled: false,
  },
};

// モバイル用の設定
const mobileOptions = {
  ...options,
  screenEmulation: {
    mobile: true,
    width: 360,
    height: 640,
    deviceScaleFactor: 2,
    disabled: false,
  },
  throttling: {
    // 3G接続を想定
    rttMs: 562.5,
    throughputKbps: 1474.5,
    cpuSlowdownMultiplier: 4,
  },
};

async function runLighthouse(url, opts, config = null) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = { ...opts, port: chrome.port };
  
  try {
    const runnerResult = await lighthouse(url, options, config);
    await chrome.kill();
    return runnerResult;
  } catch (error) {
    await chrome.kill();
    throw error;
  }
}

async function analyzePerformance(result) {
  const { lhr } = result;
  const performance = lhr.categories.performance;
  const metrics = lhr.audits.metrics.details.items[0];
  
  return {
    score: performance.score * 100,
    metrics: {
      firstContentfulPaint: metrics.firstContentfulPaint,
      speedIndex: metrics.speedIndex,
      largestContentfulPaint: metrics.largestContentfulPaint,
      timeToInteractive: metrics.timeToInteractive,
      totalBlockingTime: metrics.totalBlockingTime,
      cumulativeLayoutShift: metrics.cumulativeLayoutShift,
    },
    opportunities: Object.values(lhr.audits)
      .filter(audit => audit.details?.type === 'opportunity' && audit.score < 0.9)
      .map(audit => ({
        title: audit.title,
        savings: audit.details.overallSavingsMs,
        description: audit.description,
      }))
      .sort((a, b) => b.savings - a.savings)
      .slice(0, 5),
  };
}

async function generateReport(results) {
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const reportDir = path.join(__dirname, 'reports', timestamp);
  
  await fs.mkdir(reportDir, { recursive: true });
  
  // サマリーレポート作成
  const summary = {
    timestamp,
    results: results.map(r => ({
      url: r.url,
      device: r.device,
      performance: r.performance,
    })),
    averageScores: {
      desktop: {
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
      },
      mobile: {
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
      },
    },
  };
  
  // 平均スコア計算
  const desktopResults = results.filter(r => r.device === 'desktop');
  const mobileResults = results.filter(r => r.device === 'mobile');
  
  ['performance', 'accessibility', 'bestPractices', 'seo'].forEach(category => {
    if (desktopResults.length > 0) {
      summary.averageScores.desktop[category] = 
        desktopResults.reduce((sum, r) => sum + r[category], 0) / desktopResults.length;
    }
    if (mobileResults.length > 0) {
      summary.averageScores.mobile[category] = 
        mobileResults.reduce((sum, r) => sum + r[category], 0) / mobileResults.length;
    }
  });
  
  // レポート保存
  await fs.writeFile(
    path.join(reportDir, 'summary.json'),
    JSON.stringify(summary, null, 2)
  );
  
  // 個別レポート保存
  for (const result of results) {
    const filename = `${result.name}-${result.device}.html`;
    await fs.writeFile(
      path.join(reportDir, filename),
      result.report[0]
    );
  }
  
  return reportDir;
}

async function runTests() {
  console.log('Starting Lighthouse performance tests...\n');
  const results = [];
  
  for (const { name, url } of urls) {
    // デスクトップテスト
    console.log(`Testing ${name} (Desktop)...`);
    try {
      const desktopResult = await runLighthouse(url, options);
      const performance = await analyzePerformance(desktopResult);
      
      results.push({
        name,
        url,
        device: 'desktop',
        performance: performance.score,
        accessibility: desktopResult.lhr.categories.accessibility.score * 100,
        bestPractices: desktopResult.lhr.categories['best-practices'].score * 100,
        seo: desktopResult.lhr.categories.seo.score * 100,
        metrics: performance.metrics,
        opportunities: performance.opportunities,
        report: desktopResult.report,
      });
      
      console.log(`  Performance: ${performance.score.toFixed(1)}`);
      console.log(`  FCP: ${performance.metrics.firstContentfulPaint}ms`);
      console.log(`  LCP: ${performance.metrics.largestContentfulPaint}ms`);
      console.log(`  TTI: ${performance.metrics.timeToInteractive}ms\n`);
    } catch (error) {
      console.error(`  Error testing ${name} (Desktop):`, error.message);
    }
    
    // モバイルテスト
    console.log(`Testing ${name} (Mobile)...`);
    try {
      const mobileResult = await runLighthouse(url, mobileOptions);
      const performance = await analyzePerformance(mobileResult);
      
      results.push({
        name,
        url,
        device: 'mobile',
        performance: performance.score,
        accessibility: mobileResult.lhr.categories.accessibility.score * 100,
        bestPractices: mobileResult.lhr.categories['best-practices'].score * 100,
        seo: mobileResult.lhr.categories.seo.score * 100,
        metrics: performance.metrics,
        opportunities: performance.opportunities,
        report: mobileResult.report,
      });
      
      console.log(`  Performance: ${performance.score.toFixed(1)}`);
      console.log(`  FCP: ${performance.metrics.firstContentfulPaint}ms`);
      console.log(`  LCP: ${performance.metrics.largestContentfulPaint}ms`);
      console.log(`  TTI: ${performance.metrics.timeToInteractive}ms\n`);
    } catch (error) {
      console.error(`  Error testing ${name} (Mobile):`, error.message);
    }
  }
  
  // レポート生成
  const reportDir = await generateReport(results);
  console.log(`\nReports saved to: ${reportDir}`);
  
  // パフォーマンス基準チェック
  console.log('\nPerformance Check:');
  const failedTests = results.filter(r => r.performance < 80);
  if (failedTests.length > 0) {
    console.log('⚠️  Following pages need optimization:');
    failedTests.forEach(test => {
      console.log(`  - ${test.name} (${test.device}): ${test.performance.toFixed(1)}`);
    });
    process.exit(1);
  } else {
    console.log('✅ All pages meet performance criteria (>80)');
  }
}

// 実行
runTests().catch(console.error);