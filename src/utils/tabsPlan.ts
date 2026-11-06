import type { Location, NavigateOptions, To } from "react-router";
import {
  findTab,
  hasLayersAbove,
  matchTab,
  pageEntryState,
  pagePath,
  pushPage,
  rootPage,
  snapshotPage,
  updateSaved,
  type SavedTabPages,
  type TabPage,
  type TabsConfig,
  type TabsEntryState,
} from "./tabs";

/** The latest saved pages of the tabs that aren't active */
interface TabsMemory {
  version: number;
  saved: SavedTabPages;
}

/** A request to change tabs, queued like a location state change */
type TabsOp =
  | { kind: "select"; tab: string }
  | { kind: "popToRoot" }
  | { kind: "exit"; to: To; options?: NavigateOptions };

/** One entry written by a tab operation */
interface TabsWrite {
  to: To;
  replace: boolean;
  /** The entry's state, given the entry's stamp */
  buildState: (stamp: number) => unknown;
  /** The stamp of a replaced entry; a push is stamped once it lands */
  stamp?: number;
}

/** How a tab operation navigates: a close first, then one write */
interface TabsPlan {
  /** Land before this stamp first */
  landing?: number;
  write?: TabsWrite;
}

/** The location of a written entry, to check guards against */
const readWriteLocation = (write: TabsWrite): Partial<Location> => ({
  ...(typeof write.to === "string" ? { pathname: write.to } : write.to),
  state: write.buildState(write.stamp ?? 0),
});

/** The landing that puts the current entry on the given page entry, if it isn't there */
const landOn = (
  location: Location,
  tabs: TabsEntryState,
  pageStamp: number,
) => {
  const isOnPage =
    tabs.stamp === pageStamp && !hasLayersAbove(location.state, pageStamp);
  return isOnPage ? undefined : pageStamp + 1;
};

/** Plans a switch to another tab: close the slot, then push the tab's top page */
const planSelect = (
  config: TabsConfig,
  location: Location,
  tabs: TabsEntryState,
  memory: TabsMemory,
  target: string,
): TabsPlan => {
  /* The default tab stays below; another tab's slot closes */
  const landing =
    tabs.slot === null ? landOn(location, tabs, tabs.stamp) : tabs.slot;

  /* Back to the default tab: its pages are already below */
  if (target === config.defaultTab) return { landing };

  /* Save the left tab's pages, take out the target's */
  const saved = updateSaved(
    memory.saved,
    tabs.active,
    [...tabs.pages, snapshotPage(location)],
    target,
  );

  /* The target's top page holds its lower pages as virtual pages */
  const targetPages = memory.saved[target] ?? [
    rootPage(findTab(config, target)),
  ];
  const top = targetPages[targetPages.length - 1];
  const lower = targetPages.slice(0, -1);

  return {
    landing,
    write: {
      to: pagePath(top),
      replace: false,
      buildState: (stamp) =>
        pageEntryState(top, {
          ...tabs,
          active: target,
          pages: lower,
          virtual: lower.length,
          saved,
          savedVersion: memory.version + 1,
          slot: stamp,
          stamp,
        }),
    },
  };
};

/** Plans a pop to the active tab's first page */
const planPopToRoot = (
  config: TabsConfig,
  location: Location,
  tabs: TabsEntryState,
  memory: TabsMemory,
): TabsPlan | null => {
  const root = rootPage(findTab(config, tabs.active));
  const firstStamp = tabs.slot ?? tabs.base;
  const landing = landOn(location, tabs, firstStamp);

  /* Already on the root, with nothing below */
  const isOnRoot =
    landing === undefined &&
    !tabs.pages.length &&
    location.pathname === root.pathname &&
    !location.search;

  if (isOnRoot) return null;

  /* Close everything above the first entry, then make it the root */
  return {
    landing,
    write: {
      to: pagePath(root),
      replace: true,
      stamp: firstStamp,
      buildState: () =>
        pageEntryState(root, {
          ...tabs,
          pages: [],
          virtual: 0,
          saved: memory.saved,
          savedVersion: memory.version,
          stamp: firstStamp,
        }),
    },
  };
};

