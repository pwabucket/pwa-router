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
import { readHistoryIndex } from "../../utils/history";
import { getLocationPath } from "../../utils/location";
import {
  readTabsState,
  writeTabsState,
  type TabsConfig,
  type TabsEntryState,
} from "../../utils/tabs";
import { adoptTabs, settleMemory, type TabsMemory } from "../../utils/tabsPlan";
import type { EngineWork } from "./EngineWork";

/** A settled entry of the tabbed area and its tabs data */
interface TrackedTabsEntry {
  location: Location;
  tabs: TabsEntryState;
}

/** Memory before any entry has settled */
const EMPTY_MEMORY: TabsMemory = { version: 0, saved: {} };

/** Keeps every entry of a registered tabbed area carrying its tabs data */
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
  const [tracked, setTracked] = useState<TrackedTabsEntry | null>(null);

  /* The area registered right now; an area unmounting in this commit writes nothing */
  const registeredIdRef = useRef<string | null>(null);

  /* The tabs data on the current entry */
  const entryTabs = config
    ? readTabsState(location.state, config.id)
    : undefined;
  const canWrite = config !== null && !isCorrecting && !work.isOperating;

  /* A new entry of the area without tabs data takes them (a page push, a replace, a new area) */
  const adoptedTabs = useMemo(
    () =>
      canWrite && !entryTabs
        ? adoptTabs(
            config,
            tracked,
            location,
            navigationType,
            memory,
            window.history.length,
            readHistoryIndex() ?? 0,
          )
        : undefined,
    [canWrite, config, entryTabs, tracked, location, navigationType, memory],
  );

  /* Settle on entries that carry tabs data, merging the saved pages */
  if (canWrite && entryTabs && tracked?.location.key !== location.key) {
    const nextMemory = settleMemory(memory, tracked, entryTabs);
    setTracked({ location, tabs: entryTabs });
    if (nextMemory !== memory) setMemory(nextMemory);
  }

  /* The entry holds older saved pages than memory */
  const needsSync =
    canWrite &&
    entryTabs !== undefined &&
    entryTabs.savedVersion !== memory.version;

  /* Write the adopted or synced tabs data in place */
  useLayoutEffect(() => {
    const tabs = adoptedTabs ??
      (needsSync && entryTabs
        ? { ...entryTabs, saved: memory.saved, savedVersion: memory.version }
        : undefined);

    const isStillRegistered = registeredIdRef.current === config?.id;
    if (!tabs || !isStillRegistered || !tryLock()) return;

    navigate(getLocationPath(location), {
      replace: true,
      state: { ...location.state, ...writeTabsState(tabs) },
    });
  }, [
    adoptedTabs,
    needsSync,
    entryTabs,
    memory,
    config,
    location,
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

  /* The tabs data to render with: the entry's, or the one it is about to take */
  const tabs = entryTabs ?? adoptedTabs;

  const engine = useMemo(
    () => ({ config, tabs, memory, register, unregister, reset }),
    [config, tabs, memory, register, unregister, reset],
  );

  return {
    engine,
    isCorrecting: adoptedTabs !== undefined || needsSync,
  };
};

export { useTabsHandler };
export type { TrackedTabsEntry };
