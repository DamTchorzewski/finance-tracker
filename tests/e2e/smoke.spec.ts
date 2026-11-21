import { expect, test } from "@playwright/test";
import {
  APP_ROUTES,
  expectNoHorizontalScroll,
  mockApi,
  PUBLIC_ROUTES,
  settle,
  startDemo,
  trackErrors,
} from "./helpers.ts";

test.describe("signed out", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} has a heading and no errors`, async ({ page }) => {
      const errors = trackErrors(page);
      await mockApi(page);
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalScroll(page);
      errors.expectNone();
    });
  }

  test("a private page sends to the sign-in", async ({ page }) => {
    await page.goto("/budgets");
    await expect(page).toHaveURL(/\/login$/);
  });
});

test.describe("demo", () => {
  test.beforeEach(async ({ page }) => startDemo(page));

  for (const route of APP_ROUTES) {
    test(`${route} renders without errors or sideways scroll`, async ({ page }) => {
      const errors = trackErrors(page);
      await page.goto(route);
      await expect(page.getByRole("main")).toBeVisible();
      await settle(page);
      await expectNoHorizontalScroll(page);
      errors.expectNone();
    });
  }

  test("an unknown page is a friendly 404", async ({ page }) => {
    await page.goto("/no-such-page");
    await expect(page.getByRole("heading", { name: "Nie ma takiej strony" })).toBeVisible();
  });

  test("the try-the-demo button opens the dashboard", async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem("ft-session"));
    await page.goto("/login");
    await page.getByRole("button", { name: "Wypróbuj demo bez konta" }).click();
    await expect(page.getByText("Saldo wszystkich kont")).toBeVisible();
  });
});
