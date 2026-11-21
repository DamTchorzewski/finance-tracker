import { expect, type Page } from "@playwright/test";

/** Every page template behind the sign-in, plus the sign-in pages and a 404. */
export const APP_ROUTES = [
  "/",
  "/transactions",
  "/accounts",
  "/budgets",
  "/currencies",
  "/settings",
];
export const PUBLIC_ROUTES = ["/login", "/register"];

const MID = {
  source: "nbp-a",
  date: "2026-11-20",
  requested: "2026-11-21",
  fallback: false,
  rates: { EUR: 4.4559, USD: 4.0613, GBP: 5.0412, CHF: 4.8282, CZK: 0.1788 },
};

/** Answers the API with fixtures: the tests never reach NBP, Firebase or the real API. */
export async function mockApi(page: Page) {
  await page.route("**/api/rates/history**", (route) =>
    route.fulfill({
      json: {
        code: "EUR",
        source: "nbp-a",
        points: [
          { date: "2026-11-18", mid: 4.44 },
          { date: "2026-11-19", mid: 4.45 },
          { date: "2026-11-20", mid: 4.4559 },
        ],
      },
    }),
  );
  await page.route("**/api/rates/cash", (route) =>
    route.fulfill({
      json: {
        source: "nbp-c",
        date: "2026-11-20",
        tradingDate: "2026-11-19",
        rates: { EUR: { bid: 4.3798, ask: 4.4682 } },
      },
    }),
  );
  await page.route(/\/api\/rates(\?.*)?$/, (route) => route.fulfill({ json: MID }));
}

/** Fails the test on any console error (a CSP violation shows as one) or a page crash. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return {
    expectNone: () => expect(errors, errors.join("\n")).toEqual([]),
  };
}

/** Opens the demo straight away: the flag the "Try the demo" button sets. */
export async function startDemo(page: Page) {
  await mockApi(page);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("e2e-started")) {
      localStorage.clear();
      localStorage.setItem("ft-session", "demo");
      sessionStorage.setItem("e2e-started", "1");
    }
  });
}

export async function expectNoHorizontalScroll(page: Page) {
  const { scroll, width } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    width: window.innerWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(width);
}

/** Lets lazy charts and enter animations reach their final state before a check. */
export async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
}
