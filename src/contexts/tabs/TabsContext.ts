import { createContext } from "react";
import type { Address } from "../../lib/engine/core/record";
import type { SavedTabSteps, TabsConfig } from "../../lib/tabs/core/tabs";

/** A tabbed area as seen by its views and controls */
interface TabsContextValue {
  /** The area as registered */
  config: TabsConfig;
  /** The tab on show, including one being switched to */
  active: string;
  /** The tab whose page is the real location */
  liveTab: string;
  /** Saved steps of the tabs that aren't active */
  saved: SavedTabSteps;
  /** The address the area was opened on; tabs without a root start there */
  address: Address;
  /** Switches to a tab; the active one stays as it is */
  select: (tab: string) => void;
  /** Pops the active tab to its root */
  popToRoot: () => void;
}

/** Internal: the nearest TabsRoot */
const TabsContext = createContext<TabsContextValue | null>(null);

export { TabsContext };
export type { TabsContextValue };
