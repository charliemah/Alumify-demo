import { test, expect } from "@playwright/test";

test.describe("smoke", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("text=Alumify")).toBeVisible();
  });

  test("challenges page loads", async ({ page }) => {
    await page.goto("/challenges");
    await expect(page).toHaveURL(/\/challenges/);
    await expect(page.locator("h1")).toContainText("Challenges");
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Sign in to Alumify")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("forgot password page loads", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("text=Forgot password")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator("text=Send reset link")).toBeVisible();
  });

  test("register page loads", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("text=Create an account")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(2);
  });
});

test.describe("auth flow", () => {
  const skipInCI = !!process.env.CI;
  test("register -> challenges", async ({ page }) => {
    test.skip(skipInCI, "Requires API + DB");
    const email = `e2e-${Date.now()}@example.com`;
    const password = "password123";
    await page.goto("/register");
    await page.fill('input[type="email"]', email);
    await page.fill('input[id="password"]', password);
    await page.fill('input[id="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/challenges/, { timeout: 10000 });
    await expect(page.locator("h1")).toContainText("Challenges");
  });

  test("login -> challenges", async ({ page }) => {
    test.skip(skipInCI, "Requires API + DB");
    const email = `e2e-${Date.now()}@example.com`;
    const password = "password123";
    await page.goto("/register");
    await page.fill('input[type="email"]', email);
    await page.fill('input[id="password"]', password);
    await page.fill('input[id="confirmPassword"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/challenges/, { timeout: 10000 });
    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/challenges/, { timeout: 10000 });
  });

  test("forgot password flow", async ({ page }) => {
    test.skip(skipInCI, "Requires API");
    await page.goto("/forgot-password");
    await page.fill('input[type="email"]', "test@example.com");
    await page.click('button[type="submit"]');
    await expect(page.locator("text=Check your email")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Back to sign in")).toBeVisible();
  });
});
