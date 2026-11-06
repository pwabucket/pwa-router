import type { Location, NavigateOptions, To } from "react-router";
import { hasLayersAbove } from "./queries";
import {
  createArea,
  findArea,
  type AreaRecord,
  type EntryRecord,
  type StepId,
  type StepRecord,
} from "./record";
import { collapseSteps, pruneSteps } from "./steps";
import {
  MAX_TAB_STEPS,
  buildStepState,
  findTab,
  matchTab,
  readDroppedLanding,
  readPagePosition,
  readPageSteps,
  readStepPath,
  readTabStart,
  rootPageStep,
  saveTabSteps,
  updateSaved,
  type TabsConfig,
  type TabsMemory,
} from "./tabs";

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

/** The current tabbed area of an entry, the entry's record, and its location */
interface TabsEntry {
  location: Location;
  record: EntryRecord;
  area: AreaRecord;
}

/** The location of a written entry, to check guards against */
export const readWriteLocation = (write: TabsWrite): Partial<Location> => ({
  ...(typeof write.to === "string" ? { pathname: write.to } : write.to),
  state: write.buildState(write.stamp ?? 0),
});

/** The landing that puts the current entry on the page entry at the position, if it isn't there */
const landOn = ({ location, area }: TabsEntry, position: number) => {
  const isOnPage =
    readPagePosition(area) === position &&
    !hasLayersAbove(location.state, position);
  return isOnPage ? undefined : position + 1;
};

/** The area was restored into one entry, so its default tab has no entries below the active one */
export const isDefaultCollapsed = (area: AreaRecord, position: number) =>
  area.active !== area.defaultTab &&
  area.start === position &&
  (area.saved[area.defaultTab]?.length ?? 0) > 0;

/** The state showing the default tab's saved steps in the entry at the position, saving the active tab's */
export const showDefaultTab = (
  area: AreaRecord,
  record: EntryRecord,
  location: Location,
  position: number,
) => {
  const steps = area.saved[area.defaultTab];
  const top = steps[steps.length - 1];

  return buildStepState(
    top,
    {
      ...area,
      active: area.defaultTab,
      steps: collapseSteps(steps, position),
      saved: updateSaved(
        area.saved,
        area.active,
        saveTabSteps(area, location, record),
        area.defaultTab,
      ),
      savedVersion: area.savedVersion + 1,
    },
    record,
    position,
  );
};

/** Plans a switch to another tab: close the slot, then push the tab's top step */
const planSelect = (
  config: TabsConfig,
  entry: TabsEntry,
  memory: TabsMemory,
  target: string,
  newStepId: () => StepId,
): TabsPlan => {
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
    : [rootPageStep(findTab(config, target), newStepId())];
  const top = targetSteps[targetSteps.length - 1];

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
  const { location, record, area } = entry;
  const root = rootPageStep(findTab(config, area.active), newStepId());
  const rootPath = readStepPath(root);
  const start = readTabStart(area, config);
  const landing = landOn(entry, start);

  /* Already on the root, with nothing below */
  const isOnRoot =
    landing === undefined &&
    readPageSteps(area).length <= 1 &&
    location.pathname === rootPath.pathname &&
    !location.search;

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
  const { area } = entry;

  /* With nothing before the area, its first entry becomes the target */
  const isFirstAppEntry = area.startIndex === 0;

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
    case "select":
      if (op.tab === entry.area.active) {
        return planPopToRoot(config, entry, memory, newStepId);
      }
      return planSelect(config, entry, memory, op.tab, newStepId);

    case "popToRoot":
      return planPopToRoot(config, entry, memory, newStepId);

    case "exit":
      return planExit(entry, op.to, op.options);
  }
};

/** The tab area an entry without one takes: a pushed page, a replaced one, or a new area */
export const adoptTabs = (
  config: TabsConfig,
  previous: TabsEntry | null,
  location: Location,
  record: EntryRecord,
  navigationType: string,
  memory: TabsMemory,
  historyLength: number,
  historyIndex: number,
  newStepId: () => StepId,
): AreaRecord => {
  const latest = { saved: memory.saved, savedVersion: memory.version };

  /* A page pushed in the area: the previous step goes below it */
  if (previous && navigationType === "PUSH") {
    const page: StepRecord = {
      id: newStepId(),
      kind: "page",
      position: historyLength,
    };
    const steps = [
      ...saveTabSteps(previous.area, previous.location, previous.record),
      page,
    ];

    return {
      ...previous.area,
      ...latest,
      steps: steps.slice(-MAX_TAB_STEPS),
    };
  }

  /* A page replaced in the area keeps its place */
  if (previous && navigationType === "REPLACE") {
    return { ...pruneSteps(previous.area, record.values), ...latest };
  }

  /* A new area: its tab is picked by the address */
  const area = createArea(
    config.id,
    matchTab(config, location.pathname),
    historyLength,
    historyIndex,
    config.defaultTab,
  );

  return {
    ...area,
    ...latest,
    steps: [{ id: newStepId(), kind: "page", position: historyLength }],
  };
};

