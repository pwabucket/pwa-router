import { useCallback, useRef } from "react";
import { type NavigateOptions } from "react-router";
import { useLocation } from "./useLocation";
import { useNavigate } from "./useNavigate";

/** A hook for an in-app back button: back one entry, or `root` when nothing is behind */
const useNavigateBack = (root = "/") => {
  /* The navigate function and the entry's key */
  const navigate = useNavigate();
  const { key } = useLocation();

  /* The latest key and root, read when going back, so the callback stays stable */
  const latestRef = useRef({ key, root });

  // oxlint-disable-next-line react/refs
  latestRef.current = { key, root };

  /* Back, or root when the app was opened on this entry */
  const navigateBack = useCallback(
    (options?: NavigateOptions) => {
      const { key, root } = latestRef.current;
      return key !== "default" ? navigate(-1) : navigate(root, options);
    },
    [navigate],
  );

  return navigateBack;
};

export { useNavigateBack };
