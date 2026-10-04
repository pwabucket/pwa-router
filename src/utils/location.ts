import type { Location } from "react-router";
import { ROUTER_INDEX_PREFIX } from "../constants";

type LocationState = Record<string, unknown> | null | undefined;

/** Path of a location without its state, for navigating to the same place */
export const getLocationPath = ({ pathname, search, hash }: Location) => ({
  pathname,
  search,
  hash,
});

/** History index stamped by useLocationIndexUpdater under the given key */
export const readLocationIndex = (
  state: LocationState,
  indexKey?: string | null,
) =>
  indexKey != null
    ? (state?.[ROUTER_INDEX_PREFIX + indexKey] as number | undefined)
    : undefined;

export type { LocationState };
