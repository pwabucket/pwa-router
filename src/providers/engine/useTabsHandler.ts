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
import { readEntry } from "../../core/legacy";
import {
  adoptTabs,
  settleMemory,
  writeArea,
  type TabsEntry,
} from "../../core/planTabs";
import { findArea, type AreaRecord } from "../../core/record";
import { createStepId } from "../../core/stepIds";
import type { TabsConfig, TabsMemory } from "../../core/tabs";
import { readHistoryIndex } from "../../utils/history";
import { getLocationPath } from "../../utils/location";
import type { EngineWork } from "./EngineWork";

/** Memory before any entry has settled */
const EMPTY_MEMORY: TabsMemory = { version: 0, saved: {} };

/** Keeps every entry of a registered tabbed area carrying its area record */
const useTabsHandler = (
  location: Location,
  work: EngineWork,
  isCorrecting: boolean,
  tryLock: () => boolean,
) => {
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const [config, setConfig] = useState<TabsConfig | null>(null);
  const [memory, setMemory] = useState(EMPTY_MEMORY);
  const [tracked, setTracked] = useState<TabsEntry | null>(null);

  /* The area registered right now; an area unmounting in this commit writes nothing */
  const registeredIdRef = useRef<string | null>(null);

  /* The current entry's record, and its area */
  const { state, record } = useMemo(
    () => readEntry(location.state),
    [location.state],
  );
  const entryArea = config ? findArea(record, config.id) : undefined;
  const canWrite = config !== null && !isCorrecting && !work.isOperating;

  /* A new entry of the area without its record takes one (a page push, a replace, a new area) */
  const adoptedArea = useMemo(
    () =>
      canWrite && !entryArea
        ? adoptTabs(
            config,
            tracked,
            location,
            record,
            navigationType,
            memory,
            window.history.length,
            readHistoryIndex() ?? 0,
            createStepId,
          )
        : undefined,
    [
      canWrite,
      config,
      entryArea,
      tracked,
      location,
      record,
      navigationType,
      memory,
    ],
  );

  /* Settle on entries that carry the area, merging the saved pages */
  if (canWrite && entryArea && tracked?.location.key !== location.key) {
    const nextMemory = settleMemory(memory, tracked, entryArea);
    setTracked({ location, record, area: entryArea });
    if (nextMemory !== memory) setMemory(nextMemory);
  }

  /* The entry holds older saved pages than memory */
  const needsSync =
    canWrite &&
    entryArea !== undefined &&
    entryArea.savedVersion !== memory.version;

  /* Write the adopted or synced area in place */
  useLayoutEffect(() => {
    const area: AreaRecord | undefined =
      adoptedArea ??
      (needsSync && entryArea
        ? { ...entryArea, saved: memory.saved, savedVersion: memory.version }
        : undefined);

    const isStillRegistered = registeredIdRef.current === config?.id;
    if (!area || !isStillRegistered || !tryLock()) return;

    navigate(getLocationPath(location), {
      replace: true,
      state: writeArea(state, record, area),
    });
  }, [
    adoptedArea,
    needsSync,
    entryArea,
    memory,
    config,
    location,
    state,
    record,
    navigate,
    tryLock,
  ]);

  /** Registers the tabbed area */
  const register = useCallback((nextConfig: TabsConfig) => {
    registeredIdRef.current = nextConfig.id;
    setConfig(nextConfig);
  }, []);

  /** Forgets the tracked entry and the saved pages (leaving the area) */
  const reset = useCallback(() => {
    setTracked(null);
    setMemory(EMPTY_MEMORY);
  }, []);

  /** Removes the tabbed area; its memory goes with it */
  const unregister = useCallback(
    (id: string) => {
      if (registeredIdRef.current === id) registeredIdRef.current = null;
      setConfig((current) => (current?.id === id ? null : current));
      reset();
    },
    [reset],
  );

  /* The area to render with: the entry's, or the one it is about to take */
  const area = entryArea ?? adoptedArea;

  const engine = useMemo(
    () => ({ config, area, record, memory, register, unregister, reset }),
    [config, area, record, memory, register, unregister, reset],
  );

  return {
    engine,
    isCorrecting: adoptedArea !== undefined || needsSync,
  };
};

export { useTabsHandler };
