import { useCallback } from "react";
import { useNavigate, type NavigateOptions } from "react-router";
import { usePWARouting } from "./usePWARouting";

const useNavigateBack = (root = "/") => {
  const navigate = useNavigate();
  const { resolvedLocation: location } = usePWARouting();

  const navigateBack = useCallback(
    (options?: NavigateOptions) => {
      return location.key !== "default"
        ? navigate(-1)
        : navigate(root, options);
    },
    [location, navigate, root],
  );

  return navigateBack;
};

export { useNavigateBack };
