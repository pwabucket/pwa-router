import type { Location } from "react-router";
import { describe, expect, it } from "vitest";
import { createArea, createRecord } from "../../../engine/core/record";
import { stepIds } from "../../../engine/core/tests/helpers";
import { adoptTabs } from "../adoptAreas";
import { config, entry, layout, layoutEntry, memory, opened } from "./helpers";

describe("adoptTabs", () => {
  it("records a pushed page above the previous one, snapshotted", () => {
    const previous = entry("/feed", {
      ...createArea("main", "home", 1, 0),
      steps: [{ id: "feed", kind: "page", position: 1 }],
    });
    const area = adoptTabs(
      config,
      previous,
      {
        pathname: "/post",
        search: "",
        hash: "",
        key: "n",
        state: null,
      } as Location,
      createRecord(),
      "PUSH",
      memory,
      2,
      1,
      stepIds(),
    );

    expect(area.steps.map((step) => [step.id, step.position])).toEqual([
      ["feed", 1],
      ["s1", 2],
    ]);
    expect(area.steps[0].snapshot?.pathname).toBe("/feed");
  });
});

describe("tabs without a root", () => {
  it("record the address a new area opens on", () => {
    const area = adoptTabs(
      layout,
      null,
      { ...layoutEntry(opened("canvas", [])).location, state: null },
      createRecord(),
      "PUSH",
      memory,
      1,
      0,
      stepIds(),
    );

    expect(area.active).toBe("canvas");
    expect(area.address).toEqual({
      pathname: "/layout",
      search: "?doc=5",
      hash: "",
    });
  });
});
