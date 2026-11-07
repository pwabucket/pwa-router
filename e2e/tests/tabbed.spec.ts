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

/** Follows a link in the view on show */
const follow = async (page: Page, name: string) => {
  await shown(page).getByRole("link", { name, exact: true }).click();
  return settle(page);
};

/** Expects a text in the view on show */
const expectShown = (page: Page, text: string) =>
  expect(shown(page).getByText(text, { exact: true })).toBeVisible();

/** Counts history writes, to compare switches at different depths */
const countHistoryWrites = async (page: Page) => {
  await page.evaluate(() => {
    const counts = { push: 0, replace: 0 };
    const push = history.pushState.bind(history);
    const replace = history.replaceState.bind(history);
    history.pushState = (...args) => {
      counts.push += 1;
      push(...args);
    };
    history.replaceState = (...args) => {
      counts.replace += 1;
      replace(...args);
    };
    Object.assign(window, { historyWrites: counts });
  });
};

/** The history writes counted since countHistoryWrites */
const readHistoryWrites = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { historyWrites: { push: number } }).historyWrites,
  );

/** Goes from the home feed to the search tab's photo of the given number */
const openPhoto = async (page: Page, photo: number) => {
  await press(page, "search tab");
  await follow(page, "Open results");
  await follow(page, "Open photo 1");
  for (let number = 1; number < photo; number++) {
    await follow(page, "Next photo");
  }
};

