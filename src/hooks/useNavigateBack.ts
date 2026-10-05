import { useCallback } from "react";
import { type NavigateOptions } from "react-router";
import { useLocation } from "./useLocation";
import { useNavigate } from "./useNavigate";

const useNavigateBack = (root = "/") => {
  const navigate = useNavigate();
  const { key } = useLocation();

  const navigateBack = useCallback(
    (options?: NavigateOptions) => {
      return key !== "default" ? navigate(-1) : navigate(root, options);
    },
    [key, navigate, root],
  );

  return navigateBack;
};

export { useNavigateBack };
