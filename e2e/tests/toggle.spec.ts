import { expect, test } from "@playwright/test";
import { goBack, press, visit } from "../../src/testing";

test.describe("toggle", () => {
  test("opening pushes one entry and back closes it", async ({ page }) => {
    /* Open the dialog */
    const start = await visit(page, "/toggle");
    const opened = await press(page, "Open");
    expect(opened.index).toBe(start.index! + 1);
    await expect(page.getByText("Dialog open")).toBeVisible();

    /* Back closes it */
    const closed = await goBack(page);
    expect(closed.index).toBe(start.index);
    await expect(page.getByText("Dialog closed")).toBeVisible();
  });

  test("closing returns to the entry before the dialog", async ({ page }) => {
    /* Open, then close with the button */
    const start = await visit(page, "/toggle");
    await press(page, "Open");
    const closed = await press(page, "Close");

    expect(closed.index).toBe(start.index);
    await expect(page.getByText("Dialog closed")).toBeVisible();
  });

  test("calls in one tick navigate once", async ({ page }) => {
    /* Opening twice pushes one entry */
    const start = await visit(page, "/toggle");
    const openedTwice = await press(page, "Open twice");
    expect(openedTwice.index).toBe(start.index! + 1);

    /* Closing four times goes back once */
    const closedFourTimes = await press(page, "Close four times");
    expect(closedFourTimes.index).toBe(start.index);

    /* Opening then closing is no change */
    const openedThenClosed = await press(page, "Open then close");
    expect(openedThenClosed.index).toBe(start.index);
    await expect(page.getByText("Dialog closed")).toBeVisible();
  });

  test("closing a closed dialog does nothing", async ({ page }) => {
    /* Close with nothing open */
    const start = await visit(page, "/toggle");
    const after = await press(page, "Close");

    expect(after.index).toBe(start.index);
    expect(after.path).toBe("/toggle");
  });
});
