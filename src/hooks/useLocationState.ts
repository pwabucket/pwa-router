import { useCallback, useMemo, useRef } from "react";
import { useNavigate, type NavigateOptions } from "react-router";
import { usePWARouting } from "./usePWARouting";
import { ROUTER_DESTROY_INDEX } from "../constants";

type UseLocationStateReturn<T> = [
  T,
  (value?: T, options?: NavigateOptions, index?: number) => void,
];

const useLocationState = <T>(
  key: string,
  defaultValue: T,
): UseLocationStateReturn<T> => {
  const navigate = useNavigate();
  const { resolvedLocation: location } = usePWARouting();
  const ref = useRef({
    navigate,
    location,
  });

  // eslint-disable-next-line
  ref.current.location = location;
  // eslint-disable-next-line
  ref.current.navigate = navigate;

  const valueFromState = location.state?.[key];
  const value: T = valueFromState !== undefined ? valueFromState : defaultValue;

  /** Set value */
  const setValue = useCallback(
    (newValue?: T, options?: NavigateOptions, index?: number) => {
      const { navigate, location } = ref.current;
      /* If newValue is defined, update location state with new value */
      if (newValue !== undefined) {
        navigate(
          {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
          {
            ...options,
            state: {
              ...location.state,
              ...options?.state,
              [key]: newValue,
            },
          },
        );
      } else {
        /* If newValue is undefined, remove value from location state */
        if (index !== undefined) {
          if (index < history.length) {
            navigate(
              {
                pathname: location.pathname,
                search: location.search,
                hash: location.hash,
              },
              {
                ...options,
                replace: true,
                state: {
                  ...location.state,
                  ...options?.state,
                  [key]: undefined,
                  [ROUTER_DESTROY_INDEX]: index,
                },
              },
            );
          } else {
            navigate(-1);
          }
        } else if (location.key !== "default") {
          navigate(-1);
        } else {
          navigate("/", { ...options, replace: true });
        }
      }
    },
    [key],
  );

  return useMemo(() => [value, setValue], [value, setValue]);
};

export { useLocationState };
export type { UseLocationStateReturn };
