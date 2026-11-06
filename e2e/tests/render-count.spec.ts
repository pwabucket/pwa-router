import { expect, test } from "@playwright/test";
import { press, visit } from "../../src/testing";

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
      await press(page, `Read row ${id}`);
      const text = await page.getByText(`Row ${id} commits:`).textContent();
      const commits = Number(text?.split(": ")[1]);
      expect(commits).toBeLessThanOrEqual(2);
    }
  });
});
