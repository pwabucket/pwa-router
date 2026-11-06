import type { Location } from "react-router";

type LocationState = Record<string, unknown> | null | undefined;

/** Path of a location without its state, for navigating to the same place */
export const getLocationPath = ({ pathname, search, hash }: Location) => ({
  pathname,
  search,
  hash,
});

export type { LocationState };
