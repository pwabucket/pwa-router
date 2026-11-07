import { useLayoutEffect, useState } from "react";
import type { PWARoutingContextValue } from "../../contexts/router/PWARoutingContext";
import { RoutingStore } from "../../lib/router/RoutingStore";

/** A hook for a routing store owned by the caller, holding the view it renders */
const useOwnRoutingStore = (view: PWARoutingContextValue) => {
  /* The store, created once */
  const [store] = useState(() => new RoutingStore(view));

  /* Readers rendering now see the view at once */
  store.write(view);

  /* Subscribers hear of it once it is on screen */
  useLayoutEffect(() => {
    store.publish();
  });

  /* The store, for the context */
  return store;
};

export { useOwnRoutingStore };
