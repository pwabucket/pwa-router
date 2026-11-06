import { describe, expect, it } from "vitest";
import { stepIds } from "../../../engine/core/tests/helpers";
import { planBackfill } from "../planBackfill";
import { layout, layoutEntry, opened, page } from "./helpers";

describe("tabs without a root", () => {
  it("put nothing under a first entry when the default has no root", () => {
    const backfill = planBackfill(
      layout,
      layoutEntry(opened("canvas", [page("canvas", 1, "/layout")])),
      stepIds(),
    );

    expect(backfill).toBeNull();
  });
});
