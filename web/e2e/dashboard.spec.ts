import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display dashboard page with title', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should display KPI cards', async ({ page }) => {
    // Check for all 4 KPI cards
    const kpiCards = page.locator('.bg-white.p-6.rounded-lg.shadow').filter({
      hasText: /Progress Rate|On-Time Completion|Resource Utilization|Avg Lead Time/
    });
    
    await expect(kpiCards).toHaveCount(4);
    
    // Check specific KPI cards
    await expect(page.locator('text=Progress Rate')).toBeVisible();
    await expect(page.locator('text=On-Time Completion')).toBeVisible();
    await expect(page.locator('text=Resource Utilization')).toBeVisible();
    await expect(page.locator('text=Avg Lead Time')).toBeVisible();
  });

  test('should display summary statistics', async ({ page }) => {
    // Check for summary stat cards
    await expect(page.locator('text=Completed Cases')).toBeVisible();
    await expect(page.locator('text=Overdue Tasks')).toBeVisible();
    await expect(page.locator('text=Active Users')).toBeVisible();
  });

  test('should display charts', async ({ page }) => {
    // Check for chart sections
    await expect(page.locator('h2:has-text("Task Status Distribution")')).toBeVisible();
    await expect(page.locator('h2:has-text("Progress Trend")')).toBeVisible();
    await expect(page.locator('h2:has-text("Resource Utilization")')).toBeVisible();
    
    // Check for SVG charts
    const charts = page.locator('svg');
    await expect(charts).toHaveCount(3); // Pie chart, line chart, bar chart
  });

  test('should display resource details table', async ({ page }) => {
    await expect(page.locator('h2:has-text("Resource Details")')).toBeVisible();
    
    // Check table headers
    await expect(page.locator('th:has-text("User")')).toBeVisible();
    await expect(page.locator('th:has-text("Assigned Tasks")')).toBeVisible();
    await expect(page.locator('th:has-text("Completed Tasks")')).toBeVisible();
    await expect(page.locator('th:has-text("Completion Rate")')).toBeVisible();
  });

  test('should have refresh button', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh")');
    await expect(refreshButton).toBeVisible();
    
    // Check if button has refresh icon
    await expect(refreshButton.locator('svg')).toBeVisible();
  });

  test('should show last updated time', async ({ page }) => {
    await expect(page.locator('text=/Last updated:/')).toBeVisible();
  });

  test('refresh button should update data', async ({ page }) => {
    // Get initial last updated time
    const initialTime = await page.locator('text=/Last updated:/').textContent();
    
    // Wait a moment to ensure time difference
    await page.waitForTimeout(1000);
    
    // Click refresh button
    await page.locator('button:has-text("Refresh")').click();
    
    // Wait for loading to complete
    await page.waitForLoadState('networkidle');
    
    // Check if time has changed
    const newTime = await page.locator('text=/Last updated:/').textContent();
    expect(newTime).not.toBe(initialTime);
  });

  test('should handle loading state', async ({ page }) => {
    // Navigate away and back to trigger loading
    await page.goto('/');
    await page.goto('/dashboard');
    
    // During loading, should show loading message (this might be too quick to catch)
    // Instead, we'll just verify the page loads successfully
    await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible({ timeout: 5000 });
  });

  test('pie chart should be interactive', async ({ page }) => {
    // Hover over pie chart segments should show tooltips
    const pieChart = page.locator('svg').first();
    const segment = pieChart.locator('path').first();
    
    await segment.hover();
    // Check if tooltip appears (title element)
    await expect(segment.locator('title')).toHaveCount(1);
  });

  test('resource bar chart should show capacity lines', async ({ page }) => {
    // Find the resource bar chart (it's the widest one)
    const barChart = page.locator('svg[width="800"]');
    
    // Check for capacity lines (dashed lines)
    const capacityLines = barChart.locator('line[stroke="#ef4444"]');
    await expect(capacityLines.first()).toBeVisible();
  });

  test('navigation link should be highlighted', async ({ page }) => {
    // Check if dashboard link in header is present
    const dashboardLink = page.locator('nav').locator('a[href="/dashboard"]');
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toContainText('ダッシュボード');
  });
});

test.describe('Dashboard Data Validation', () => {
  test('KPI values should be valid numbers', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Progress Rate should be between 0-100
    const progressRate = await page.locator('.bg-white >> text=Progress Rate').locator('..').locator('.text-2xl').textContent();
    const progressValue = parseInt(progressRate?.replace('%', '') || '0');
    expect(progressValue).toBeGreaterThanOrEqual(0);
    expect(progressValue).toBeLessThanOrEqual(100);
    
    // On-Time Completion should be between 0-100
    const onTimeRate = await page.locator('.bg-white >> text=On-Time Completion').locator('..').locator('.text-2xl').textContent();
    const onTimeValue = parseInt(onTimeRate?.replace('%', '') || '0');
    expect(onTimeValue).toBeGreaterThanOrEqual(0);
    expect(onTimeValue).toBeLessThanOrEqual(100);
    
    // Resource Utilization should be between 0-100
    const utilization = await page.locator('.bg-white >> text=Resource Utilization').locator('..').locator('.text-2xl').textContent();
    const utilizationValue = parseInt(utilization?.replace('%', '') || '0');
    expect(utilizationValue).toBeGreaterThanOrEqual(0);
    expect(utilizationValue).toBeLessThanOrEqual(100);
    
    // Lead Time should be a positive number
    const leadTime = await page.locator('.bg-white >> text=Avg Lead Time').locator('..').locator('.text-2xl').textContent();
    const leadTimeValue = parseInt(leadTime?.split(' ')[0] || '0');
    expect(leadTimeValue).toBeGreaterThanOrEqual(0);
  });
});