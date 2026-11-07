import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import { useNavigate, useNavigationType, type Location } from "react-router";
import { adoptAreas } from "../../lib/tabs/core/adoptAreas";
import {
  settleMemories,
  syncRecord,
  type TabsMemories,
} from "../../lib/tabs/core/settleMemory";
import { readEntry, writeRecord } from "../../lib/engine/core/record";
import { createStepId } from "../../lib/engine/core/stepIds";
import type { PreviousEntry, TabsConfig } from "../../lib/tabs/core/tabs";
import { readHistoryIndex } from "../../lib/engine/history/historyIndex";
import { getLocationPath } from "../../lib/engine/core/locationPath";
import type { HistoryDriver } from "../../lib/engine/driver/HistoryDriver";

/** A hook that keeps every entry carrying the records of its live tabbed areas */
const useTabsHandler = (
  location: Location,
  driver: HistoryDriver,
  isCorrecting: boolean,
  tryLock: () => boolean,
  registeredAreas: Set<string>,
) => {
  /* The navigate function, the navigation type, the registered areas, their saved steps and the last settled entry */
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [configs, setConfigs] = useState<TabsConfig[]>([]);
  const [memories, setMemories] = useState<TabsMemories>({});
  const [tracked, setTracked] = useState<PreviousEntry | null>(null);

  /* The current entry's state and record */
  const { state, record } = useMemo(
    () => readEntry(location.state),
    [location.state],
  );

  /* Whether the entry's record can be written now */
  const canWrite = configs.length > 0 && !isCorrecting && !driver.isOperating;

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
    /* The record to write, if any */
    const nextRecord = adoptedRecord ?? syncedRecord;
    if (!nextRecord) return;

    /* Every area in it must still be registered */
    const isStillRegistered = nextRecord.areas
      .slice(1)
      .every((area) => registeredAreas.has(area.id));
    if (!isStillRegistered || !tryLock()) return;

    /* Replace the entry with the record written in */
    navigate(getLocationPath(location), {
      replace: true,
      state: writeRecord(state, nextRecord),
    });
  }, [
    adoptedRecord,
    syncedRecord,
    location,
    state,
    navigate,
    tryLock,
    registeredAreas,
  ]);

  /** Registers a tabbed area */
  const register = useCallback(
    (config: TabsConfig) => {
      registeredAreas.add(config.id);
      setConfigs((current) => [
        ...current.filter((other) => other.id !== config.id),
        config,
      ]);
    },
    [registeredAreas],
  );

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
      registeredAreas.delete(id);
      setConfigs((current) => current.filter((config) => config.id !== id));
      reset(id);
    },
    [registeredAreas, reset],
  );

  /* The record to render with: the entry's, or the one it is about to take */
  const shownRecord = adoptedRecord ?? record;

  /* The tabs engine's state and controls */
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

  /* The engine, and whether the entry's record is about to be rewritten */
  return {
    engine,
    isCorrecting: adoptedRecord !== undefined || syncedRecord !== undefined,
  };
};

export { useTabsHandler };
