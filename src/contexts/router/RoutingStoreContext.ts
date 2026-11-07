import { createContext } from "react";
import type { RoutingStore } from "../../lib/router/RoutingStore";

/** Internal: the store of the engine's view of the nearest router, read in slices or when acting; every TabView gives its tab's own */
const RoutingStoreContext = createContext<RoutingStore | null>(null);

export { RoutingStoreContext };
