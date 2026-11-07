import { expect, test, type Page } from "@playwright/test";
import { press, visit } from "../../src/testing";

/** Reads a row's commit count */
const readCommits = async (page: Page, name: string) => {
  await press(page, `Read ${name}`);
  const text = await page
    .getByText(new RegExp(`^${name} commits:`))
    .textContent();
  return Number(text?.split(": ")[1]);
};

test.describe("render count", () => {
  test("rows that only open a layer never re-render", async ({ page }) => {
    /* Open from one row, close, open from the other */
    await visit(page, "/render-count");
    await press(page, "Open from row 1");
    await press(page, "Close dialog");
    await press(page, "Open from row 2");
    await press(page, "Close dialog");

    /* Each row committed only on mount (twice under StrictMode) */
    for (const id of [1, 2]) {
      expect(await readCommits(page, `Row ${id}`)).toBeLessThanOrEqual(2);
    }
  });

  test("rows reading the router for other things re-render no more than they must", async ({
    page,
  }) => {
    /* Open and close the shared dialog twice */
    await visit(page, "/render-count");
    for (let round = 0; round < 2; round++) {
      await press(page, "Open from row 1");
      await press(page, "Close dialog");
    }

    /* A dialog of its own and a guard commit only on mount (twice under StrictMode) */
    expect
      .soft(await readCommits(page, "Own dialog row"))
      .toBeLessThanOrEqual(2);
    expect.soft(await readCommits(page, "Guard row")).toBeLessThanOrEqual(2);

    /* A link and a navigate commit no more than React Router's own */
    const routerLink = await readCommits(page, "Router link");
    const routerNavigate = await readCommits(page, "Router navigate row");
    expect
      .soft(await readCommits(page, "Link"))
      .toBeLessThanOrEqual(routerLink);
    expect
      .soft(await readCommits(page, "Navigate row"))
      .toBeLessThanOrEqual(routerNavigate);
  });
});
