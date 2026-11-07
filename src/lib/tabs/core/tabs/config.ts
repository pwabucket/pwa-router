import { matchPath } from "react-router";

/** A tab of a tabbed area */
export interface TabDefinition {
  id: string;
  /** The path of the tab's first page; deep links pick their tab by it. Without one, the tab starts on the address the area was opened on */
  root?: string;
}

/** A tabbed area as registered by TabsRoot */
export interface TabsConfig {
  id: string;
  tabs: TabDefinition[];
  defaultTab: string;
  /** Put the default tab's root (and the tab's) under a first entry opened on a tab page */
  deepLinkRoots: boolean;
  /** The outer area and tab this area lives in, when nested */
  parent?: { area: string; tab: string };
}

/** The tab whose root is the longest prefix of the pathname, matched like React Router's routes, or the default; tabs without a root never match */
export const matchTab = (config: TabsConfig, pathname: string) => {
  /* The longest matching root so far */
  let match: { id: string; length: number } | undefined;

  /* Each tab with a root */
  for (const tab of config.tabs) {
    if (tab.root === undefined) continue;

    /* The root as a prefix of whole segments */
    const isPrefix =
      matchPath({ path: tab.root, end: false }, pathname) !== null;

    /* The root's length, without a trailing slash */
    const length = tab.root.replace(/\/$/, "").length;

    /* Keep the longest match */
    if (isPrefix && (!match || length > match.length)) {
      match = { id: tab.id, length };
    }
  }

  /* The matched tab, or the default */
  return match?.id ?? config.defaultTab;
};

/** The definition of a tab, or the default tab's */
export const findTab = (config: TabsConfig, tabId: string) =>
  config.tabs.find((tab) => tab.id === tabId) ??
  config.tabs.find((tab) => tab.id === config.defaultTab)!;

/** Configs ordered outer first: an area's parent comes before it */
export const orderConfigs = (configs: TabsConfig[]) => {
  /* The configs by id */
  const byId = new Map(configs.map((config) => [config.id, config]));

  /** How deep an area sits */
  const depth = (config: TabsConfig): number => {
    const parent = config.parent && byId.get(config.parent.area);
    return parent ? depth(parent) + 1 : 0;
  };

  /* Sort by depth, outer first */
  return [...configs].sort((a, b) => depth(a) - depth(b));
};
