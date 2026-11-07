import {
  findArea,
  type AreaRecord,
  type EntryRecord,
} from "../../engine/core/record";
import {
  EMPTY_TABS_MEMORY,
  saveTabSteps,
  updateSaved,
  type PreviousEntry,
  type TabsConfig,
  type TabsEntry,
  type TabsMemory,
} from "./tabs";

/** The saved steps after an entry settles: newer history wins, a tab change saves the left tab */
export const settleMemory = (
  memory: TabsMemory,
  previous: TabsEntry | null,
  area: AreaRecord,
): TabsMemory => {
  /* The entry carries newer saved steps: take them */
  if (area.savedVersion > memory.version) {
    return { version: area.savedVersion, saved: area.saved };
  }

  /* The tab changed: save the left tab's steps */
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

  /* Nothing changed */
  return memory;
};

/** Saved steps of every registered area, by area id */
export type TabsMemories = Record<string, TabsMemory>;

/** The saved steps of every area, merged from a newly settled entry */
export const settleMemories = (
  memories: TabsMemories,
  configs: TabsConfig[],
  previous: PreviousEntry | null,
  record: EntryRecord,
) => {
  /* The memories, copied only when one changes */
  let next = memories;

  /* Each registered area the entry carries */
  for (const { id } of configs) {
    const area = findArea(record, id);
    if (!area) continue;

    /* The area as the previous entry had it */
    const previousArea = previous && findArea(previous.record, id);
    const previousEntry = previousArea
      ? { ...previous, area: previousArea }
      : null;

    /* The area's memory, settled */
    const memory = memories[id] ?? EMPTY_TABS_MEMORY;
    const settled = settleMemory(memory, previousEntry, area);
    if (settled !== memory) next = { ...next, [id]: settled };
  }

  return next;
};

/** The record with every area's saved steps brought up to memory; undefined when already there */
export const syncRecord = (record: EntryRecord, memories: TabsMemories) => {
  /* Whether any area was behind memory */
  let isStale = false;

  /* Each area brought up to its memory */
  const areas = record.areas.map((area) => {
    const memory = memories[area.id];
    if (!memory || area.savedVersion === memory.version) return area;

    /* Behind: take the memory's saved steps */
    isStale = true;
    return { ...area, saved: memory.saved, savedVersion: memory.version };
  });

  /* A new record only when an area was behind */
  return isStale ? { ...record, areas } : undefined;
};
