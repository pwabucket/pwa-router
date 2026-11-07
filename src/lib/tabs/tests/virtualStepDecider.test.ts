import { describe, expect, it } from "vitest";
import { ROUTER_RECORD } from "../../../constants";
import { createArea, createRecord } from "../../engine/core/record";
import { at, back } from "../../engine/tests/moves";
import { createVirtualStepDecider } from "../virtualStepDecider";

/** The decider with the test's area mounted */
const virtualStepDecider = createVirtualStepDecider(new Set(["main"]));

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

    expect(decision?.landedMove?.()).toEqual({
      kind: "replace",
      to: { pathname: "/search", search: "", hash: "" },
      state: expect.anything(),
    });
  });

  it("lets a back through when the area's TabsRoot isn't mounted", () => {
    const unmounted = createVirtualStepDecider(new Set());
    expect(unmounted(back(restored, at("/")))).toBeUndefined();
  });

  it("lets other moves through", () => {
    expect(virtualStepDecider(back(at("/a"), at("/")))).toBeUndefined();
    expect(
      virtualStepDecider({ ...back(restored, at("/")), delta: -2 }),
    ).toBeUndefined();
  });
});
