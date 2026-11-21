import { expect, test } from "@playwright/test";
import { startDemo } from "./helpers.ts";

test.beforeEach(async ({ page }) => startDemo(page));

test("add, edit and delete a transaction moves the balance and back", async ({ page }) => {
  await page.goto("/accounts");
  const account = page.getByRole("listitem").filter({ hasText: "Konto osobiste" });
  const before = await account.locator(".amount").first().innerText();

  await page.getByRole("button", { name: "Nowa transakcja" }).first().click();
  const sheet = page.getByRole("dialog", { name: "Nowa transakcja" });
  await sheet.getByLabel("Kwota (PLN)").fill("123,45");
  await sheet.getByRole("button", { name: "Zakupy spożywcze" }).click();
  await sheet.getByLabel(/Notatka/).fill("Test e2e");
  await sheet.getByRole("button", { name: "Zapisz" }).click();
  await expect(page.getByText("Zapisano transakcję")).toBeVisible();
  await expect(account.locator(".amount").first()).not.toHaveText(before);

  await page.goto("/transactions?q=Test%20e2e");
  await page.getByRole("button", { name: /Test e2e/ }).click();
  const edit = page.getByRole("dialog", { name: "Edytuj transakcję" });
  await edit.getByRole("button", { name: "Usuń" }).click();
  await expect(page.getByText("Usunięto transakcję")).toBeVisible();

  await page.goto("/accounts");
  await expect(account.locator(".amount").first()).toHaveText(before);
});

test("the command palette adds a transaction from plain words", async ({ page, isMobile }) => {
  test.skip(isMobile, "the shortcut needs a keyboard");
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder(/Wpisz polecenie/).fill("kawa 14 zł wczoraj");
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: "Nowa transakcja" });
  await expect(sheet.getByLabel("Kwota (PLN)")).toHaveValue("14,00");
  await expect(sheet.getByRole("button", { name: "Jedzenie na mieście" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("privacy mode blurs the amounts and the setting is remembered", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("switch", { name: "Tryb prywatności" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-privacy", "on");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-privacy", "on");
});

test("the transaction filters live in the address", async ({ page }) => {
  await page.goto("/transactions?kind=income&period=year");
  await expect(page.getByLabel("Filtry")).toHaveValue("income");
  await expect(page.getByRole("radio", { name: "Rok" })).toHaveAttribute("aria-checked", "true");
});

test("a new category from the transaction form is selected at once", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Nowa transakcja" }).first().click();
  const form = page.getByRole("dialog", { name: "Nowa transakcja" });
  await form.getByRole("button", { name: "Nowa kategoria" }).click();
  const sheet = page.getByRole("dialog", { name: "Nowa kategoria" });
  await sheet.getByLabel("Nazwa").fill("Rower");
  await sheet.getByRole("button", { name: "limonkowy" }).click();
  await sheet.getByRole("button", { name: "bike" }).click();
  await sheet.getByRole("button", { name: "Zapisz" }).click();
  await expect(page.getByText("Dodano kategorię: Rower")).toBeVisible();
  await expect(form.getByRole("button", { name: "Rower" })).toHaveAttribute("aria-pressed", "true");
});

test("the dashboard tip opens the palette and then stays hidden", async ({ page }) => {
  await page.goto("/");
  const tip = page.getByRole("complementary", { name: /Szybciej z klawiatury/ });
  await expect(tip).toBeVisible();
  await tip.getByRole("button", { name: "Wypróbuj" }).click();
  await expect(page.getByPlaceholder(/Wpisz polecenie/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByText("Saldo wszystkich kont")).toBeVisible();
  await expect(tip).toHaveCount(0);
});

test("question mark lists the shortcuts and N opens a new transaction", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "keyboard shortcuts");
  await page.goto("/transactions");
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog", { name: "Skróty klawiszowe" })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("n");
  await expect(page.getByRole("dialog", { name: "Nowa transakcja" })).toBeVisible();
});

test("the monthly report is ready to save as a PDF", async ({ page }) => {
  await page.goto("/transactions");
  await page.getByRole("link", { name: "Pobierz PDF" }).click();
  await expect(page.getByRole("heading", { name: "Raport miesięczny" })).toBeVisible();
  await expect(page).toHaveTitle(/^raport-\d{4}-\d{2}$/);
  await expect(page.getByRole("heading", { name: /Wszystkie transakcje/ })).toBeVisible();
  await page.getByRole("button", { name: "Poprzedni miesiąc" }).click();
  await expect(page).toHaveURL(/month=\d{4}-\d{2}/);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Pobierz PDF" })).toBeHidden();
});
