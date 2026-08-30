import { expect, test } from "@playwright/test";

async function fillLoanDetails(page: import("@playwright/test").Page) {
  await page.getByLabel(/loan amount/i).fill("50000");
  await page.getByLabel(/loan term/i).fill("36");
  await page.getByLabel(/risk band/i).click();
  await page.getByRole("option", { name: "HIGH" }).click();
}

test("golden path: a forced-success submission renders the quote", async ({ page }) => {
  await page.goto("/");
  await fillLoanDetails(page);

  await page.getByLabel(/simulate vendor response/i).click();
  await page.getByRole("option", { name: "Force success" }).click();

  await page.getByRole("button", { name: /generate quote/i }).click();

  const result = page.getByTestId("quote-result");
  await expect(result).toBeVisible({ timeout: 15_000 });
  await expect(result).toContainText("Commission rate");
  await expect(result).toContainText("Total commission");
});

test("invalid input is rejected client-side without hitting the API", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/loan amount/i).fill("-1");

  await page.getByRole("button", { name: /generate quote/i }).click();

  await expect(page.getByText(/greater than 0/i)).toBeVisible();
  await expect(page.getByTestId("quote-loading")).toHaveCount(0);
});

test("a forced failure shows an error, and retrying with success recovers", async ({ page }) => {
  await page.goto("/");
  await fillLoanDetails(page);

  await page.getByLabel(/simulate vendor response/i).click();
  await page.getByRole("option", { name: "Force failure" }).click();
  await page.getByRole("button", { name: /generate quote/i }).click();

  const error = page.getByTestId("quote-error");
  await expect(error).toBeVisible({ timeout: 15_000 });

  await page.getByLabel(/simulate vendor response/i).click();
  await page.getByRole("option", { name: "Force success" }).click();
  await page.getByRole("button", { name: /^retry$/i }).click();

  const result = page.getByTestId("quote-result");
  await expect(result).toBeVisible({ timeout: 15_000 });
});
