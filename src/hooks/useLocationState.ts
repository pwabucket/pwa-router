import { useCallback, useMemo } from "react";
import { useLocation, useNavigate, type NavigateOptions } from "react-router";
import { useLocationIndex } from "./useLocationIndex";

type UseLocationStateReturn<T> = [
  T,
  (value?: T, options?: NavigateOptions) => void,
];

const useLocationState = <T>(
  key: string,
  defaultValue: T,
  indexKey?: string,
): UseLocationStateReturn<T> => {
  const navigate = useNavigate();
  const location = useLocation();
  const valueFromState = location.state?.[key];
  const value =
    typeof valueFromState !== "undefined" ? valueFromState : defaultValue;

  /* Get location index from state */
  const index = useLocationIndex(indexKey);

  /** Set value */
  const setValue = useCallback(
    (newValue?: T, options?: NavigateOptions) => {
      if (typeof newValue !== "undefined") {
        navigate(location, {
          ...options,
          state: {
            ...location.state,
            ...options?.state,
            [key]: newValue,
          },
        });
      } else {
        if (index !== undefined) {
          navigate(index - (history.length + 1));
        } else if (location.key !== "default") {
          navigate(-1);
        } else {
          navigate("/", { ...options, replace: true });
        }
      }
    },
    [key, index, navigate, location],
  );

  return useMemo(() => [value, setValue], [value, setValue]);
};

export { useLocationState };
export type { UseLocationStateReturn };
