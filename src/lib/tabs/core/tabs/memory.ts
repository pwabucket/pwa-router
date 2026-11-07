import type { Location } from "react-router";
import type {
  AreaRecord,
  EntryRecord,
  StepRecord,
} from "../../../engine/core/record";
import { readValuePosition } from "../../../engine/core/queries";
import {
  isKeptValue,
  saveSteps,
  snapshotStep,
} from "../../../engine/core/steps";

/** Saved steps of the tabs that aren't active, by tab */
export type SavedTabSteps = Record<string, StepRecord[]>;

/** The latest saved steps, kept in memory */
export interface TabsMemory {
  version: number;
  saved: SavedTabSteps;
}

/** The memory of an area before any of its entries has settled */
export const EMPTY_TABS_MEMORY: TabsMemory = { version: 0, saved: {} };

/** The most steps a tab keeps */
export const MAX_TAB_STEPS = 50;

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

/** Saved steps with the left tab's steps stored and the entered tab's removed */
export const updateSaved = (
  saved: SavedTabSteps,
  leftTab: string,
  leftSteps: StepRecord[],
  enteredTab: string,
) => {
  /* Store the left tab's steps, remove the entered tab's */
  const next = { ...saved, [leftTab]: leftSteps };
  delete next[enteredTab];
  return next;
};

/** The landing that closes the values a saved step drops, if any are set */
export const readDroppedLanding = (record: EntryRecord) => {
  /* The lowest position found */
  let landing: number | undefined;

  /* Each value a saved step drops */
  for (const [key, value] of Object.entries(record.values)) {
    if (isKeptValue(value)) continue;

    /* Land before the lowest one's push */
    const position = readValuePosition(record, key, "latest");
    if (position === undefined) continue;
    if (landing === undefined || position < landing) landing = position;
  }

  return landing;
};
