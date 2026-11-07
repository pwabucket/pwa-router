import { useCallback, useMemo, useState } from "react";
import {
  createSearchParams,
  type SetURLSearchParams,
  type URLSearchParamsInit,
} from "react-router";
import { useLocation } from "./useLocation";
import { useNavigate } from "./useNavigate";

/** A hook for search params aware of the engine: read from the resolved location, set through useNavigate */
const useSearchParams = (
  defaultInit?: URLSearchParamsInit,
): [URLSearchParams, SetURLSearchParams] => {
  /* The default params, whether the params were set, the search and navigate */
  const [defaultSearchParams] = useState(() => createSearchParams(defaultInit));
  const [hasSetSearchParams, setHasSetSearchParams] = useState(false);
  const { search } = useLocation();
  const navigate = useNavigate();

  /* The search params, with the defaults added */
  const searchParams = useMemo(() => {
    /* The params in the search */
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

    /* The params with any defaults */
    return params;
  }, [search, defaultSearchParams, hasSetSearchParams]);

  /* The setter of the search params */
  const setSearchParams = useCallback<SetURLSearchParams>(
    (nextInit, navigateOptions) => {
      /* The next params, from a value or a function of the current ones */
      const nextSearchParams = createSearchParams(
        typeof nextInit === "function"
          ? nextInit(new URLSearchParams(searchParams))
          : nextInit,
      );

      /* Stop applying the defaults, then navigate to the new search */
      setHasSetSearchParams(true);
      navigate("?" + nextSearchParams, navigateOptions);
    },
    [navigate, searchParams],
  );

  /* The search params and their setter */
  return [searchParams, setSearchParams];
};

export { useSearchParams };
