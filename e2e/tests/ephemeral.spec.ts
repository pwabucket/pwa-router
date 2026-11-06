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
});
