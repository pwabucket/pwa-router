import { useCallback, useLayoutEffect, useRef } from "react";
import {
  useNavigate,
  type NavigateFunction,
  type NavigateOptions,
  type To,
} from "react-router";

/** A hook for React Router's navigate as one stable function that always calls the latest one */
const useStableNavigate = (): NavigateFunction => {
  /* React Router's navigate, kept for calls */
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);

  /* The latest navigate, once on screen */
  useLayoutEffect(() => {
    navigateRef.current = navigate;
  });

  /* The stable function */
  const stableNavigate = useCallback(
    (to: To | number, options?: NavigateOptions) =>
      typeof to === "number"
        ? navigateRef.current(to)
        : navigateRef.current(to, options),
    [],
  );

  return stableNavigate as NavigateFunction;
};

export { useStableNavigate };
