import type { Location } from "react-router";
import {
  createArea,
  findArea,
  type AreaRecord,
  type EntryRecord,
  type StepId,
  type StepRecord,
} from "../../engine/core/record";
import { pruneSteps } from "../../engine/core/steps";
import {
  EMPTY_TABS_MEMORY,
  matchTab,
  MAX_TAB_STEPS,
  orderConfigs,
  saveTabSteps,
  type PreviousEntry,
  type TabsConfig,
  type TabsEntry,
  type TabsMemory,
} from "./tabs";

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

  /* A new area: its tab is picked by the address, which tabs without a root start on */
  const area = createArea(
    config.id,
    matchTab(config, location.pathname),
    historyLength,
    historyIndex,
    config.defaultTab,
  );
  const { pathname, search, hash } = location;

  return {
    ...area,
    ...latest,
    address: { pathname, search, hash },
    steps: [{ id: newStepId(), kind: "page", position: historyLength }],
  };
};

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
          memories[config.id] ?? EMPTY_TABS_MEMORY,
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
          memories[config.id] ?? EMPTY_TABS_MEMORY,
          historyLength,
          historyIndex,
          newStepId,
        ),
      );
    }
  }

  return { ...record, areas: [record.areas[0], ...areas] };
};
