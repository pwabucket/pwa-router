import { createContext } from "react";
import type { QueueLocationStateChange } from "../../lib/engine/transactions/LocationStateTransactions";

/** Internal: queues location state changes; stable for the provider's lifetime */
const LocationStateTransactionsContext =
  createContext<QueueLocationStateChange | null>(null);

export { LocationStateTransactionsContext };
