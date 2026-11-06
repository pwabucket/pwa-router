import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useNavigate,
  useNavigationType,
  type Location,
} from "react-router";
import {
  adoptAreas,
  settleMemory,
  type PreviousEntry,
} from "./core/planTabs";
import {
  type EntryRecord,
  findArea,
  readEntry,
  writeRecord,
} from "../engine/core/record";
import { createStepId } from "../engine/core/stepIds";
import type { TabsConfig, TabsMemory } from "./core/tabs";
import { readHistoryIndex } from "../utils/history";
import { getLocationPath } from "../utils/location";
import type { EngineWork } from "../engine/EngineWork";

/** Memory of an area before any of its entries has settled */
const EMPTY_MEMORY: TabsMemory = { version: 0, saved: {} };

/** Saved steps of every registered area, by area id */
type TabsMemories = Record<string, TabsMemory>;

/** The saved steps of every area, merged from a newly settled entry */
const settleMemories = (
  memories: TabsMemories,
  configs: TabsConfig[],
  previous: PreviousEntry | null,
  record: EntryRecord,
) => {
  let next = memories;

  for (const { id } of configs) {
    const area = findArea(record, id);
    if (!area) continue;

    /* The area as the previous entry had it */
    const previousArea = previous && findArea(previous.record, id);
    const previousEntry = previousArea
      ? { ...previous, area: previousArea }
      : null;

    const memory = memories[id] ?? EMPTY_MEMORY;
    const settled = settleMemory(memory, previousEntry, area);
    if (settled !== memory) next = { ...next, [id]: settled };
  }

  return next;
};

/** The record with every area's saved steps brought up to memory; undefined when already there */
const syncRecord = (record: EntryRecord, memories: TabsMemories) => {
  let isStale = false;

  const areas = record.areas.map((area) => {
    const memory = memories[area.id];
    if (!memory || area.savedVersion === memory.version) return area;

    isStale = true;
    return { ...area, saved: memory.saved, savedVersion: memory.version };
  });

  return isStale ? { ...record, areas } : undefined;
};

/** Keeps every entry carrying the records of its live tabbed areas */
const useTabsHandler = (
  location: Location,
  work: EngineWork,
  isCorrecting: boolean,
  tryLock: () => boolean,
) => {
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [configs, setConfigs] = useState<TabsConfig[]>([]);
  const [memories, setMemories] = useState<TabsMemories>({});
  const [tracked, setTracked] = useState<PreviousEntry | null>(null);

  /* The areas registered right now; an area unmounting in this commit writes nothing */
  const registeredIdsRef = useRef(new Set<string>());

  /* The current entry's state and record */
  const { state, record } = useMemo(
    () => readEntry(location.state),
    [location.state],
  );
  const canWrite = configs.length > 0 && !isCorrecting && !work.isOperating;

  /* A new entry missing live areas takes them (a page push, a replace, a new area) */
  const adoptedRecord = useMemo(
    () =>
      canWrite
        ? adoptAreas(
            configs,
            tracked,
            location,
            record,
            navigationType,
            memories,
            window.history.length,
            readHistoryIndex() ?? 0,
            createStepId,
          )
        : undefined,
    [canWrite, configs, tracked, location, record, navigationType, memories],
  );

  /* Settle on entries carrying every live area, merging the saved steps */
  const canSettle = canWrite && !adoptedRecord;
  if (canSettle && tracked?.location.key !== location.key) {
    const nextMemories = settleMemories(memories, configs, tracked, record);
    setTracked({ location, record });
    if (nextMemories !== memories) setMemories(nextMemories);
  }

  /* The entry's areas brought up to the saved steps in memory */
  const syncedRecord = canSettle ? syncRecord(record, memories) : undefined;

  /* Write the adopted or synced record in place */
  useLayoutEffect(() => {
    const nextRecord = adoptedRecord ?? syncedRecord;
    if (!nextRecord) return;

    /* Every area in it must still be registered */
    const isStillRegistered = nextRecord.areas
      .slice(1)
      .every((area) => registeredIdsRef.current.has(area.id));
    if (!isStillRegistered || !tryLock()) return;

    navigate(getLocationPath(location), {
      replace: true,
      state: writeRecord(state, nextRecord),
    });
  }, [adoptedRecord, syncedRecord, location, state, navigate, tryLock]);

  /** Registers a tabbed area */
  const register = useCallback((config: TabsConfig) => {
    registeredIdsRef.current.add(config.id);
    setConfigs((current) => [
      ...current.filter((other) => other.id !== config.id),
      config,
    ]);
  }, []);

  /** Forgets an area's saved steps and the tracked entry (leaving the area) */
  const reset = useCallback((id: string) => {
    setTracked(null);
    setMemories((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  /** Removes a tabbed area; its memory goes with it */
  const unregister = useCallback(
    (id: string) => {
      registeredIdsRef.current.delete(id);
      setConfigs((current) => current.filter((config) => config.id !== id));
      reset(id);
    },
    [reset],
  );

  /* The record to render with: the entry's, or the one it is about to take */
  const shownRecord = adoptedRecord ?? record;

  const engine = useMemo(
    () => ({
      configs,
      record: shownRecord,
      memories,
      register,
      unregister,
      reset,
    }),
    [configs, shownRecord, memories, register, unregister, reset],
  );

  return {
    engine,
    isCorrecting: adoptedRecord !== undefined || syncedRecord !== undefined,
  };
};

export { useTabsHandler };
export type { TabsMemories };
