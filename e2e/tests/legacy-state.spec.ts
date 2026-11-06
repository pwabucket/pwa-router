import { expect, test } from "@playwright/test";
import { press, reload, visit } from "../../src/testing";

test.describe("state from older versions", () => {
  test("a 0.0.25 non-persistent dialog is closed after a reload", async ({
    page,
  }) => {
    /* Open the dialog, then rewrite its entry the way 0.0.25 stored it */
    const start = await visit(page, "/ephemeral");
    await press(page, "Open");
    await page.evaluate(() => {
      history.replaceState(
        {
          ...history.state,
          usr: {
            dialog: true,
            __router_ephemeral_keys: { dialog: null },
            __router_index_dialog: 2,
          },
        },
        "",
      );
    });

    /* The reload drops the dialog and its entry */
    const reloaded = await reload(page);
    expect(reloaded.index).toBe(start.index);
    await expect(page.getByText("Dialog closed")).toBeVisible();
  });
});
