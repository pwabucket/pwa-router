import { expect, test } from "@playwright/test";
import { press, reload, visit } from "../../src/testing";

test.describe("ephemeral", () => {
  test("a non-persistent dialog is closed after a reload", async ({ page }) => {
    /* Open, then reload */
    const start = await visit(page, "/ephemeral");
    await press(page, "Open");
    const reloaded = await reload(page);

    /* The dialog is gone and so is its entry */
    expect(reloaded.index).toBe(start.index);
    await expect(page.getByText("Dialog closed")).toBeVisible();
  });

  test("stale layers two deep are closed after a reload", async ({ page }) => {
    /* Open two non-persistent layers, then reload */
    const start = await visit(page, "/nested-ephemeral");
    await press(page, "Open outer");
    await press(page, "Open inner");
    const reloaded = await reload(page);

    /* Both are gone and so are their entries */
    expect(reloaded.index).toBe(start.index);
    await expect(page.getByText("Outer closed")).toBeVisible();
    await expect(page.getByText("Inner closed")).toBeVisible();
  });
});
