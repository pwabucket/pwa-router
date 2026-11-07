import { useCallback } from "react";
import { type NavigateOptions } from "react-router";
import { useLocation } from "./useLocation";
import { useNavigate } from "./useNavigate";

/** A hook for an in-app back button: back one entry, or `root` when nothing is behind */
const useNavigateBack = (root = "/") => {
  /* The navigate function and the entry's key */
  const navigate = useNavigate();
  const { key } = useLocation();

  /* Back, or root when the app was opened on this entry */
  const navigateBack = useCallback(
    (options?: NavigateOptions) => {
      return key !== "default" ? navigate(-1) : navigate(root, options);
    },
    [key, navigate, root],
  );

  return navigateBack;
};

export { useNavigateBack };
