import { expect, test } from "@playwright/test";
import { goBack, press, visit } from "../../src/testing";

test.describe("tabs", () => {
  test("tabs share one entry; back returns to the default", async ({
    page,
  }) => {
    /* Overview → Details → Settings */
    const start = await visit(page, "/tabs");
    await press(page, "Show details");
    const settings = await press(page, "Show settings");
    expect(settings.index).toBe(start.index! + 1);

    /* Open and close a dialog */
    await press(page, "Open dialog");
    await press(page, "Close dialog");

    /* One back returns to the overview */
    const back = await goBack(page);
    expect(back.index).toBe(start.index);
    await expect(page.getByText("Tab overview")).toBeVisible();
  });

  test("choosing the default closes what is on top", async ({ page }) => {
    /* Details, then a dialog, then the overview from under it */
    const start = await visit(page, "/tabs");
    await press(page, "Show details");
    await press(page, "Open dialog");
    const chosen = await press(page, "Show overview");

    expect(chosen.index).toBe(start.index);
    await expect(page.getByText("Tab overview")).toBeVisible();
    await expect(page.getByText("Dialog closed")).toBeVisible();
  });

  test("switching tabs never asks the unsaved-work question", async ({
    page,
  }) => {
    /* Unsaved work, then move between tabs */
    const start = await visit(page, "/tabs");
    await press(page, "Make changes");
    await press(page, "Show settings");
    await press(page, "Show details");
    const chosen = await press(page, "Show overview");

    expect(chosen.index).toBe(start.index);
    await expect(page.getByText("Tab overview")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});

test.describe("two panes", () => {
  test("opening items never stacks; back returns to the list", async ({
    page,
  }) => {
    /* Open one item, then another */
    const start = await visit(page, "/tabs");
    await press(page, "Show item a");
    const second = await press(page, "Show item b");
    expect(second.index).toBe(start.index! + 1);
    await expect(page.getByText("Item b", { exact: true })).toBeVisible();

    /* Back returns to the list */
    const back = await goBack(page);
    expect(back.index).toBe(start.index);
    await expect(page.getByText("Item list", { exact: true })).toBeVisible();
  });
});
