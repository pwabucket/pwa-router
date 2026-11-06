import { expect, test } from "@playwright/test";
import { goBack, settle, visit, press } from "../../src/testing";

test.describe("non-inherited", () => {
  test("a push from the panel replaces its entry", async ({ page }) => {
    /* Open the panel, then follow its link */
    const start = await visit(page, "/non-inherited");
    await press(page, "Open panel");
    await page.getByRole("link", { name: "Go to plain page" }).click();
    const pushed = await settle(page);
    expect(pushed.path).toBe("/plain");
    expect(pushed.index).toBe(start.index! + 1);

    /* Back returns to the entry before the panel */
    const back = await goBack(page);
    expect(back.index).toBe(start.index);
    await expect(page.getByText("Panel closed")).toBeVisible();
  });
});
