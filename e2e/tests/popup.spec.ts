import { expect, test } from "@playwright/test";
import { goBack, press, reload, visit } from "../../src/testing";

test.describe("popups", () => {
  test("each instance is its own layer and closes on back", async ({
    page,
  }) => {
    /* Open both popups */
    const start = await visit(page, "/popup");
    await press(page, "Open Menu A");
    await press(page, "Open Menu B");
    await expect(page.getByText("Menu A closed")).toBeVisible();
    await expect(page.getByText("Menu B open")).toBeVisible();

    /* Back closes the open one and returns to the page */
    const back = await goBack(page);
    expect(back.index).toBe(start.index);
    await expect(page.getByText("Menu B closed")).toBeVisible();
  });

  test("extra arguments from the library are ignored", async ({ page }) => {
    /* Open, then close with the library's details */
    const start = await visit(page, "/popup");
    await press(page, "Open Menu A");
    const closed = await press(page, "Close Menu A");

    expect(closed.index).toBe(start.index);
    await expect(page.getByText("Menu A closed")).toBeVisible();
  });

  test("a popup never reopens after a reload", async ({ page }) => {
    /* Open, then reload */
    const start = await visit(page, "/popup");
    await press(page, "Open Menu A");
    const reloaded = await reload(page);

    expect(reloaded.index).toBe(start.index);
    await expect(page.getByText("Menu A closed")).toBeVisible();
  });

  test("a non-persistent section leaves no dead entry after a reload", async ({
    page,
  }) => {
    /* Come from another page, open the section's dialog, reload */
    await visit(page, "/plain");
    const start = await visit(page, "/popup");
    await press(page, "Open section dialog");
    const reloaded = await reload(page);
    expect(reloaded.index).toBe(start.index);
    await expect(page.getByText("Section dialog closed")).toBeVisible();

    /* The first back goes to the previous page */
    await page.goBack();
    await expect(page.getByText("Plain page")).toBeVisible();
  });
});
