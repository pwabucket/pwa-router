import { useSyncExternalStore } from "react";
import type { PWARoutingContextValue } from "../../contexts/router/PWARoutingContext";
import { useRoutingStore } from "./useRoutingStore";

/** A hook for one slice of the engine's view; re-renders only when the slice changes, so the selector returns a primitive or an existing object, never a new one */
const useRoutingSelector = <T>(
  selector: (view: PWARoutingContextValue) => T,
): T => {
  /* The nearest routing store */
  const store = useRoutingStore();

  /* The slice of the current view */
  return useSyncExternalStore(store.subscribe, () =>
    selector(store.getView()),
  );
};

export { useRoutingSelector };
