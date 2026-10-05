import { useCallback, useMemo, useState } from "react";
import {
  createSearchParams,
  type SetURLSearchParams,
  type URLSearchParamsInit,
} from "react-router";
import { useLocation } from "./useLocation";
import { useNavigate } from "./useNavigate";

/** Engine-aware search params; reads the resolved location, sets through useNavigate */
const useSearchParams = (
  defaultInit?: URLSearchParamsInit,
): [URLSearchParams, SetURLSearchParams] => {
  const [defaultSearchParams] = useState(() => createSearchParams(defaultInit));
  const [hasSetSearchParams, setHasSetSearchParams] = useState(false);
  const { search } = useLocation();
  const navigate = useNavigate();

  const searchParams = useMemo(() => {
    const params = createSearchParams(search);

    /* Defaults only apply until the params are first set */
    if (!hasSetSearchParams) {
      for (const key of new Set(defaultSearchParams.keys())) {
        if (!params.has(key)) {
          for (const value of defaultSearchParams.getAll(key)) {
            params.append(key, value);
          }
        }
      }
    }

    return params;
  }, [search, defaultSearchParams, hasSetSearchParams]);

  const setSearchParams = useCallback<SetURLSearchParams>(
    (nextInit, navigateOptions) => {
      const nextSearchParams = createSearchParams(
        typeof nextInit === "function"
          ? nextInit(new URLSearchParams(searchParams))
          : nextInit,
      );

      setHasSetSearchParams(true);
      navigate("?" + nextSearchParams, navigateOptions);
    },
    [navigate, searchParams],
  );

  return [searchParams, setSearchParams];
};

export { useSearchParams };
