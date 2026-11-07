import { createContext } from "react";
import type { QueueTabsOp } from "../../lib/engine/transactions/LocationStateTransactions";
import type { EntryRecord } from "../../lib/engine/core/record";
import type { TabsConfig, TabsMemory } from "../../lib/tabs/core/tabs";

/** The engine side of a tabbed area, consumed by TabsRoot */
interface TabsEngineContextValue {
  /** Every registered tabbed area */
  configs: TabsConfig[];
  /** The current entry's record, or the one it is about to take */
  record: EntryRecord;
  /** The latest saved steps of each area's inactive tabs, by area id */
  memories: Record<string, TabsMemory>;
  /** The tab being switched to in an area, shown at once */
  pendingTab: { area: string; tab: string } | null;
  /** Registers a tabbed area */
  register: (config: TabsConfig) => void;
  /** Removes a tabbed area */
  unregister: (id: string) => void;
  /** Queues a tab operation */
  queueTabsOp: QueueTabsOp;
}

/** Internal: the tabs engine of the nearest router */
const TabsEngineContext = createContext<TabsEngineContextValue | null>(null);

export { TabsEngineContext };
export type { TabsEngineContextValue };
