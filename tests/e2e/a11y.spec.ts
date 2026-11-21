import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { APP_ROUTES, mockApi, PUBLIC_ROUTES, settle, startDemo } from "./helpers.ts";

// WCAG 2.2 AA in both themes (standards/accessibility.md).
for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`WCAG 2.2 AA (${colorScheme})`, () => {
    test.use({ colorScheme, reducedMotion: "reduce" });

    for (const route of PUBLIC_ROUTES) {
      test(route, async ({ page }) => {
        await mockApi(page);
        await page.goto(route);
        await settle(page);
        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
      });
    }

    for (const route of APP_ROUTES) {
      test(`demo ${route}`, async ({ page }) => {
        await startDemo(page);
        await page.goto(route);
        await settle(page);
        const { violations } = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(violations.map((v) => `${v.id}: ${v.nodes[0]?.target.join(" ")}`)).toEqual([]);
      });
    }
  });
}

test("nothing moves with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startDemo(page);
  await page.goto("/");
  const durations = await page.evaluate(() =>
    [...document.querySelectorAll("*")]
      .map((node) => getComputedStyle(node).animationDuration)
      .filter((duration) => duration !== "0s" && Number.parseFloat(duration) > 0.01),
  );
  expect(durations).toEqual([]);
});
