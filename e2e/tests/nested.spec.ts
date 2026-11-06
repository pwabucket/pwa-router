import { expect, test, type Page } from "@playwright/test";
import { goBack, press, settle, visit } from "../../src/testing";

/** The inner view on show, inside the outer view on show */
const shownInner = (page: Page) =>
  page.locator(
    "div[data-outer-tab]:not([hidden]) div[data-inner-tab]:not([hidden])",
  );

/** Follows a link in the inner view on show */
const follow = async (page: Page, name: string) => {
  await shownInner(page).getByRole("link", { name, exact: true }).click();
  return settle(page);
};

/** Expects a text in the inner view on show */
const expectShown = (page: Page, text: string) =>
  expect(shownInner(page).getByText(text, { exact: true })).toBeVisible();

/** Counts pushState calls from now on */
const countPushes = (page: Page) =>
  page.evaluate(() => {
    const counts = { push: 0 };
    const push = history.pushState.bind(history);
    history.pushState = (...args) => {
      counts.push += 1;
      push(...args);
    };
    Object.assign(window, { pushCounts: counts });
  });

/** The pushes counted since countPushes */
const readPushes = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { pushCounts: { push: number } }).pushCounts
        .push,
  );

/** Library open on music, two albums deep, after a page in books */
const openMusicDeep = async (page: Page) => {
  const start = await visit(page, "/nested");
  await press(page, "library tab");
  await follow(page, "Open book 1");
  await press(page, "music tab");
  await follow(page, "Open album 1");
  await follow(page, "Next album");
  return start;
};

test.describe("nested tabs", () => {
  test("the outer tab restores the inner tab and pages at one push", async ({
    page,
  }) => {
    /* Away to the outer home, then back to the library */
    const start = await openMusicDeep(page);
    await press(page, "home tab");
    await countPushes(page);
    const restored = await press(page, "library tab");

    /* One push, and the inner tab is where it was */
    expect(await readPushes(page)).toBe(1);
    expect(restored.index).toBe(start.index! + 1);
    await expectShown(page, "Album 2");
    await expect(page.getByText("Active music")).toBeVisible();
  });

  test("back steps through a restored inner tab's pages", async ({ page }) => {
    /* Restore the library */
    const start = await openMusicDeep(page);
    await press(page, "home tab");
    await press(page, "library tab");

    /* Back shows the inner pages in the same entry */
    for (const text of ["Album 1", "Music"]) {
      const back = await goBack(page);
      expect(back.index).toBe(start.index! + 1);
      await expectShown(page, text);
    }
  });

  test("back from an inner tab's root shows the inner default tab", async ({
    page,
  }) => {
    /* Books one page deep, then music */
    await visit(page, "/nested");
    await press(page, "library tab");
    await follow(page, "Open book 1");
    await press(page, "music tab");

    /* Back returns to books where it was left */
    await goBack(page);
    await expectShown(page, "Book 1");
    await expect(page.getByText("Active books")).toBeVisible();
  });

  test(
    "after an outer restore, back from an inner tab's root shows the default",
    async ({ page }) => {
      /* Restore the library, then back to music's root */
      await openMusicDeep(page);
      await press(page, "home tab");
      await press(page, "library tab");
      await goBack(page);
      await goBack(page);

      /* Back from music's root shows books where it was left */
      await goBack(page);
      await expectShown(page, "Book 1");

      /* Then books' root, then the outer home */
      await goBack(page);
      await expectShown(page, "Books");
      await goBack(page);
      await expect(
        page
          .locator("div[data-outer-tab]:not([hidden])")
          .getByText("Outer home", { exact: true }),
      ).toBeVisible();
    },
  );

  test("after an outer restore, the default tab button shows it", async ({
    page,
  }) => {
    /* Restore the library on music */
    const start = await openMusicDeep(page);
    await press(page, "home tab");
    await press(page, "library tab");

    /* Books shows where it was left, in the same entry */
    const books = await press(page, "books tab");
    expect(books.index).toBe(start.index! + 1);
    await expectShown(page, "Book 1");
  });
});
