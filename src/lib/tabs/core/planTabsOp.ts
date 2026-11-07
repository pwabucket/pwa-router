import type { Location, NavigateOptions, To } from "react-router";
import { hasLayersAbove } from "../../engine/core/queries";
import type { StepId } from "../../engine/core/record";
import { collapseSteps } from "../../engine/core/steps";
import {
  buildStepState,
  findTab,
  readDroppedLanding,
  readPagePosition,
  readPageSteps,
  readStepPath,
  readTabStart,
  rootPageStep,
  saveTabSteps,
  updateSaved,
  type TabsConfig,
  type TabsEntry,
  type TabsMemory,
} from "./tabs";
import { isDefaultCollapsed, showDefaultTab } from "./restoreSteps";

/** A request to change the tabs of an area */
export type TabsOp =
  | { kind: "select"; area: string; tab: string }
  | { kind: "popToRoot"; area: string }
  | { kind: "exit"; area: string; to: To; options?: NavigateOptions };

/** One entry written by a tab operation */
export interface TabsWrite {
  to: To;
  replace: boolean;
  /** The entry's state, given the entry's position */
  buildState: (position: number) => unknown;
  /** The position of a replaced entry; a push is positioned once it lands */
  stamp?: number;
}

/** A close first (land before this position), then one write */
export interface TabsPlan {
  landing?: number;
  write?: TabsWrite;
}

/** The location of a written entry, to check guards against */
export const readWriteLocation = (write: TabsWrite): Partial<Location> => ({
  ...(typeof write.to === "string" ? { pathname: write.to } : write.to),
  state: write.buildState(write.stamp ?? 0),
});

/** The landing that puts the current entry on the page entry at the position, if it isn't there */
const landOn = ({ location, area }: TabsEntry, position: number) => {
  /* Whether the entry already sits on that page, with no layers above */
  const isOnPage =
    readPagePosition(area) === position &&
    !hasLayersAbove(location.state, position);

  /* Otherwise land on the page entry */
  return isOnPage ? undefined : position + 1;
};

/** Plans a switch to another tab: close the slot, then push the tab's top step */
const planSelect = (
  config: TabsConfig,
  entry: TabsEntry,
  memory: TabsMemory,
  target: string,
  newStepId: () => StepId,
): TabsPlan => {
  /* The entry's location, record and area */
  const { location, record, area } = entry;

  /* The default tab stays below, without the values its steps drop; another tab's slot closes */
  const landing =
    area.active === config.defaultTab
      ? readDroppedLanding(record)
      : readTabStart(area, config);

  /* Back to the default tab after a restore: show its steps in the area's entry */
  const start = readTabStart(area, config);
  if (target === config.defaultTab && isDefaultCollapsed(area, start)) {
    const steps = area.saved[area.defaultTab];

    return {
      landing: landOn(entry, start),
      write: {
        to: readStepPath(steps[steps.length - 1]),
        replace: true,
        stamp: start,
        buildState: () => showDefaultTab(area, record, location, start),
      },
    };
  }

  /* Back to the default tab: its steps are already below */
  if (target === config.defaultTab) return { landing };

  /* Save the left tab's steps, take out the target's */
  const saved = updateSaved(
    memory.saved,
    area.active,
    saveTabSteps(area, location, record),
    target,
  );

  /* The target's top step holds its lower steps as virtual steps */
  const savedSteps = memory.saved[target];
  const targetSteps = savedSteps?.length
    ? savedSteps
    : [rootPageStep(findTab(config, target), area, newStepId())];
  const top = targetSteps[targetSteps.length - 1];

  /* Close the slot, then push the target's top step */
  return {
    landing,
    write: {
      to: readStepPath(top),
      replace: false,
      buildState: (position) =>
        buildStepState(
          top,
          {
            ...area,
            active: target,
            steps: collapseSteps(targetSteps, position),
            saved,
            savedVersion: memory.version + 1,
          },
          record,
          position,
        ),
    },
  };
};

/** Plans a pop to the active tab's first page */
const planPopToRoot = (
  config: TabsConfig,
  entry: TabsEntry,
  memory: TabsMemory,
  newStepId: () => StepId,
): TabsPlan | null => {
  /* The tab's root page, its address, and the landing on the tab's first entry */
  const { location, record, area } = entry;
  const root = rootPageStep(findTab(config, area.active), area, newStepId());
  const rootPath = readStepPath(root);
  const start = readTabStart(area, config);
  const landing = landOn(entry, start);

  /* Already on the root, with nothing below */
  const isOnRoot =
    landing === undefined &&
    readPageSteps(area).length <= 1 &&
    location.pathname === rootPath.pathname &&
    location.search === rootPath.search;

  if (isOnRoot) return null;

  /* Close everything above the first entry, then make it the root */
  return {
    landing,
    write: {
      to: rootPath,
      replace: true,
      stamp: start,
      buildState: () =>
        buildStepState(
          root,
          {
            ...area,
            steps: [{ id: root.id, kind: "page", position: start }],
            saved: memory.saved,
            savedVersion: memory.version,
          },
          record,
          start,
        ),
    },
  };
};

/** Plans leaving the tabbed area: close all of it, then go to the target */
const planExit = (entry: TabsEntry, to: To, options?: NavigateOptions) => {
  /* The entry's area */
  const { area } = entry;

  /* With nothing before the area, its first entry becomes the target */
  const isFirstAppEntry = area.startIndex === 0;

  /* Close the area, then write the target */
  return {
    landing: isFirstAppEntry ? landOn(entry, area.start) : area.start,
    write: {
      to,
      replace: isFirstAppEntry || options?.replace === true,
      stamp: area.start,
      buildState: () => options?.state,
    },
  };
};

/** Plans a tab operation from the current entry */
export const planTabsOp = (
  op: TabsOp,
  config: TabsConfig,
  entry: TabsEntry,
  memory: TabsMemory,
  newStepId: () => StepId,
): TabsPlan | null => {
  switch (op.kind) {
    /* Switch tabs, unless the tab is already active */
    case "select":
      if (op.tab === entry.area.active) return null;
      return planSelect(config, entry, memory, op.tab, newStepId);

    /* Pop the active tab to its root */
    case "popToRoot":
      return planPopToRoot(config, entry, memory, newStepId);

    /* Leave the area */
    case "exit":
      return planExit(entry, op.to, op.options);
  }
};
