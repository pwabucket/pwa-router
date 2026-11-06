import { expect, test, type Page } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { goBack, press, settle, visit } from "../../src/testing";

/** History writes made by one flow */
interface HistoryWrites {
  push: number;
  replace: number;
  go: number;
}

/** Rewrite the baselines instead of comparing (UPDATE_BASELINES=1) */
const isUpdating = process.env.UPDATE_BASELINES === "1";

/* Each project has its own baseline file, filled by its flows in order */
test.describe.configure({ mode: "serial" });

const measured: Record<string, HistoryWrites> = {};

/** The baseline file of the running project */
const baselinePath = (projectName: string) =>
  path.resolve(
    import.meta.dirname,
    `../baselines/history-writes.${projectName}.json`,
  );

/** Counts every history write the page makes from now on */
const countWrites = (page: Page) =>
  page.addInitScript(() => {
    const counts = { push: 0, replace: 0, go: 0 };
    const original = {
      push: history.pushState.bind(history),
      replace: history.replaceState.bind(history),
      go: history.go.bind(history),
    };

    history.pushState = (...args) => {
      counts.push += 1;
      original.push(...args);
    };
    history.replaceState = (...args) => {
      counts.replace += 1;
      original.replace(...args);
    };
    history.go = (delta) => {
      counts.go += 1;
      original.go(delta);
    };
    Object.assign(window, { historyWrites: counts });
  });

/** Resets the counts before the measured part of a flow */
const resetWrites = (page: Page) =>
  page.evaluate(() => {
    const counts = (window as unknown as { historyWrites: HistoryWrites })
      .historyWrites;
    counts.push = counts.replace = counts.go = 0;
  });

/** Reads the counts once the engine has settled */
const readWrites = async (page: Page): Promise<HistoryWrites> => {
  await settle(page);
  return page.evaluate(() => {
    const { historyWrites } = window as unknown as {
      historyWrites: HistoryWrites;
    };
    return { ...historyWrites };
  });
};

/** The flows to measure: a setup, then the measured action */
const FLOWS: Record<string, (page: Page) => Promise<void>> = {
  "open a dialog": async (page) => {
    await visit(page, "/toggle");
    await resetWrites(page);
    await press(page, "Open");
  },
  "close a dialog": async (page) => {
    await visit(page, "/toggle");
    await press(page, "Open");
    await resetWrites(page);
    await press(page, "Close");
  },
  "close from depth": async (page) => {
    await visit(page, "/depth");
    await press(page, "Open panel");
    await press(page, "Ask");
    await resetWrites(page);
    await press(page, "Confirm");
  },
  "swap a menu for a dialog": async (page) => {
    await visit(page, "/swap");
    await press(page, "Open menu");
    await resetWrites(page);
    await press(page, "Menu item, close first");
  },
  "type one letter in place": async (page) => {
    await visit(page, "/in-place");
    await resetWrites(page);
    await page.getByLabel("Search").pressSequentially("a");
  },
  "switch tab": async (page) => {
    await visit(page, "/tabbed");
    await resetWrites(page);
    await press(page, "search tab");
  },
  "restore a tab": async (page) => {
    await visit(page, "/tabbed");
    await press(page, "search tab");
    await page
      .locator("div[data-tab]:not([hidden])")
      .getByRole("link", { name: "Open results" })
      .click();
    await settle(page);
    await press(page, "profile tab");
    await resetWrites(page);
    await press(page, "search tab");
  },
  "back through a restored page": async (page) => {
    await visit(page, "/tabbed");
    await press(page, "search tab");
    await page
      .locator("div[data-tab]:not([hidden])")
      .getByRole("link", { name: "Open results" })
      .click();
    await settle(page);
    await press(page, "profile tab");
    await press(page, "search tab");
    await resetWrites(page);
    await goBack(page);
  },
  "back from a guarded page, then stay": async (page) => {
    await visit(page, "/plain");
    await page.getByRole("link", { name: "Go to guard page" }).click();
    await settle(page);
    await press(page, "Make changes");
    await resetWrites(page);
    await goBack(page);
    await press(page, "Stay");
  },
  "close a guarded layer": async (page) => {
    await visit(page, "/guard-layer");
    await press(page, "Open editor");
    await press(page, "Edit");
    await resetWrites(page);
    await press(page, "Close editor");
  },
};

test.describe("history writes", () => {
  for (const [name, flow] of Object.entries(FLOWS)) {
    test(name, async ({ page }) => {
      /* Run the flow and count its measured part */
      await countWrites(page);
      await flow(page);
      measured[name] = await readWrites(page);
    });
  }

  test("match the baseline", () => {
    const file = baselinePath(test.info().project.name);

    /* Rewrite the baseline when asked */
    if (isUpdating) {
      writeFileSync(file, JSON.stringify(measured, null, 2) + "\n");
      return;
    }

    /* Every flow writes no more than its baseline */
    expect(existsSync(file), `missing baseline ${file}`).toBe(true);
    const baseline = JSON.parse(readFileSync(file, "utf8"));
    for (const [name, writes] of Object.entries(measured)) {
      expect.soft(writes, name).toEqual(baseline[name]);
    }
  });
});
