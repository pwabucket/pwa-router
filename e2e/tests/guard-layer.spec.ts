import { expect, test, type Page } from "@playwright/test";
import { goBack, press, visit } from "../../src/testing";

/** Opens the editor and makes edits */
const openWithChanges = async (page: Page) => {
  const start = await visit(page, "/guard-layer");
  await press(page, "Open editor");
  await press(page, "Edit");
  return start;
};

/** The question is showing over the screen, with the work intact */
const expectQuestion = async (page: Page) => {
  const question = page.getByRole("dialog", { name: "Discard edits?" });
  await expect(question).toBeVisible();
  await expect(page.getByText("Unsaved edits")).toBeVisible();
};

test.describe("layer guard", () => {
  test("back asks; stay keeps the screen", async ({ page }) => {
    /* Back asks */
    const start = await openWithChanges(page);
    await goBack(page);
    await expectQuestion(page);

    /* Stay keeps the screen as it was */
    const stayed = await press(page, "Stay");
    expect(stayed.index).toBe(start.index! + 1);
    await expect(page.getByText("Editor open")).toBeVisible();
    await expect(page.getByText("Unsaved edits")).toBeVisible();
  });

  test("the close button asks; leave closes the screen", async ({ page }) => {
    /* Close asks */
    const start = await openWithChanges(page);
    await press(page, "Close editor");
    await expectQuestion(page);

    /* Leave closes question and screen together */
    const left = await press(page, "Leave");
    expect(left.index).toBe(start.index);
    await expect(page.getByText("Editor closed")).toBeVisible();
  });

  test("leave after back closes the screen", async ({ page }) => {
    /* Back, then leave */
    const start = await openWithChanges(page);
    await goBack(page);
    const left = await press(page, "Leave");

    expect(left.index).toBe(start.index);
    await expect(page.getByText("Editor closed")).toBeVisible();
  });

  test("closing again while the question shows changes nothing", async ({
    page,
  }) => {
    /* Close twice */
    const start = await openWithChanges(page);
    await press(page, "Close editor");
    const twice = await press(page, "Close editor");
    expect(twice.index).toBe(start.index! + 2);
    await expectQuestion(page);

    /* Stay still works, and the next close asks again */
    await press(page, "Stay");
    await expect(page.getByRole("dialog")).toBeHidden();
    await press(page, "Close editor");
    await expectQuestion(page);
  });

  test("its own pane never asks", async ({ page }) => {
    /* Open and close the pane, by button and by back */
    const start = await openWithChanges(page);
    await press(page, "Open pane");
    await press(page, "Close pane");
    await press(page, "Open pane");
    const back = await goBack(page);

    expect(back.index).toBe(start.index! + 1);
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByText("Pane closed")).toBeVisible();
  });

  test("with nothing unsaved, back simply closes", async ({ page }) => {
    /* Open without edits, then back */
    const start = await visit(page, "/guard-layer");
    await press(page, "Open editor");
    const back = await goBack(page);

    expect(back.index).toBe(start.index);
    await expect(page.getByText("Editor closed")).toBeVisible();
  });
});
