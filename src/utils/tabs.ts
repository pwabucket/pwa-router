import type { Location } from "react-router";
import { ROUTER_TABS } from "../constants";
import { readLayers } from "./layers";
import type { LocationState } from "./location";

/** A tab of a tabbed area */
interface TabDefinition {
  id: string;
  /** The path of the tab's first page; deep links pick their tab by it */
  root: string;
}

/** A tabbed area as registered by TabsRoot */
interface TabsConfig {
  id: string;
  tabs: TabDefinition[];
  defaultTab: string;
}

/** One page of a tab: an address and its in-place values */
interface TabPage {
  pathname: string;
  search: string;
  hash: string;
  /** In-place values only: no layers, no engine keys */
  state: Record<string, unknown>;
}

/** Saved pages of the tabs that aren't active, the top page last */
type SavedTabPages = Record<string, TabPage[]>;

/** The tabs data stored on every entry of a tabbed area */
interface TabsEntryState {
  /** The TabsRoot this entry belongs to */
  root: string;
  /** The tab this entry belongs to */
  active: string;
  /** The active tab's pages below the current one, the lowest first */
  pages: TabPage[];
  /** How many of the lowest `pages` have no entry of their own (restored by a switch) */
  virtual: number;
  /** Other tabs' pages */
  saved: SavedTabPages;
  /** Bumped on every change of `saved` */
  savedVersion: number;
  /** The tabbed area's first entry */
  base: number;
  /** React Router's index of the first entry */
  baseIndex: number;
  /** The active non-default tab's first entry; null for the default tab */
  slot: number | null;
  /** The current page's entry */
  stamp: number;
}

/** The most pages a tab keeps */
const MAX_TAB_PAGES = 50;

/** Tabs data recorded in the state of the given root */
const readTabsState = (state: LocationState, rootId: string) => {
  const tabs = state?.[ROUTER_TABS] as TabsEntryState | undefined;
  return tabs?.root === rootId ? tabs : undefined;
};

/** State patch holding the tabs data */
const writeTabsState = (tabs: TabsEntryState) => ({ [ROUTER_TABS]: tabs });

/** The values of a state that belong to its page: no layers, no engine keys */
const readPageState = (state: LocationState) => {
  const layers = readLayers(state);
  const pageState: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(state ?? {})) {
    if (key.startsWith("__router_") || key in layers) continue;
    pageState[key] = value;
  }

  return pageState;
};

/** A location as a tab page */
const snapshotPage = (location: Location): TabPage => ({
  pathname: location.pathname,
  search: location.search,
  hash: location.hash,
  state: readPageState(location.state),
});

/** A tab's first page */
const rootPage = (tab: TabDefinition): TabPage => ({
  pathname: tab.root,
  search: "",
  hash: "",
  state: {},
});

/** A page list kept within the cap, dropping the oldest pages */
const capPages = (pages: TabPage[]) => pages.slice(-MAX_TAB_PAGES);

/** Tabs data with a page pushed on top, the lowest pages dropped past the cap */
const pushPage = (tabs: TabsEntryState, page: TabPage, stamp: number) => {
  const pages = [...tabs.pages, page];
  const dropped = Math.max(0, pages.length - MAX_TAB_PAGES);

  return {
    ...tabs,
    pages: pages.slice(dropped),
    virtual: Math.max(0, tabs.virtual - dropped),
    stamp,
  };
};

/** The entry holds layers pushed above its page */
const hasLayersAbove = (state: LocationState, pageStamp: number) =>
  Object.entries(readLayers(state)).some(
    ([key, stamp]) => state?.[key] != null && stamp.latest > pageStamp,
  );

/** The tab whose root is the longest prefix of the pathname, or the default */
const matchTab = (config: TabsConfig, pathname: string) => {
  let match: TabDefinition | undefined;

  for (const tab of config.tabs) {
    const root = tab.root.replace(/\/$/, "");
    const isPrefix =
      pathname === tab.root ||
      pathname === root ||
      pathname.startsWith(`${root}/`);

    if (isPrefix && (!match || root.length > match.root.length)) match = tab;
  }

  return match?.id ?? config.defaultTab;
};

/** The definition of a tab */
const findTab = (config: TabsConfig, tabId: string) =>
  config.tabs.find((tab) => tab.id === tabId) ??
  config.tabs.find((tab) => tab.id === config.defaultTab)!;

/** Saved pages with the left tab's pages stored and the entered tab's removed */
const updateSaved = (
  saved: SavedTabPages,
  leftTab: string,
  leftPages: TabPage[],
  enteredTab: string,
) => {
  const next = { ...saved, [leftTab]: capPages(leftPages) };
  delete next[enteredTab];
  return next;
};

/** A location state with a page's values and the tabs data */
const pageEntryState = (page: TabPage, tabs: TabsEntryState) => ({
  ...page.state,
  ...writeTabsState(tabs),
});

/** A tab page as a location path */
const pagePath = ({ pathname, search, hash }: TabPage) => ({
  pathname,
  search,
  hash,
});

/** Engine flags shared by the tabs handler and the transactions */
class TabsSession {
  private opPending = false;

  /** A tab operation is on its way through the history */
  get isOpPending() {
    return this.opPending;
  }

  /** Marks whether a tab operation is on its way */
  setOpPending(opPending: boolean) {
    this.opPending = opPending;
  }
}

export {
  MAX_TAB_PAGES,
  TabsSession,
  capPages,
  hasLayersAbove,
  pushPage,
  findTab,
  matchTab,
  pageEntryState,
  pagePath,
  readPageState,
  readTabsState,
  rootPage,
  snapshotPage,
  updateSaved,
  writeTabsState,
};
export type {
  SavedTabPages,
  TabDefinition,
  TabPage,
  TabsConfig,
  TabsEntryState,
};
