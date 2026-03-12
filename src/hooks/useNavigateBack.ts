import { useCallback } from "react";
import { useLocation, useNavigate, type NavigateOptions } from "react-router";

const useNavigateBack = (root = "/") => {
  const navigate = useNavigate();
  const location = useLocation();

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
