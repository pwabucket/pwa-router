import { expect, test } from "@playwright/test";
import { press, settle, visit } from "../../src/testing";

test.describe("iframe", () => {
  test("closing skips the frame's own entries", async ({ page }) => {
    /* Open the sheet */
    const start = await visit(page, "/iframe");
    await press(page, "Open sheet");

    /* Navigate inside the frame twice */
    const frame = page.frameLocator("iframe");
    await frame.getByText("Frame page 1").click();
    await frame.getByText("Frame page 2").click();
    const navigated = await settle(page);
    expect(navigated.length).toBe(start.length + 3);

    /* Closing lands on the entry before the sheet */
    const closed = await press(page, "Close sheet");
    expect(closed.index).toBe(start.index);
    expect(closed.state?.sheet).toBeUndefined();
    await expect(page.getByText("Sheet closed")).toBeVisible();
  });
});
