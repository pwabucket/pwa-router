import { useContext } from "react";
import { RoutingStoreContext } from "../../contexts/router/RoutingStoreContext";

/** A hook for the nearest routing store, to read the view when acting; never re-renders on navigation */
const useRoutingStore = () => useContext(RoutingStoreContext)!;

export { useRoutingStore };
