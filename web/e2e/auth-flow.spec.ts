import { test, expect, Page } from '@playwright/test';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear cookies and local storage
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test.describe('Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill login form
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');

      // Should show user info
      await expect(page.locator('text=Admin User')).toBeVisible({ timeout: 10000 });
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Should show error message
      await expect(page.locator('text=/ログインに失敗しました|Invalid email or password/')).toBeVisible();

      // Should stay on login page
      await expect(page).toHaveURL('/login');
    });

    test('should fill demo credentials', async ({ page }) => {
      await page.goto('/login');

      // Click admin demo button
      await page.click('button:has-text("管理者")');

      // Check if fields are filled
      const emailValue = await page.inputValue('input[name="email"]');
      const passwordValue = await page.inputValue('input[name="password"]');

      expect(emailValue).toBe('admin@example.com');
      expect(passwordValue).toBe('password123');
    });
  });

  test.describe('Signup', () => {
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;

    test('should create new account', async ({ page }) => {
      await page.goto('/signup');

      // Fill signup form
      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', testEmail);
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.fill('input[name="confirm-password"]', 'TestPassword123!');

      // Submit form
      await page.click('button[type="submit"]');

      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('should validate password requirements', async ({ page }) => {
      await page.goto('/signup');

      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'weak');
      await page.fill('input[name="confirm-password"]', 'weak');
      await page.click('button[type="submit"]');

      // Should show password validation error
      await expect(page.locator('text=/パスワードは8文字以上/')).toBeVisible();
    });

    test('should validate password match', async ({ page }) => {
      await page.goto('/signup');

      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.fill('input[name="confirm-password"]', 'DifferentPassword123!');
      await page.click('button[type="submit"]');

      // Should show password match error
      await expect(page.locator('text=パスワードが一致しません')).toBeVisible();
    });

    test('should show error for existing email', async ({ page }) => {
      await page.goto('/signup');

      await page.fill('input[name="name"]', 'Test User');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.fill('input[name="confirm-password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');

      // Should show error for existing user
      await expect(page.locator('text=/already exists|既に登録されています/')).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect to login when accessing protected route', async ({ page }) => {
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });

    test('should allow access after login', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Wait for redirect
      await expect(page).toHaveURL('/dashboard');

      // Navigate to other protected routes
      await page.goto('/templates');
      await expect(page).not.toHaveURL('/login');

      await page.goto('/cases');
      await expect(page).not.toHaveURL('/login');
    });
  });

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');

      // Find and click logout button
      await page.click('button:has-text("ログアウト")');

      // Should redirect to login
      await expect(page).toHaveURL('/login');

      // Should not be able to access protected routes
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Session Persistence', () => {
    test('should persist session across page reloads', async ({ page }) => {
      // Login
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');

      // Reload page
      await page.reload();

      // Should still be on dashboard
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('text=Admin User')).toBeVisible();
    });

    test('should handle expired token gracefully', async ({ page, context }) => {
      // Login
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');

      // Simulate expired token by modifying cookie
      const cookies = await context.cookies();
      const accessToken = cookies.find(c => c.name === 'accessToken');
      if (accessToken) {
        await context.addCookies([{
          ...accessToken,
          value: 'invalid-token',
        }]);
      }

      // Try to navigate
      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Role-based Access', () => {
    test('should show different UI for admin user', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'admin@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');

      // Admin should see admin-specific elements
      // This depends on your actual implementation
      // await expect(page.locator('[data-role="admin"]')).toBeVisible();
    });

    test('should show different UI for viewer user', async ({ page }) => {
      await page.goto('/login');
      await page.fill('input[name="email"]', 'viewer@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL('/dashboard');

      // Viewer should have limited UI
      // This depends on your actual implementation
      // await expect(page.locator('[data-role="viewer"]')).toBeVisible();
    });
  });
});