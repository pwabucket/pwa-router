import { createContext } from "react";
import type { Address } from "../engine/core/record";
import type { SavedTabSteps, TabsConfig } from "./core/tabs";

/** A tabbed area as seen by its views and controls */
interface TabsContextValue {
  config: TabsConfig;
  /** The tab on show, including one being switched to */
  active: string;
  /** The tab whose page is the real location */
  liveTab: string;
  /** Saved steps of the tabs that aren't active */
  saved: SavedTabSteps;
  /** The address the area was opened on; tabs without a root start there */
  address: Address;
  /** Switches to a tab; the active one pops to its root */
  select: (tab: string) => void;
  /** Pops the active tab to its root */
  popToRoot: () => void;
}

/** Internal: the nearest TabsRoot */
const TabsContext = createContext<TabsContextValue | null>(null);

export { TabsContext };
export type { TabsContextValue };
