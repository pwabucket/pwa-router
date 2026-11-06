import type { Location } from "react-router";
import { readEntry } from "./legacy";
import {
  findArea,
  writeRecord,
  type AreaRecord,
  type EntryRecord,
  type StepRecord,
} from "./record";
import { collapseSnapshot, pruneSteps, snapshotStep } from "./steps";

/** A tab of a tabbed area */
export interface TabDefinition {
  id: string;
  /** The path of the tab's first page; deep links pick their tab by it */
  root: string;
}

/** A tabbed area as registered by TabsRoot */
export interface TabsConfig {
  id: string;
  tabs: TabDefinition[];
  defaultTab: string;
  /** The outer area and tab this area lives in, when nested */
  parent?: { area: string; tab: string };
}

/** Saved pages of the tabs that aren't active, by tab */
export type SavedTabSteps = Record<string, StepRecord[]>;

/** The latest saved pages, kept in memory */
export interface TabsMemory {
  version: number;
  saved: SavedTabSteps;
}

/** The most pages a tab keeps */
export const MAX_TAB_PAGES = 50;

/** A tab area read from an entry's state, with the record it came from */
export const readTabsArea = (state: unknown, areaId: string) => {
  const { record } = readEntry(state);
  const area = findArea(record, areaId);
  return area ? { area, record } : undefined;
};

/** The active tab of a tab area in a state, if the area is on its live path */
export const readActiveTab = (state: unknown, areaId: string) =>
  findArea(readEntry(state).record, areaId)?.active;

/** The area's page steps, lowest first */
export const readPageSteps = (area: AreaRecord) =>
  area.steps.filter((step) => step.kind === "page");

/** The current page's step: the area's highest page step */
export const readCurrentPage = (area: AreaRecord) => {
  const pages = readPageSteps(area);
  return pages[pages.length - 1];
};

/** The current page's entry, where its step sits */
export const readPagePosition = (area: AreaRecord) =>
  readCurrentPage(area)?.position ?? area.start;

/** The first entry of the active tab: the area's start, or a non-default tab's lowest real page */
export const readTabStart = (area: AreaRecord, config: TabsConfig) => {
  if (area.active === config.defaultTab) return area.start;
  return (
    area.steps.find((step) => step.position !== null)?.position ?? area.start
  );
};

/** The active tab's pages as saved: lower pages as they are, the current one snapshotted */
export const savePages = (
  area: AreaRecord,
  location: Location,
  record: EntryRecord,
) => {
  const pages = readPageSteps(area);
  const current = pages[pages.length - 1];
  if (!current) return [];

  return [
    ...pages.slice(0, -1),
    {
      ...current,
      snapshot: snapshotStep(location, location.state, record, area.id),
    },
  ].slice(-MAX_TAB_PAGES);
};

/** A tab's first page, as a new page step */
export const rootPageStep = (tab: TabDefinition, id: string): StepRecord => ({
  id,
  kind: "page",
  position: null,
  snapshot: {
    pathname: tab.root,
    search: "",
    hash: "",
    values: {},
    record: { values: {}, areas: [] },
  },
});

/** The tab whose root is the longest prefix of the pathname, or the default */
export const matchTab = (config: TabsConfig, pathname: string) => {
  let match: TabDefinition | undefined;

  for (const tab of config.tabs) {
    const root = tab.root.replace(/\/$/, "");
    const isPrefix =
      pathname === tab.root ||
      pathname === root ||
      pathname.startsWith(`${root}/`);

    if (isPrefix && (!match || root.length > match.root.length)) match = tab;
  }

  return match?.id ?? config.defaultTab;
};

/** The definition of a tab, or the default tab's */
export const findTab = (config: TabsConfig, tabId: string) =>
  config.tabs.find((tab) => tab.id === tabId) ??
  config.tabs.find((tab) => tab.id === config.defaultTab)!;

/** Saved pages with the left tab's pages stored and the entered tab's removed */
export const updateSaved = (
  saved: SavedTabSteps,
  leftTab: string,
  leftPages: StepRecord[],
  enteredTab: string,
) => {
  const next = { ...saved, [leftTab]: leftPages };
  delete next[enteredTab];
  return next;
};

/** The address of a saved page */
export const readPagePath = (step: StepRecord) => ({
  pathname: step.snapshot?.pathname ?? "/",
  search: step.snapshot?.search ?? "",
  hash: step.snapshot?.hash ?? "",
});

/** The state of an entry showing a saved page, in the given tab area */
export const buildPageState = (
  page: StepRecord,
  area: AreaRecord,
  outerRecord: EntryRecord,
  position: number,
) => {
  const snapshot = page.snapshot;
  const restored = snapshot
    ? collapseSnapshot(snapshot, position)
    : { values: {}, areas: [] };
  /* The areas around this one, keeping only the steps the page's values use */
  const index = outerRecord.areas.findIndex(
    (candidate) => candidate.id === area.id,
  );
  const outerAreas = (
    index < 0 ? outerRecord.areas : outerRecord.areas.slice(0, index)
  ).map((outer) => pruneSteps(outer, restored.values));

  return writeRecord(snapshot?.values ?? {}, {
    values: restored.values,
    areas: [...outerAreas, area, ...restored.areas],
  });
};
