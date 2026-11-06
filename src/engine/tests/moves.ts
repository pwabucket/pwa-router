import { NavigationType, type Location } from "react-router";
import type { UserMove } from "../moveDeciders";

/** A location at a path, with state */
export const at = (pathname: string, state: unknown = null) =>
  ({ pathname, search: "", hash: "", state, key: pathname }) as Location;

/** A back move from one location to another */
export const back = (from: Location, to: Location): UserMove => ({
  from,
  to,
  type: NavigationType.Pop,
  index: 0,
  delta: -1,
});
