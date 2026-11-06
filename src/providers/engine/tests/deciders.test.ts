import { NavigationType, type Location } from "react-router";
import { describe, expect, it, vi } from "vitest";
import {
  ROUTER_RECORD,
  createArea,
  createRecord,
} from "../../../core/record";
import { LeaveGuardRegistry } from "../../../utils/leaveGuards";
import { createGuardDecider } from "../deciders/guardDecider";
import type { UserMove } from "../deciders/types";
import { virtualStepDecider } from "../deciders/virtualStepDecider";

/** A location at a path, with state */
const at = (pathname: string, state: unknown = null) =>
  ({ pathname, search: "", hash: "", state, key: pathname }) as Location;

/** A back move from one location to another */
const back = (from: Location, to: Location): UserMove => ({
  from,
  to,
  type: NavigationType.Pop,
  index: 0,
  delta: -1,
});

describe("guard decider", () => {
  it("undoes a move leaving an active guard, then asks its question", () => {
    const guards = new LeaveGuardRegistry();
    guards.set("g", { pathname: "/edit", when: true });
    const decision = createGuardDecider(guards)(back(at("/edit"), at("/")));

    expect(decision?.undo).toBe("traverse");

    decision?.onUndo?.();
    decision?.onLanded(vi.fn());
    expect(guards.takePendingQuestion()).toBe("g");
    expect(guards.takeAttempt()).toEqual({
      kind: "pop",
      guardId: "g",
      targetIndex: 0,
    });
  });

  it("restores the entry after a replace", () => {
    const guards = new LeaveGuardRegistry();
    guards.set("g", { pathname: "/edit", when: true });
    const move = {
      ...back(at("/edit"), at("/")),
      type: NavigationType.Replace,
    };

    expect(createGuardDecider(guards)(move)?.undo).toBe("restore");
  });

  it("lets moves through with nothing unsaved", () => {
    const guards = new LeaveGuardRegistry();
    guards.set("g", { pathname: "/edit", when: false });

    expect(createGuardDecider(guards)(back(at("/edit"), at("/")))).toBe(
      undefined,
    );
  });
});

describe("virtual step decider", () => {
  /** A restored tab entry with one virtual step below */
  const restored = at("/search/results", {
    [ROUTER_RECORD]: {
      values: {},
      areas: [
        createRecord().areas[0],
        {
          ...createArea("main", "search", 1, 0),
          steps: [
            {
              id: "search",
              kind: "page",
              position: null,
              snapshot: {
                pathname: "/search",
                search: "",
                hash: "",
                values: {},
                record: { values: {}, areas: [] },
              },
            },
            { id: "results", kind: "page", position: 4 },
          ],
        },
      ],
    },
  });

  it("undoes a back out of a restored entry, then shows the page below", () => {
    const decision = virtualStepDecider(back(restored, at("/")));
    expect(decision?.undo).toBe("traverse");

    const navigate = vi.fn();
    decision?.onLanded(navigate);
    expect(navigate).toHaveBeenCalledWith(
      { pathname: "/search", search: "", hash: "" },
      expect.objectContaining({ replace: true }),
    );
  });

  it("lets other moves through", () => {
    expect(virtualStepDecider(back(at("/a"), at("/")))).toBeUndefined();
    expect(
      virtualStepDecider({ ...back(restored, at("/")), delta: -2 }),
    ).toBeUndefined();
  });
});