/** Plans leaving the tabbed area: close all of it, then go to the target */
const planExit = (
  location: Location,
  tabs: TabsEntryState,
  to: To,
  options?: NavigateOptions,
): TabsPlan => {
  /* With nothing before the area, its first entry becomes the target */
  const isFirstAppEntry = tabs.baseIndex === 0;

  return {
    landing: isFirstAppEntry ? landOn(location, tabs, tabs.base) : tabs.base,
    write: {
      to,
      replace: isFirstAppEntry || options?.replace === true,
      stamp: tabs.base,
      buildState: () => options?.state,
    },
  };
};

/** Plans a tab operation from the current entry */
const planTabsOp = (
  op: TabsOp,
  config: TabsConfig,
  location: Location,
  tabs: TabsEntryState,
  memory: TabsMemory,
): TabsPlan | null => {
  switch (op.kind) {
    case "select":
      if (op.tab === tabs.active) {
        return planPopToRoot(config, location, tabs, memory);
      }
      return planSelect(config, location, tabs, memory, op.tab);

    case "popToRoot":
      return planPopToRoot(config, location, tabs, memory);

    case "exit":
      return planExit(location, tabs, op.to, op.options);
  }
};

/** The tabs data a new entry takes: a pushed page, a replaced one, or a new area */
const adoptTabs = (
  config: TabsConfig,
  previous: { location: Location; tabs: TabsEntryState } | null,
  location: Location,
  navigationType: string,
  memory: TabsMemory,
  historyLength: number,
  historyIndex: number,
): TabsEntryState => {
  /* A page pushed in the area: the previous page goes below it */
  if (previous && navigationType === "PUSH") {
    return {
      ...pushPage(
        previous.tabs,
        snapshotPage(previous.location),
        historyLength,
      ),
      saved: memory.saved,
      savedVersion: memory.version,
    };
  }

  /* A page replaced in the area keeps its place */
  if (previous && navigationType === "REPLACE") {
    return {
      ...previous.tabs,
      saved: memory.saved,
      savedVersion: memory.version,
    };
  }

  /* A new area: its tab is picked by the address */
  const active = matchTab(config, location.pathname);

  return {
    root: config.id,
    active,
    pages: [],
    virtual: 0,
    saved: memory.saved,
    savedVersion: memory.version,
    base: historyLength,
    baseIndex: historyIndex,
    slot: active === config.defaultTab ? null : historyLength,
    stamp: historyLength,
  };
};

/** The saved pages after an entry settles: newer history wins, a tab change saves the left tab */
const settleMemory = (
  memory: TabsMemory,
  previous: { location: Location; tabs: TabsEntryState } | null,
  tabs: TabsEntryState,
): TabsMemory => {
  if (tabs.savedVersion > memory.version) {
    return { version: tabs.savedVersion, saved: tabs.saved };
  }

  if (previous && previous.tabs.active !== tabs.active) {
    return {
      version: memory.version + 1,
      saved: updateSaved(
        memory.saved,
        previous.tabs.active,
        [...previous.tabs.pages, snapshotPage(previous.location)],
        tabs.active,
      ),
    };
  }

  return memory;
};

/** The entries putting the default root (and the tab's root) under a first entry; null when none are needed */
const planBackfill = (
  config: TabsConfig,
  location: Location,
  tabs: TabsEntryState,
) => {
  const defaultRoot = rootPage(findTab(config, config.defaultTab));
  const tabRoot = rootPage(findTab(config, tabs.active));
  const current = snapshotPage(location);
  const isDefaultTab = tabs.active === config.defaultTab;

  /* The pages from the bottom: default root, tab root, then the current page */
  const pages: TabPage[] = [defaultRoot];
  if (!isDefaultTab) pages.push(tabRoot);
  if (current.pathname !== pages[pages.length - 1].pathname) {
    pages.push(current);
  } else {
    pages[pages.length - 1] = current;
  }

  if (pages.length === 1) return null;

  /* One entry per page, stamped from the area's first entry */
  return pages.map((page, offset) => {
    const stamp = tabs.base + offset;
    const isTabPage = !isDefaultTab && offset > 0;

    return {
      to: pagePath(page),
      state: pageEntryState(page, {
        ...tabs,
        active: isTabPage ? tabs.active : config.defaultTab,
        pages: isTabPage ? pages.slice(1, offset) : pages.slice(0, offset),
        virtual: 0,
        slot: isTabPage ? tabs.base + 1 : null,
        stamp,
      }),
    };
  });
};

export {
  adoptTabs,
  planBackfill,
  planTabsOp,
  readWriteLocation,
  settleMemory,
};
export type { TabsMemory, TabsOp, TabsPlan, TabsWrite };
