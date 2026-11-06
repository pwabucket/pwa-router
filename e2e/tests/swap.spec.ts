import { expect, test, type Page } from "@playwright/test";
import { goBack, press, settle, visit } from "../../src/testing";

/** Opens the menu, picks an item, and checks the dialog took its place */
const expectSwap = async (page: Page, item: string) => {
  /* Open the menu, then pick the item */
  const start = await visit(page, "/swap");
  await press(page, "Open menu");
  await press(page, item);
  const picked = await settle(page);

  /* The dialog took the menu's place */
  expect(picked.index).toBe(start.index! + 1);
  await expect(page.getByText("Dialog open")).toBeVisible();
  await expect(page.getByText("Menu closed")).toBeVisible();

  /* Back returns to the page in one press */
  const back = await goBack(page);
  expect(back.index).toBe(start.index);
  await expect(page.getByText("Dialog closed")).toBeVisible();
  await expect(page.getByText("Menu closed")).toBeVisible();
};

test.describe("swap", () => {
  test("menu item: close then open in one tick", ({ page }) =>
    expectSwap(page, "Menu item, close first"));

  test("menu item: open then close in one tick", ({ page }) =>
    expectSwap(page, "Menu item, open first"));

  test("menu item: close, then open a tick later", ({ page }) =>
    expectSwap(page, "Menu item, close then open later"));

  test("menu item: open, then close a tick later", ({ page }) =>
    expectSwap(page, "Menu item, open then close later"));

  test("sheet item replaces the sheet", async ({ page }) => {
    /* Open the sheet, then pick its item */
    const start = await visit(page, "/swap");
    await press(page, "Open sheet");
    const picked = await press(page, "Sheet item");
    expect(picked.index).toBe(start.index! + 1);
    await expect(page.getByText("Dialog open")).toBeVisible();
    await expect(page.getByText("Sheet closed")).toBeVisible();

    /* Back goes to the page, not the sheet */
    const back = await goBack(page);
    expect(back.index).toBe(start.index);
    await expect(page.getByText("Sheet closed")).toBeVisible();
    await expect(page.getByText("Dialog closed")).toBeVisible();
  });
});
