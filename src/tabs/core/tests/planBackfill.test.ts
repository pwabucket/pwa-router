import { describe, expect, it } from "vitest";
import { createArea } from "../../../engine/core/record";
import { stepIds } from "../../../engine/core/tests/helpers";
import { planBackfill } from "../planBackfill";
import { config, entry, layout, layoutEntry, opened, page } from "./helpers";

/** The app first opened on search results */
const openedOnResults = () =>
  entry("/search/results", {
    ...createArea("main", "search", 1, 0, "home"),
    steps: [page("results", 1, "/search/results")],
  });

describe("planBackfill", () => {
  it("puts the default root and the tab's root under a first entry", () => {
    const backfill = planBackfill(config, openedOnResults(), stepIds());

    expect(backfill?.map((write) => write.to.pathname)).toEqual([
      "/",
      "/search",
      "/search/results",
    ]);
  });

  it("puts nothing under it when turned off", () => {
    const backfill = planBackfill(
      { ...config, deepLinkRoots: false },
      openedOnResults(),
      stepIds(),
    );

    expect(backfill).toBeNull();
  });
});

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
