import { useCallback, useRef } from "react";
import {
  useNavigate as useRouterNavigate,
  type NavigateFunction,
  type NavigateOptions,
  type To,
} from "react-router";
import { usePWARouting } from "./usePWARouting";
import { isNonInheritedEntry } from "../utils/nonInheritedState";

/** Engine-aware navigate; ignored while correcting, replaces non-inherited entries */
const useNavigate = (): NavigateFunction => {
  const navigate = useRouterNavigate();
  const { resolvedLocation: location, isCorrecting } = usePWARouting();

  /* Keeps the function stable across navigations */
  const latestRef = useRef({ navigate, location, isCorrecting });

  // oxlint-disable-next-line react/refs
  latestRef.current = { navigate, location, isCorrecting };

  return useCallback((to: To | number, options?: NavigateOptions) => {
    const { navigate, location, isCorrecting } = latestRef.current;

    /* Navigating now would race the engine */
    if (isCorrecting) return;

    if (typeof to === "number") return navigate(to);

    return navigate(to, {
      ...options,
      replace: options?.replace ?? isNonInheritedEntry(location.state),
    });
  }, []) as NavigateFunction;
};

export { useNavigate };
