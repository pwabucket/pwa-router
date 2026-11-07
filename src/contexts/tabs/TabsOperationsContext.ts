import { createContext } from "react";
import type { QueueTabsOp } from "../../lib/engine/transactions/LocationStateTransactions";

/** Internal: queues tab operations; stable for the provider's lifetime */
const TabsOperationsContext = createContext<QueueTabsOp | null>(null);

export { TabsOperationsContext };
