import { useCallback } from "react";
import { type NavigateOptions } from "react-router";
import { useNavigate } from "./useNavigate";
import { useRoutingStore } from "./useRoutingStore";

/** A hook for an in-app back button; goes to the root when nothing is behind */
const useNavigateBack = (root = "/") => {
  /* The engine-aware navigate, and the routing store read when going back */
  const navigate = useNavigate();
  const routingStore = useRoutingStore();

  /* The back function: back one entry, or to the root when nothing is behind */
  return useCallback(
    (options?: NavigateOptions) =>
      routingStore.getView().resolvedLocation.key !== "default"
        ? navigate(-1)
        : navigate(root, options),
    [navigate, routingStore, root],
  );
};

export { useNavigateBack };
