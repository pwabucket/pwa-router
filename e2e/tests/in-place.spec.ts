import { expect, test } from "@playwright/test";
import { goBack, press, reload, settle, visit } from "../../src/testing";

test.describe("in-place values", () => {
  test("typing never adds entries and survives a reload", async ({ page }) => {
    /* Type a word letter by letter */
    const start = await visit(page, "/in-place");
    await page.getByLabel("Search").pressSequentially("keyboard");
    const typed = await settle(page);

    expect(typed.index).toBe(start.index);
    expect(typed.length).toBe(start.length);
    expect(typed.state?.search).toBe("keyboard");

    /* The value comes back after a reload */
    await reload(page);
    await expect(page.getByLabel("Search")).toHaveValue("keyboard");
  });

  test("a value set while a layer opens stays on the page below", async ({
    page,
  }) => {
    /* Set the search and open the dialog together */
    const start = await visit(page, "/in-place");
    const opened = await press(page, "Search and open");
    expect(opened.index).toBe(start.index! + 1);
    await expect(page.getByText("Dialog open")).toBeVisible();

    /* Back closes the dialog and keeps the search */
    const back = await goBack(page);
    expect(back.index).toBe(start.index);
    expect(back.state?.search).toBe("example");
    await expect(page.getByText("Dialog closed")).toBeVisible();
  });
});

test.describe("state size warning", () => {
  test("warns once about a value too large for history", async ({ page }) => {
    /* Collect the router's warnings */
    const warnings: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "warning" && message.text().includes("pwa-router"))
        warnings.push(message.text());
    });

    /* Store the large value twice */
    await visit(page, "/in-place");
    await press(page, "Store large value");
    await press(page, "Store large value");

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('"large"');
  });
});
