import { NavigationType, type Location } from "react-router";
import { vi } from "vitest";
import type { Moves } from "../driver/HistoryDriver";
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

/** Driver moves that record what they were asked to do, landing at once */
export const fakeMoves = () => {
  const lands = async () => at("/landed");
  return {
    go: vi.fn(lands),
    push: vi.fn(lands),
    replace: vi.fn(lands),
    write: vi.fn(lands),
  } satisfies Moves;
};
