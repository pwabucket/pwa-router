import { expect, test } from "@playwright/test";
import { press, visit } from "../../src/testing";

test.describe("navigate back", () => {
  test("goes home when nothing is behind", async ({ page }) => {
    /* A fresh entry has nothing to go back to */
    await visit(page, "/navigate-back");
    const after = await press(page, "Back");

    expect(after.path).toBe("/");
  });
});
