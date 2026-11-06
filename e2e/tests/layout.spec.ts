import { expect, test, type Page } from "@playwright/test";
import {
  goBack,
  press,
  readHistory,
  reload,
  settle,
  visit,
} from "../../src/testing";

/** The view on show */
const shown = (page: Page) => page.locator("div[data-tab]:not([hidden])");

/** Expects a text in the view on show */
const expectShown = (page: Page, text: string) =>
  expect(shown(page).getByText(text, { exact: true })).toBeVisible();

/** Opens the layout page from the plain page, so it starts on its own entry */
const openLayout = async (page: Page) => {
  await visit(page, "/plain");
  await page.getByRole("link", { name: "Go to layout" }).click();
  return settle(page);
};

/** Opens item 4 and its options on the items tab */
const openItemOptions = async (page: Page) => {
  await press(page, "items tab");
  await press(page, "Open item 4");
  return press(page, "Open options");
};

/** Item 4 with its options, saved by a switch to settings and restored */
const restoreItemOptions = async (page: Page) => {
  const start = await openLayout(page);
  await openItemOptions(page);
  await press(page, "settings tab");
  const restored = await press(page, "items tab");
  await expectShown(page, "Options open");
  return { start, restored };
};

test.describe("tabs at one address", () => {
  test("each tab keeps its steps; back goes through them, then leaves", async ({
    page,
  }) => {
    /* Item 4 with its options on the items tab: three entries above canvas */
    const start = await openLayout(page);
    const options = await openItemOptions(page);
    expect(options.index).toBe(start.index! + 3);
    expect(options.path).toBe("/layout");

    /* Settings takes the slot; items comes back in one entry */
    const settings = await press(page, "settings tab");
    expect(settings.index).toBe(start.index! + 1);
    const restored = await press(page, "items tab");
    expect(restored.index).toBe(start.index! + 1);
    await expectShown(page, "Item 4");
    await expectShown(page, "Options open");

    /* Back steps through the saved steps in the same entry */
    for (const text of ["Options closed", "Items list"]) {
      const back = await goBack(page);
      expect(back.index).toBe(start.index! + 1);
      expect(back.length).toBe(restored.length);
      await expectShown(page, text);
    }

    /* Then canvas, then the page before */
    const canvas = await goBack(page);
    expect(canvas.index).toBe(start.index);
    await expectShown(page, "Canvas");
    const before = await goBack(page);
    expect(before.path).toBe("/plain");
  });

  test("closing restored options shows the item, in the same entry", async ({
    page,
  }) => {
    const { restored } = await restoreItemOptions(page);

    const closed = await press(page, "Close options");
    expect(closed.index).toBe(restored.index);
    expect(closed.length).toBe(restored.length);
    await expectShown(page, "Item 4");
    await expectShown(page, "Options closed");
  });

  test("closing a restored item under its options shows the list", async ({
    page,
  }) => {
    const { restored } = await restoreItemOptions(page);

    const closed = await press(page, "Close item");
    expect(closed.index).toBe(restored.index);
    expect(closed.length).toBe(restored.length);
    await expectShown(page, "Items list");
  });

  test("closing restored options and item together shows the list", async ({
    page,
  }) => {
    const { restored } = await restoreItemOptions(page);

    const closed = await press(page, "Close options and item");
    expect(closed.index).toBe(restored.index);
    expect(closed.length).toBe(restored.length);
    await expectShown(page, "Items list");
  });

  test("a popup closes on a switch; a panel comes back", async ({ page }) => {
    /* The layers panel and the tools popup on canvas */
    await openLayout(page);
    await press(page, "Open layers");
    await press(page, "Open tools");
    await expectShown(page, "Tools open");

    /* Away and back */
    await press(page, "items tab");
    await press(page, "canvas tab");
    await expectShown(page, "Layers open");
    await expectShown(page, "Tools closed");
  });

  test("a reload keeps every tab's steps", async ({ page }) => {
    await openLayout(page);
    await openItemOptions(page);
    await press(page, "settings tab");
    await reload(page);

    await press(page, "items tab");
    await expectShown(page, "Item 4");
    await expectShown(page, "Options open");
  });

  test("a link to the page opens canvas, with nothing put underneath", async ({
    page,
  }) => {
    /* The first tap puts nothing below */
    const start = await visit(page, "/layout");
    await expectShown(page, "Canvas");
    const items = await press(page, "items tab");
    expect(items.index).toBe(start.index! + 1);
    expect(items.length).toBe(start.length + 1);

    /* Back is canvas on the first entry */
    const back = await goBack(page);
    expect(back.index).toBe(0);
    await expectShown(page, "Canvas");
  });

  test("a guard in a tab asks on back, never on a switch", async ({ page }) => {
    /* Unsaved settings in the editor */
    await openLayout(page);
    await press(page, "settings tab");
    await press(page, "Edit settings");
    await press(page, "Change setting");

    /* A switch away and back doesn't ask */
    await press(page, "canvas tab");
    await press(page, "settings tab");
    await expectShown(page, "Unsaved settings");
    await expect(page.getByRole("dialog")).toBeHidden();

    /* Back asks, and the editor stays */
    await goBack(page);
    await expect(
      page.getByRole("dialog", { name: "Discard settings?" }),
    ).toBeVisible();
    expect((await readHistory(page)).path).toBe("/layout");
    await expectShown(page, "Unsaved settings");
  });
});
