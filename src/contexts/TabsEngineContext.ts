import { createContext } from "react";
import type { QueueTabsOp } from "../providers/engine/useLocationStateTransactions";
import type { AreaRecord, EntryRecord } from "../core/record";
import type { TabsConfig, TabsMemory } from "../core/tabs";

/** The engine side of a tabbed area, consumed by TabsRoot */
interface TabsEngineContextValue {
  config: TabsConfig | null;
  /** The tab area of the current entry, or the one it is about to take */
  area: AreaRecord | undefined;
  /** The current entry's record */
  record: EntryRecord;
  /** The latest saved pages of the tabs that aren't active */
  memory: TabsMemory;
  /** The tab being switched to, shown at once */
  pendingTab: string | null;
  register: (config: TabsConfig) => void;
  unregister: (id: string) => void;
  queueTabsOp: QueueTabsOp;
}

/** Internal: the tabs engine of the nearest router */
const TabsEngineContext = createContext<TabsEngineContextValue | null>(null);

export { TabsEngineContext };
export type { TabsEngineContextValue };
