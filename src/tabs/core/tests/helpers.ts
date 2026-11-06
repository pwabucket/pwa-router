import type { Location } from "react-router";
import { ROUTER_RECORD } from "../../../constants";
import {
  createArea,
  createRecord,
  type AreaRecord,
  type StepRecord,
} from "../../../engine/core/record";
import type { TabsConfig } from "../tabs";

/** The tabbed area of the tests */
export const config: TabsConfig = {
  id: "main",
  defaultTab: "home",
  deepLinkRoots: true,
  tabs: [
    { id: "home", root: "/" },
    { id: "search", root: "/search" },
  ],
};

/** A page step, real at a position or virtual */
export const page = (
  id: string,
  position: number | null,
  pathname = `/${id}`,
): StepRecord => ({
  id,
  kind: "page",
  position,
  snapshot: {
    pathname,
    search: "",
    hash: "",
    values: {},
    record: { values: {}, areas: [] },
  },
});

/** A layer step at a position */
export const layer = (id: string, position: number): StepRecord => ({
  id,
  kind: "layer",
  position,
});

/** A tab entry: its location, record and area */
export const entry = (pathname: string, area: AreaRecord) => {
  const record = { ...createRecord(), areas: [createRecord().areas[0], area] };
  const location = {
    pathname,
    search: "",
    hash: "",
    key: "k",
    state: { [ROUTER_RECORD]: record },
  } as Location;
  return { location, record, area };
};

/** An empty memory */
export const memory = { version: 0, saved: {} };

/** Tabs sharing the address of the page they're on */
export const layout: TabsConfig = {
  id: "main",
  defaultTab: "canvas",
  deepLinkRoots: true,
  tabs: [{ id: "canvas" }, { id: "items" }, { id: "settings", root: "/s" }],
};

/** The area opened on /layout?doc=5, on the given tab */
export const opened = (active: string, steps: StepRecord[]) => ({
  ...createArea("main", active, 1, 0, "canvas"),
  address: { pathname: "/layout", search: "?doc=5", hash: "" },
  steps,
});

/** An entry on /layout?doc=5 */
export const layoutEntry = (area: AreaRecord) => {
  const tabEntry = entry("/layout", area);
  tabEntry.location.search = "?doc=5";
  return tabEntry;
};

/** An area restored into the entry at 7, on search, with home saved */
export const restored = {
  ...createArea("main", "search", 7, 2, "home"),
  steps: [page("search", 7)],
  saved: { home: [page("feed", null), page("post", null)] },
};
