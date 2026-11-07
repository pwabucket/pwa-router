import { createContext } from "react";
import type { NavigateFunction } from "react-router";

/** Internal: React Router's navigate as one stable function, for absolute targets and deltas */
const RouterNavigateContext = createContext<NavigateFunction | null>(null);

export { RouterNavigateContext };
