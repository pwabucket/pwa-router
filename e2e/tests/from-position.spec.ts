import { expect, test } from "@playwright/test";
import { press, settle, visit } from "../../src/testing";

test.describe("from position", () => {
  test("a sidebar link closes the sidebar's entry, then replaces", async ({
    page,
  }) => {
    /* Open the sidebar, then follow its link */
    const start = await visit(page, "/from-position");
    await press(page, "Open sidebar");
    await page.getByRole("link", { name: "Sidebar link to plain" }).click();
    const followed = await settle(page);

    /* The sidebar's entry is gone and the page was replaced */
    expect(followed.path).toBe("/plain");
    expect(followed.index).toBe(start.index);
    expect(followed.state?.sidebar).toBeUndefined();
  });
});
