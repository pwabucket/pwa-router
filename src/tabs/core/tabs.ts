import type { Location } from "react-router";
import {
  type AreaRecord,
  type EntryRecord,
  findArea,
  readEntry,
  type StepRecord,
  writeRecord,
} from "../../engine/core/record";
import { readValuePosition } from "../../engine/core/queries";
import {
  collapseSnapshot,
  isKeptValue,
  pruneSteps,
  saveSteps,
  snapshotStep,
} from "../../engine/core/steps";

/** A tab of a tabbed area */
export interface TabDefinition {
  id: string;
  /** The path of the tab's first page; deep links pick their tab by it. Without one, the tab starts on the address the area was opened on */
  root?: string;
}

/** A tabbed area as registered by TabsRoot */
export interface TabsConfig {
  id: string;
  tabs: TabDefinition[];
  defaultTab: string;
  /** The outer area and tab this area lives in, when nested */
  parent?: { area: string; tab: string };
}

/** Saved steps of the tabs that aren't active, by tab */
export type SavedTabSteps = Record<string, StepRecord[]>;

/** The latest saved steps, kept in memory */
export interface TabsMemory {
  version: number;
  saved: SavedTabSteps;
}

/** The most steps a tab keeps */
export const MAX_TAB_STEPS = 50;

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
const readCurrentPage = (area: AreaRecord) => {
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

/** The active tab's steps as saved: lower steps as they are, the current one snapshotted */
export const saveTabSteps = (
  area: AreaRecord,
  location: Location,
  record: EntryRecord,
) =>
  saveSteps(
    area.steps,
    snapshotStep(location, location.state, record, area.id),
  ).slice(-MAX_TAB_STEPS);

/** The landing that closes the values a saved step drops, if any are set */
export const readDroppedLanding = (record: EntryRecord) => {
  let landing: number | undefined;

  for (const [key, value] of Object.entries(record.values)) {
    if (isKeptValue(value)) continue;

    /* Land before the lowest one's push */
    const position = readValuePosition(record, key, "latest");
    if (position === undefined) continue;
    if (landing === undefined || position < landing) landing = position;
  }

  return landing;
};

/** A tab's first page, as a new page step: its root, or the area's address */
export const rootPageStep = (
  tab: TabDefinition,
  area: Pick<AreaRecord, "address">,
  id: string,
): StepRecord => {
  const address =
    tab.root === undefined
      ? area.address
      : { pathname: tab.root, search: "", hash: "" };

  return {
    id,
    kind: "page",
    position: null,
    snapshot: {
      pathname: address?.pathname ?? "/",
      search: address?.search ?? "",
      hash: address?.hash ?? "",
      values: {},
      record: { values: {}, areas: [] },
    },
  };
};

/** The tab whose root is the longest prefix of the pathname, or the default; tabs without a root never match */
export const matchTab = (config: TabsConfig, pathname: string) => {
  let match: { id: string; root: string } | undefined;

  for (const tab of config.tabs) {
    if (tab.root === undefined) continue;

    /* The root as a prefix, without a trailing slash */
    const root = tab.root.replace(/\/$/, "");
    const isPrefix =
      pathname === tab.root ||
      pathname === root ||
      pathname.startsWith(`${root}/`);

    if (isPrefix && (!match || root.length > match.root.length)) {
      match = { id: tab.id, root };
    }
  }

  return match?.id ?? config.defaultTab;
};

/** The definition of a tab, or the default tab's */
export const findTab = (config: TabsConfig, tabId: string) =>
  config.tabs.find((tab) => tab.id === tabId) ??
  config.tabs.find((tab) => tab.id === config.defaultTab)!;

/** Saved steps with the left tab's steps stored and the entered tab's removed */
export const updateSaved = (
  saved: SavedTabSteps,
  leftTab: string,
  leftSteps: StepRecord[],
  enteredTab: string,
) => {
  const next = { ...saved, [leftTab]: leftSteps };
  delete next[enteredTab];
  return next;
};

/** The address of a saved step */
export const readStepPath = (step: StepRecord) => ({
  pathname: step.snapshot?.pathname ?? "/",
  search: step.snapshot?.search ?? "",
  hash: step.snapshot?.hash ?? "",
});

/** The state of an entry showing a saved step, in the given tab area */
export const buildStepState = (
  step: StepRecord,
  area: AreaRecord,
  outerRecord: EntryRecord,
  position: number,
) => {
  const snapshot = step.snapshot;
  const restored = snapshot
    ? collapseSnapshot(snapshot, position)
    : { values: {}, areas: [] };
  /* The areas around this one, keeping only the steps the step's values use */
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
