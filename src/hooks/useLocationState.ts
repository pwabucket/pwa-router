import { useCallback, useMemo } from "react";
import { useLocation, useNavigate, type NavigateOptions } from "react-router";

type UseLocationStateReturn<T> = [
  T,
  (value?: T, options?: NavigateOptions, index?: number) => void,
];

const useLocationState = <T>(
  key: string,
  defaultValue: T,
): UseLocationStateReturn<T> => {
  const navigate = useNavigate();
  const location = useLocation();
  const valueFromState = location.state?.[key];
  const value = valueFromState !== undefined ? valueFromState : defaultValue;

  /** Set value */
  const setValue = useCallback(
    (newValue?: T, options?: NavigateOptions, index?: number) => {
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
          const delta = index - history.length;
          navigate(delta - 1);
        } else if (location.key !== "default") {
          navigate(-1);
        } else {
          navigate("/", { ...options, replace: true });
        }
      }
    },
    [key, navigate, location],
  );

  return useMemo(() => [value, setValue], [value, setValue]);
};

export { useLocationState };
export type { UseLocationStateReturn };
