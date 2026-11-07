import { createContext } from "react";
import type { LeaveGuardRegistry } from "../../lib/guards/LeaveGuardRegistry";

/** Internal: the leave guards of the nearest router */
const LeaveGuardsContext = createContext<LeaveGuardRegistry | null>(null);

export { LeaveGuardsContext };