/** The saved steps after an entry settles: newer history wins, a tab change saves the left tab */
export const settleMemory = (
  memory: TabsMemory,
  previous: TabsEntry | null,
  area: AreaRecord,
): TabsMemory => {
  if (area.savedVersion > memory.version) {
    return { version: area.savedVersion, saved: area.saved };
  }

  if (previous && previous.area.active !== area.active) {
    return {
      version: memory.version + 1,
      saved: updateSaved(
        memory.saved,
        previous.area.active,
        saveTabSteps(previous.area, previous.location, previous.record),
        area.active,
      ),
    };
  }

  return memory;
};

/** The state showing an area's step in the entry at the position: lower steps stay as they are */
export const popToStep = (
  area: AreaRecord,
  record: EntryRecord,
  stepId: StepId,
  position: number,
) => {
  const index = area.steps.findIndex((step) => step.id === stepId);
  const step = area.steps[index];

  return buildStepState(
    step,
    {
      ...area,
      steps: [
        ...area.steps.slice(0, index),
        { id: step.id, kind: step.kind, position },
      ],
    },
    record,
    position,
  );
};

/** The entries putting the default root (and the tab's root) under a first entry; null when none are needed */
export const planBackfill = (
  config: TabsConfig,
  entry: TabsEntry,
  newStepId: () => StepId,
) => {
  const { location, record, area } = entry;
  const isDefaultTab = area.active === config.defaultTab;
  const current = saveTabSteps(area, location, record).at(-1);
  if (!current) return null;

  /* The pages from the bottom: default root, tab root, then the current page */
  const pages: StepRecord[] = [
    rootPageStep(findTab(config, config.defaultTab), newStepId()),
  ];
  if (!isDefaultTab) {
    pages.push(rootPageStep(findTab(config, area.active), newStepId()));
  }

  const lowest = pages[pages.length - 1];
  if (readStepPath(current).pathname !== readStepPath(lowest).pathname) {
    pages.push(current);
  } else {
    pages[pages.length - 1] = { ...current, id: lowest.id };
  }

  if (pages.length === 1) return null;

  /* One entry per page, positioned from the area's first entry */
  const positioned = pages.map((page, offset) => ({
    ...page,
    position: area.start + offset,
  }));

  return positioned.map((page, offset) => {
    const isTabPage = !isDefaultTab && offset > 0;
    const steps = positioned.slice(isTabPage ? 1 : 0, offset + 1);

    return {
      to: readStepPath(page),
      state: buildStepState(
        page,
        {
          ...area,
          active: isTabPage ? area.active : config.defaultTab,
          steps: [
            ...steps.slice(0, -1),
            { id: page.id, kind: "page" as const, position: page.position },
          ],
        },
        record,
        page.position,
      ),
    };
  });
};


/** Configs ordered outer first: an area's parent comes before it */
export const orderConfigs = (configs: TabsConfig[]) => {
  const byId = new Map(configs.map((config) => [config.id, config]));

  /** How deep an area sits */
  const depth = (config: TabsConfig): number => {
    const parent = config.parent && byId.get(config.parent.area);
    return parent ? depth(parent) + 1 : 0;
  };

  return [...configs].sort((a, b) => depth(a) - depth(b));
};

/** The previous settled entry */
export interface PreviousEntry {
  location: Location;
  record: EntryRecord;
}

/** The record a new entry takes: every live area kept, copied or started, a pushed page in the innermost */
export const adoptAreas = (
  configs: TabsConfig[],
  previous: PreviousEntry | null,
  location: Location,
  record: EntryRecord,
  navigationType: string,
  memories: Record<string, TabsMemory>,
  historyLength: number,
  historyIndex: number,
  newStepId: () => StepId,
): EntryRecord | undefined => {
  const areas: AreaRecord[] = [];
  const empty: TabsMemory = { version: 0, saved: {} };

  /* The live areas, outer first: an area lives while its parent shows its tab */
  const live = orderConfigs(configs).filter((config) => {
    if (!config.parent) return true;

    const { area: parentId, tab } = config.parent;
    const parent =
      findArea(record, parentId) ??
      (previous && findArea(previous.record, parentId));
    return parent?.active === tab;
  });

  /* Nothing missing: the entry already carries every live area */
  if (live.every((config) => findArea(record, config.id))) return undefined;

  const innermost = live[live.length - 1];

  for (const config of live) {
    const existing = findArea(record, config.id);
    const previousArea = previous && findArea(previous.record, config.id);
    const isInnermost = config === innermost;

    /* Kept as written; outer areas copied; the innermost takes the push */
    if (existing) {
      areas.push(existing);
    } else if (
      previous &&
      previousArea &&
      (isInnermost || navigationType === "POP")
    ) {
      areas.push(
        adoptTabs(
          config,
          { ...previous, area: previousArea },
          location,
          record,
          navigationType,
          memories[config.id] ?? empty,
          historyLength,
          historyIndex,
          newStepId,
        ),
      );
    } else if (previousArea) {
      areas.push(previousArea);
    } else {
      areas.push(
        adoptTabs(
          config,
          null,
          location,
          record,
          navigationType,
          memories[config.id] ?? empty,
          historyLength,
          historyIndex,
          newStepId,
        ),
      );
    }
  }

  return { ...record, areas: [record.areas[0], ...areas] };
};
