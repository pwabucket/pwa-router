import { expect, test } from "@playwright/test";
import { goBack, press, visit } from "../../src/testing";

test.describe("search params", () => {
  test("setting params adds an entry; replace doesn't", async ({ page }) => {
    /* The default shows before anything is set */
    const start = await visit(page, "/search-params");
    await expect(page.getByText("Page 1")).toBeVisible();

    /* A push, then a replace */
    const next = await press(page, "Next page");
    expect(next.path).toBe("/search-params?page=2");
    expect(next.index).toBe(start.index! + 1);

    const jumped = await press(page, "Jump in place");
    expect(jumped.path).toBe("/search-params?page=3");
    expect(jumped.index).toBe(start.index! + 1);

    /* Back returns to the page without params */
    const back = await goBack(page);
    expect(back.path).toBe("/search-params");
  });
});
