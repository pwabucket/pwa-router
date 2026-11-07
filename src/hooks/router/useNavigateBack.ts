import { useCallback, useRef } from "react";
import { type NavigateOptions } from "react-router";
import { useLocation } from "./useLocation";
import { useNavigate } from "./useNavigate";

/** A hook for an in-app back button; goes to the root when nothing is behind */
const useNavigateBack = (root = "/") => {
  /* The engine-aware navigate and the current entry's key */
  const navigate = useNavigate();
  const { key } = useLocation();

  /* Keeps the function stable across navigations */
  const keyRef = useRef(key);

  // oxlint-disable-next-line react/refs
  keyRef.current = key;

  /* The back function: back one entry, or to the root when nothing is behind */
  return useCallback(
    (options?: NavigateOptions) =>
      keyRef.current !== "default"
        ? navigate(-1)
        : navigate(root, options),
    [navigate, root],
  );
};

export { useNavigateBack };
