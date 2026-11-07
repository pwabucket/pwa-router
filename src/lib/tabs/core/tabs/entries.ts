import type { Location } from "react-router";
import {
  type AreaRecord,
  type EntryRecord,
  findArea,
  readEntry,
} from "../../../engine/core/record";
import type { TabsConfig } from "./config";

/** The previous settled entry */
export interface PreviousEntry {
  location: Location;
  record: EntryRecord;
}

/** The current tabbed area of an entry, the entry's record, and its location */
export interface TabsEntry {
  location: Location;
  record: EntryRecord;
  area: AreaRecord;
}

/** A tab area read from an entry's state, with the record it came from */
export const readTabsArea = (state: unknown, areaId: string) => {
  /* The entry's record and the area in it */
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
  /* The default tab starts at the area's start */
  if (area.active === config.defaultTab) return area.start;

  /* Another tab starts at its lowest real step */
  return (
    area.steps.find((step) => step.position !== null)?.position ?? area.start
  );
};
