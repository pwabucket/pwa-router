import { createContext } from "react";
import type { UseLocationStateOptions } from "../hooks/useSetLocationState";

/** Default options for every location state value inside a section */
type LocationStateDefaults = Pick<
  UseLocationStateOptions,
  "persist" | "inherit"
>;

/** Internal: the defaults set by the nearest LocationStateDefaultsProvider */
const LocationStateDefaultsContext = createContext<LocationStateDefaults>({});

export { LocationStateDefaultsContext };
export type { LocationStateDefaults };
