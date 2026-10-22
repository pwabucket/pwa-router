import { createContext } from "react";
import type { SetPendingState } from "../providers/engine/usePendingStates";

/** Internal: the batched setter shared by every useLocationState */
const PendingStatesContext = createContext<SetPendingState | null>(null);

export { PendingStatesContext };