test.describe("tabbed app", () => {
  test("history holds home's pages and one tab slot", async ({ page }) => {
    /* Home one page deep, then Search two pages deep */
    const start = await visit(page, "/tabbed");
    await follow(page, "Open post 1");
    await press(page, "search tab");
    const results = await follow(page, "Open results");
    expect(results.index).toBe(start.index! + 3);

    /* Switching to Profile closes Search's pages */
    const profile = await press(page, "profile tab");
    expect(profile.index).toBe(start.index! + 2);
    expect(profile.path).toBe("/tabbed/profile");

    /* Back returns home where it was left */
    const back = await goBack(page);
    expect(back.index).toBe(start.index! + 1);
    await expectShown(page, "Post 1");
    await expect(page.getByText("Active home")).toBeVisible();
  });

  test("a restored tab backs through its pages in one entry", async ({
    page,
  }) => {
    /* Search four pages deep, then away and back */
    const start = await visit(page, "/tabbed");
    await openPhoto(page, 2);
    await press(page, "profile tab");
    const restored = await press(page, "search tab");
    expect(restored.index).toBe(start.index! + 1);
    await expectShown(page, "Photo 2");

    /* Back steps through the saved pages in the same entry */
    for (const text of ["Photo 1", "Results", "Search"]) {
      const back = await goBack(page);
      expect(back.index).toBe(start.index! + 1);
      expect(back.length).toBe(restored.length);
      await expectShown(page, text);
    }

    /* The last back goes home */
    const home = await goBack(page);
    expect(home.index).toBe(start.index);
    await expectShown(page, "Feed");
  });

  test("a switch costs one push at any depth", async ({ page }) => {
    /* Search two pages deep: count a switch back to it */
    await visit(page, "/tabbed");
    await press(page, "search tab");
    await follow(page, "Open results");
    await press(page, "profile tab");
    await countHistoryWrites(page);
    await press(page, "search tab");
    const shallow = await readHistoryWrites(page);

    /* Search twelve pages deep: count the same switch */
    await visit(page, "/tabbed");
    await openPhoto(page, 10);
    await press(page, "profile tab");
    await countHistoryWrites(page);
    await press(page, "search tab");
    const deep = await readHistoryWrites(page);

    expect(deep).toEqual(shallow);
    expect(deep.push).toBe(1);
  });

  test("a switch closes a tab's frame entries too", async ({ page }) => {
    /* Search's results, with two frame navigations */
    const start = await visit(page, "/tabbed");
    await press(page, "search tab");
    await follow(page, "Open results");
    const frame = shown(page).frameLocator("iframe");
    await frame.getByText("Frame page 1").click();
    await frame.getByText("Frame page 2").click();
    await settle(page);

    /* Switching to Profile closes all of it */
    const profile = await press(page, "profile tab");
    expect(profile.index).toBe(start.index! + 1);
    expect(profile.path).toBe("/tabbed/profile");

    /* Back goes home */
    const back = await goBack(page);
    expect(back.path).toBe("/tabbed");
    await expectShown(page, "Feed");
  });

  test("tapping the active tab pops to its root", async ({ page }) => {
    /* Search three pages deep, then tap Search */
    const start = await visit(page, "/tabbed");
    await openPhoto(page, 1);
    const popped = await press(page, "search tab");

    expect(popped.index).toBe(start.index! + 1);
    expect(popped.path).toBe("/tabbed/search");
    await expectShown(page, "Search");
  });

  test("a popup closes on a switch; a panel and an in-place value come back", async ({
    page,
  }) => {
    /* A query on Search, then a dialog and a popup on a home post */
    await visit(page, "/tabbed");
    await press(page, "search tab");
    await shown(page).getByLabel("Query").fill("example");
    await follow(page, "Open results");
    await press(page, "home tab");
    await follow(page, "Open post 1");
    await press(page, "Open share");
    await press(page, "Open more");
    await expectShown(page, "More open");

    /* Switch away and back: the dialog is open, the popup closed */
    await press(page, "search tab");
    await press(page, "home tab");
    await expectShown(page, "Post 1");
    await expectShown(page, "Share open");
    await expectShown(page, "More closed");

    /* Back closes the dialog */
    await goBack(page);
    await expectShown(page, "Share closed");

    /* Search's query comes back with its page */
    await press(page, "search tab");
    await goBack(page);
    await expect(shown(page).getByLabel("Query")).toHaveValue("example");
  });

  test("a restored tab backs through its layers in one entry", async ({
    page,
  }) => {
    /* Filters open on Search's results, then away and back */
    const start = await visit(page, "/tabbed");
    await press(page, "search tab");
    await follow(page, "Open results");
    await press(page, "Open filters");
    await press(page, "profile tab");
    const restored = await press(page, "search tab");
    expect(restored.index).toBe(start.index! + 1);
    await expectShown(page, "Filters open");

    /* Back closes the filters in the same entry */
    const closed = await goBack(page);
    expect(closed.index).toBe(start.index! + 1);
    expect(closed.length).toBe(restored.length);
    await expectShown(page, "Results");
    await expectShown(page, "Filters closed");

    /* Back shows Search, then home */
    await goBack(page);
    await expectShown(page, "Search");
    const home = await goBack(page);
    expect(home.index).toBe(start.index);
  });

  test("closing a restored layer shows the step below in its entry", async ({
    page,
  }) => {
    /* Filters open on Search's results, then away and back */
    const start = await visit(page, "/tabbed");
    await press(page, "search tab");
    await follow(page, "Open results");
    await press(page, "Open filters");
    await press(page, "profile tab");
    const restored = await press(page, "search tab");
    await expectShown(page, "Filters open");

    /* Its own button closes it without a traversal or a new entry */
    const closed = await press(page, "Close filters");
    expect(closed.index).toBe(start.index! + 1);
    expect(closed.length).toBe(restored.length);
    await expectShown(page, "Results");
    await expectShown(page, "Filters closed");

    /* Back shows Search */
    await goBack(page);
    await expectShown(page, "Search");
  });

  test("leaving the area clears every tab's history", async ({ page }) => {
    /* Come from the plain page, then go deep in two tabs */
    await visit(page, "/plain");
    await page.getByRole("link", { name: "Go to tabbed app" }).click();
    await settle(page);
    await follow(page, "Open post 1");
    await openPhoto(page, 1);

    /* Log out lands outside, and back never re-enters a tab page */
    await page.getByRole("link", { name: "Log out" }).click();
    const outside = await settle(page);
    expect(outside.path).toBe("/plain");

    const back = await goBack(page);
    expect(back.path.startsWith("/tabbed")).toBe(false);
  });

  test("a plain link out of the area doesn't take tab data", async ({
    page,
  }) => {
    /* Leave by a plain link */
    await visit(page, "/tabbed");
    await press(page, "profile tab");
    const outside = await follow(page, "Plain link out");

    expect(outside.path).toBe("/plain");
    const record = outside.state?.__router as
      | { areas: { id: string }[] }
      | undefined;
    expect(record?.areas.map((area) => area.id) ?? []).not.toContain("main");
  });

  test("two quick taps end on the second tab", async ({ page }) => {
    /* Home one page deep, then tap two tabs without waiting */
    const start = await visit(page, "/tabbed");
    await follow(page, "Open post 1");
    await page.evaluate(() => {
      const tabButton = (name: string) =>
        [...document.querySelectorAll("button")].find(
          (button) => button.textContent === name,
        )!;

      /* The second tap lands while the first switch is on its way */
      tabButton("search tab").click();
      setTimeout(() => tabButton("profile tab").click(), 0);
    });
    const settled = await settle(page);

    /* Profile sits in the one slot above home's pages */
    expect(settled.path).toBe("/tabbed/profile");
    expect(settled.index).toBe(start.index! + 2);
    await expectShown(page, "Profile");

    /* Back returns home where it was left */
    await goBack(page);
    await expectShown(page, "Post 1");
  });

  test("a raw React Router link joins the tab", async ({ page }) => {
    /* Follow the raw link from a post */
    const start = await visit(page, "/tabbed");
    await follow(page, "Open post 1");
    const raw = await follow(page, "Raw link to post 2");
    expect(raw.index).toBe(start.index! + 2);
    await expectShown(page, "Post 2");

    /* It is a page of the home tab: switching away and back keeps it */
    await press(page, "search tab");
    await press(page, "home tab");
    await expectShown(page, "Post 2");
  });

  test("a reload keeps the tabs", async ({ page }) => {
    /* Restore Search, then reload */
    await visit(page, "/tabbed");
    await openPhoto(page, 2);
    await press(page, "profile tab");
    await press(page, "search tab");
    await reload(page);
    await expectShown(page, "Photo 2");
    await expect(page.getByText("Active search")).toBeVisible();

    /* Back still steps through the saved pages */
    await goBack(page);
    await expectShown(page, "Photo 1");
  });

  test("a deep link opens in its tab, with the roots below", async ({
    page,
  }) => {
    /* Open a search photo directly, then interact once */
    await visit(page, "/tabbed/search/photo/1");
    await expect(page.getByText("Active search")).toBeVisible();
    await press(page, "Like");

    /* Back goes to Search's root, then home */
    await goBack(page);
    await expectShown(page, "Search");
    const home = await goBack(page);
    expect(home.path).toBe("/tabbed");
    await expectShown(page, "Feed");
  });

  test("unsaved work survives a switch; leaving the area asks", async ({
    page,
  }) => {
    /* Unsaved work on the profile form */
    await visit(page, "/tabbed");
    await press(page, "profile tab");
    await follow(page, "Edit profile");
    await press(page, "Change name");

    /* A switch away and back keeps it, without asking */
    await press(page, "search tab");
    await press(page, "profile tab");
    await expectShown(page, "Unsaved profile");
    await expect(page.getByRole("dialog")).toBeHidden();

    /* Log out asks; leave finishes it */
    await page.getByRole("link", { name: "Log out" }).click();
    await settle(page);
    await expect(
      page.getByRole("dialog", { name: "Discard profile changes?" }),
    ).toBeVisible();
    const left = await press(page, "Leave");
    expect(left.path).toBe("/plain");
  });

  test("back from unsaved work on a restored page asks", async ({ page }) => {
    /* Unsaved work, then away and back: the form is a restored page */
    await visit(page, "/tabbed");
    await press(page, "profile tab");
    await follow(page, "Edit profile");
    await press(page, "Change name");
    await press(page, "home tab");
    await press(page, "profile tab");

    /* Back asks before leaving it */
    await goBack(page);
    await expect(
      page.getByRole("dialog", { name: "Discard profile changes?" }),
    ).toBeVisible();
    expect((await readHistory(page)).path).toBe("/tabbed/profile/edit");
  });
});
