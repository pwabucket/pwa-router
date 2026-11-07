import type { Page } from "@playwright/test";
import { ROUTER_STATUS_ATTRIBUTE } from "../constants";

/** A snapshot of the page's session history */
interface HistorySnapshot {
  /** The current pathname and search */
  path: string;
  /** The session history length */
  length: number;
  /** React Router's index of the current entry */
  index: number | undefined;
  /** The app state stored on the current entry */
  state: Record<string, unknown> | null;
  /** The engine is correcting the history */
  isCorrecting: boolean;
}

/** Reads the page's history snapshot */
const readHistory = (page: Page): Promise<HistorySnapshot> =>
  page.evaluate(
    (attribute) => ({
      path: location.pathname + location.search,
      length: history.length,
      index: history.state?.idx,
      state: history.state?.usr ?? null,
      isCorrecting:
        document.documentElement.getAttribute(attribute) === "true",
    }),
    ROUTER_STATUS_ATTRIBUTE,
  );

/** Waits until the engine is idle and the history stops changing */
const settle = async (page: Page) => {
  /* The number of identical idle reads that count as settled */
  const requiredStableReads = 3;
  /* The count of stable reads so far, and the last read */
  let stableReads = 0;
  let previous = "";

  /* Read the history until it settles */
  while (stableReads < requiredStableReads) {
    /* Wait a moment, then read the history */
    await page.waitForTimeout(40);
    const snapshot = await readHistory(page);
    const serialized = JSON.stringify(snapshot);

    /* Count consecutive reads that are idle and unchanged */
    stableReads =
      !snapshot.isCorrecting && serialized === previous ? stableReads + 1 : 0;
    previous = serialized;
  }

  /* The settled snapshot */
  return readHistory(page);
};

/** Opens a path in a fresh entry and waits for the engine */
const visit = async (page: Page, path: string) => {
  await page.goto(path);
  return settle(page);
};

/** Presses the browser's back button and waits for the engine */
const goBack = async (page: Page) => {
  await page.goBack({ waitUntil: "commit" });
  return settle(page);
};

/** Presses the browser's forward button and waits for the engine */
const goForward = async (page: Page) => {
  await page.goForward({ waitUntil: "commit" });
  return settle(page);
};

/** Reloads the page and waits for the engine */
const reload = async (page: Page) => {
  await page.reload();
  return settle(page);
};

/** Clicks a button by its name and waits for the engine */
const press = async (page: Page, name: string) => {
  await page.getByRole("button", { name, exact: true }).click();
  return settle(page);
};

export { goBack, goForward, press, readHistory, reload, settle, visit };
export type { HistorySnapshot };
