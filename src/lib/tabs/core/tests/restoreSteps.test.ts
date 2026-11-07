import { describe, expect, it } from "vitest";
import { createArea, readRecord } from "../../../engine/core/record";
import { isDefaultCollapsed, popToStep } from "../restoreSteps";
import { entry, page, restored } from "./helpers";

describe("popToStep", () => {
  it("shows a step in the entry, keeping the steps below", () => {
    const area = {
      ...createArea("main", "search", 1, 0),
      steps: [page("search", null), page("results", null), page("photo", 6)],
    };
    const state = popToStep(area, entry("/photo", area).record, "results", 6);

    expect(readRecord(state)!.areas[1].steps).toEqual([
      page("search", null),
      { id: "results", kind: "page", position: 6 },
    ]);
  });
});

describe("a restored area's default tab", () => {
  it("is collapsed when the area starts at the active tab's entry", () => {
    expect(isDefaultCollapsed(restored, 7)).toBe(true);
    expect(isDefaultCollapsed({ ...restored, start: 3 }, 7)).toBe(false);
  });
});
