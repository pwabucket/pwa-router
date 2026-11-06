import { describe, expect, it, vi } from "vitest";
import {
  ROUTER_RECORD,
  createArea,
  createRecord,
} from "../../engine/core/record";
import { at, back } from "../../engine/tests/moves";
import { virtualStepDecider } from "../virtualStepDecider";

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
