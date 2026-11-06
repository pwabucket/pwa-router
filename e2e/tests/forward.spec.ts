import { expect, test } from "@playwright/test";
import { goBack, goForward, press, settle, visit } from "../../src/testing";

test.describe("forward", () => {
  test("forward reopens a closed layer", async ({ page }) => {
    /* Open, back, forward */
    const start = await visit(page, "/toggle");
    await press(page, "Open");
    await goBack(page);
    const forward = await goForward(page);

    expect(forward.index).toBe(start.index! + 1);
    await expect(page.getByText("Dialog open")).toBeVisible();
  });

  test("forward returns to a tab's page", async ({ page }) => {
    /* Search's results, back to its root, then forward */
    await visit(page, "/tabbed");
    await press(page, "search tab");
    await page
      .locator("div[data-tab]:not([hidden])")
      .getByRole("link", { name: "Open results" })
      .click();
    await settle(page);
    await goBack(page);
    const forward = await goForward(page);

    expect(forward.path).toBe("/tabbed/search/results");
    await expect(page.getByText("Active search")).toBeVisible();
  });
});
