import { useCallback, useRef } from "react";
import {
  useNavigate as useRouterNavigate,
  type NavigateFunction,
  type NavigateOptions,
  type To,
} from "react-router";
import { usePWARouting } from "./usePWARouting";
import { isNonInheritedEntry } from "../../lib/layers/nonInheritedState";

/** A hook for React Router's navigate: ignored while correcting, replaces entries holding non-inherited values, stable */
const useNavigate = (): NavigateFunction => {
  /* The router's navigate and the provider's state */
  const navigate = useRouterNavigate();
  const { resolvedLocation: location, isCorrecting } = usePWARouting();

  /* Keeps the function stable across navigations */
  const latestRef = useRef({ navigate, location, isCorrecting });

  // oxlint-disable-next-line react/refs
  latestRef.current = { navigate, location, isCorrecting };

  /* The navigate function */
  return useCallback((to: To | number, options?: NavigateOptions) => {
    const { navigate, location, isCorrecting } = latestRef.current;

    /* Navigating now would race the engine */
    if (isCorrecting) return;

    /* Going back or forth, or a navigation that replaces non-inherited entries */
    if (typeof to === "number") return navigate(to);

    return navigate(to, {
      ...options,
      replace: options?.replace ?? isNonInheritedEntry(location.state),
    });
  }, []) as NavigateFunction;
};

export { useNavigate };
