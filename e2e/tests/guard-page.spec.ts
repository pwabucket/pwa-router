import { expect, test, type Page } from "@playwright/test";
import { goBack, press, settle, visit } from "../../src/testing";

/** Opens the guard page from the plain page and makes unsaved changes */
const openWithChanges = async (page: Page) => {
  await visit(page, "/plain");
  await page.getByRole("link", { name: "Go to guard page" }).click();
  const start = await settle(page);
  await press(page, "Make changes");
  return start;
};

/** The question is showing, on the guard page, with the work intact */
const expectQuestion = async (page: Page) => {
  const question = page.getByRole("dialog", { name: "Leave without saving?" });
  await expect(question).toBeVisible();
  await expect(page.getByText("Guard page")).toBeVisible();
  await expect(page.getByText("Unsaved changes")).toBeVisible();
};

test.describe("page guard", () => {
  test("back asks, back on the question stays, it asks again", async ({
    page,
  }) => {
    /* Back with unsaved work asks */
    const start = await openWithChanges(page);
    await goBack(page);
    await expectQuestion(page);

    /* Back on the question means stay */
    const stayed = await goBack(page);
    expect(stayed.index).toBe(start.index);
    expect(stayed.path).toBe("/guard-page");
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Unsaved changes")).toBeVisible();

    /* The next back asks again */
    await goBack(page);
    await expectQuestion(page);
  });

  test("leave after back lands where back was going", async ({ page }) => {
    /* Back, then leave */
    const start = await openWithChanges(page);
    await goBack(page);
    const left = await press(page, "Leave");

    expect(left.path).toBe("/plain");
    expect(left.index).toBe(start.index! - 1);
  });

  test("stay keeps the page as it was", async ({ page }) => {
    /* Back, then stay */
    const start = await openWithChanges(page);
    await goBack(page);
    const stayed = await press(page, "Stay");

    expect(stayed.index).toBe(start.index);
    expect(stayed.path).toBe("/guard-page");
    await expect(page.getByText("Unsaved changes")).toBeVisible();
  });

  test("a link asks, and leave follows it", async ({ page }) => {
    /* Follow the link */
    const start = await openWithChanges(page);
    await page.getByRole("link", { name: "Leave by link" }).click();
    await settle(page);
    await expectQuestion(page);

    /* Leave goes to the link, in the question's place */
    const left = await press(page, "Leave");
    expect(left.path).toBe("/plain");
    expect(left.index).toBe(start.index! + 1);

    /* Back returns to the guard page, not the question */
    const back = await goBack(page);
    expect(back.path).toBe("/guard-page");
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("the in-app back button asks", async ({ page }) => {
    /* Press the in-app back */
    await openWithChanges(page);
    await press(page, "In-app back");
    await expectQuestion(page);
  });

  test("moves inside the page never ask", async ({ page }) => {
    /* Open and close a dialog, switch a tab, close by back */
    const start = await openWithChanges(page);
    await press(page, "Open dialog");
    await press(page, "Close dialog");
    await press(page, "Open dialog");
    await goBack(page);
    const after = await press(page, "Details tab");

    expect(after.index).toBe(start.index);
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Tab details")).toBeVisible();
  });

  test("once saved, back leaves with no extra taps", async ({ page }) => {
    /* Save, then back */
    const start = await openWithChanges(page);
    await press(page, "Save");
    const back = await goBack(page);

    expect(back.path).toBe("/plain");
    expect(back.index).toBe(start.index! - 1);
  });
});

test.describe("deep link home", () => {
  test("back from a page opened directly goes home first", async ({ page }) => {
    /* Open an inner page directly, then interact once */
    await visit(page, "/guard-page?deep-link-home");
    const interacted = await press(page, "Details tab");
    expect(interacted.index).toBe(1);
    expect(interacted.path).toBe("/guard-page?deep-link-home");

    /* Back shows home */
    const back = await goBack(page);
    expect(back.path).toBe("/");
    expect(back.index).toBe(0);
  });

  test("the guard asks on a page opened directly", async ({ page }) => {
    /* Open directly with unsaved work, then back */
    await visit(page, "/guard-page?deep-link-home");
    await press(page, "Make changes");
    await goBack(page);
    await expectQuestion(page);
  });

  test("a reload adds nothing more", async ({ page }) => {
    /* Interact, reload, interact again */
    await visit(page, "/guard-page?deep-link-home");
    const first = await press(page, "Details tab");
    await page.reload();
    await settle(page);
    const second = await press(page, "Make changes");

    expect(second.length).toBe(first.length);
    expect(second.index).toBe(1);
  });
});
