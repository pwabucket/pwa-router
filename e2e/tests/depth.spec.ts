import { expect, test } from "@playwright/test";
import { press, visit } from "../../src/testing";

test.describe("closing from depth", () => {
  test("closing a layer closes everything above it", async ({ page }) => {
    /* Open the panel, then its question */
    const start = await visit(page, "/depth");
    await press(page, "Open panel");
    await press(page, "Ask");

    /* Confirming closes both in one step */
    const closed = await press(page, "Confirm");
    expect(closed.index).toBe(start.index);
    await expect(page.getByText("Panel closed")).toBeVisible();
    await expect(page.getByText("Question closed")).toBeVisible();
  });

  test("a value set while closing lands on the entry below", async ({
    page,
  }) => {
    /* Open the panel, then its question */
    const start = await visit(page, "/depth");
    await press(page, "Open panel");
    await press(page, "Ask");

    /* Confirm and select in one step */
    const closed = await press(page, "Confirm and select");
    expect(closed.index).toBe(start.index);
    expect(closed.state?.selected).toBe("row-1");
    await expect(page.getByText("Panel closed")).toBeVisible();
    await expect(page.getByText("Selected: row-1")).toBeVisible();
  });

  test("a layer opened right away still closes with its owner", async ({
    page,
  }) => {
    /* The auto panel opens a layer on top of itself as it appears */
    const start = await visit(page, "/depth");
    const opened = await press(page, "Open auto panel");
    expect(opened.index).toBe(start.index! + 2);
    await expect(page.getByText("Auto layer open")).toBeVisible();

    /* Closing the panel closes the auto layer too */
    const closed = await press(page, "Close auto panel");
    expect(closed.index).toBe(start.index);
    await expect(page.getByText("Auto layer closed")).toBeVisible();
  });
});
