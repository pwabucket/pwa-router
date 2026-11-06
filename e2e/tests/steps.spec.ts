import { expect, test } from "@playwright/test";
import { goBack, press, visit } from "../../src/testing";

test.describe("steps", () => {
  test("clearing steps back one push; reset goes before the first", async ({
    page,
  }) => {
    /* Go to step 3 */
    const start = await visit(page, "/steps");
    await press(page, "Next");
    await press(page, "Next");
    const third = await press(page, "Next");
    expect(third.index).toBe(start.index! + 3);

    /* Previous goes back one step */
    const second = await press(page, "Previous");
    expect(second.index).toBe(start.index! + 2);
    await expect(page.getByText("Step 2")).toBeVisible();

    /* Reset goes back before the first step */
    const reset = await press(page, "Reset");
    expect(reset.index).toBe(start.index);
    await expect(page.getByText("Step 0")).toBeVisible();
  });

  test("back steps through each push", async ({ page }) => {
    /* Go to step 2, then press back */
    const start = await visit(page, "/steps");
    await press(page, "Next");
    await press(page, "Next");
    const back = await goBack(page);

    expect(back.index).toBe(start.index! + 1);
    await expect(page.getByText("Step 1")).toBeVisible();
  });
});
