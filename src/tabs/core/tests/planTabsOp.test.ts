import { describe, expect, it } from "vitest";
import { createArea, readRecord } from "../../../engine/core/record";
import { stepIds } from "../../../engine/core/tests/helpers";
import { planTabsOp } from "../planTabsOp";
import {
  config,
  entry,
  layer,
  layout,
  layoutEntry,
  memory,
  opened,
  page,
  restored,
} from "./helpers";

describe("planTabsOp", () => {
  it("switches with one push, keeping lower pages virtual", () => {
    const area = {
      ...createArea("main", "home", 1, 0),
      steps: [page("feed", 1)],
    };
    const saved = { search: [page("search", 3), page("results", 4)] };
    const plan = planTabsOp(
      { kind: "select", area: "main", tab: "search" },
      config,
      entry("/feed", area),
      { version: 2, saved },
      stepIds(),
    );

    /* No close: home's page stays below */
    expect(plan?.landing).toBeUndefined();
    expect(plan?.write?.to).toEqual({
      pathname: "/results",
      search: "",
      hash: "",
    });

    /* Pushed at position 9: the top page takes it, the rest are virtual */
    const written = readRecord(plan!.write!.buildState(9))!;
    const searchArea = written.areas[1];
    expect(searchArea.active).toBe("search");
    expect(searchArea.steps.map((step) => step.position)).toEqual([null, 9]);
    expect(searchArea.saved.home[0].snapshot?.pathname).toBe("/feed");
    expect(searchArea.savedVersion).toBe(3);
  });
  it("leaves the default tab's kept layers below, closing the dropped ones", () => {
    const panel = {
      area: "main",
      first: "a",
      latest: "a",
      persist: true,
      inherit: true,
    };
    const popup = { ...panel, first: "b", latest: "b", persist: false };

    /* The panel's step was snapshotted when the popup was pushed above it */
    const panelStep = {
      ...layer("a", 2),
      snapshot: {
        ...page("feed", 1).snapshot!,
        values: { panel: true },
        record: { values: { panel }, areas: [] },
      },
    };
    const area = {
      ...createArea("main", "home", 1, 0),
      steps: [page("feed", 1), panelStep, layer("b", 3)],
    };
    const tabEntry = entry("/feed", area);
    tabEntry.record.values = { panel, popup };
    tabEntry.location.state = {
      ...(tabEntry.location.state as object),
      panel: true,
      popup: true,
    };

    const plan = planTabsOp(
      { kind: "select", area: "main", tab: "search" },
      config,
      tabEntry,
      memory,
      stepIds(),
    );

    /* Land before the popup's push; the panel stays below */
    expect(plan?.landing).toBe(3);

    /* Home is saved with its panel step, without the popup's */
    const written = readRecord(plan!.write!.buildState(9))!;
    expect(written.areas[1].saved.home.map((step) => step.id)).toEqual([
      "feed",
      "a",
    ]);
  });
  it("closes the slot to return to the default tab", () => {
    const area = {
      ...createArea("main", "search", 1, 0),
      steps: [page("search", 3), page("results", 4)],
    };
    const plan = planTabsOp(
      { kind: "select", area: "main", tab: "home" },
      config,
      entry("/results", area),
      memory,
      stepIds(),
    );

    expect(plan).toEqual({ landing: 3 });
  });
  it("pops to the tab's first entry and makes it the root", () => {
    const area = {
      ...createArea("main", "search", 1, 0),
      steps: [page("search", 3), page("results", 4)],
    };
    const plan = planTabsOp(
      { kind: "popToRoot", area: "main" },
      config,
      entry("/results", area),
      memory,
      stepIds(),
    );

    expect(plan?.landing).toBe(4);
    expect(plan?.write?.stamp).toBe(3);
    const written = readRecord(plan!.write!.buildState(3))!;
    expect(written.areas[1].steps).toEqual([
      { id: "s1", kind: "page", position: 3 },
    ]);
  });
});

describe("a restored area's default tab", () => {
  it("is shown in the same entry when selected, its pages kept virtual", () => {
    const plan = planTabsOp(
      { kind: "select", area: "main", tab: "home" },
      config,
      entry("/search", restored),
      memory,
      stepIds(),
    );

    expect(plan?.landing).toBeUndefined();
    expect(plan?.write).toMatchObject({ replace: true, stamp: 7 });

    const area = readRecord(plan!.write!.buildState(7))!.areas[1];
    expect(area.active).toBe("home");
    expect(area.steps.map((step) => [step.id, step.position])).toEqual([
      ["feed", null],
      ["post", 7],
    ]);
    expect(area.saved.search[0].snapshot?.pathname).toBe("/search");
  });
});

describe("tabs without a root", () => {
  it("start on the area's address when first selected", () => {
    const plan = planTabsOp(
      { kind: "select", area: "main", tab: "items" },
      layout,
      layoutEntry(opened("canvas", [page("canvas", 1, "/layout")])),
      memory,
      stepIds(),
    );

    expect(plan?.write?.to).toEqual({
      pathname: "/layout",
      search: "?doc=5",
      hash: "",
    });
    expect(readRecord(plan!.write!.buildState(2))!.areas[1].active).toBe(
      "items",
    );
  });

  it("are already on their root on the area's address", () => {
    const plan = planTabsOp(
      { kind: "popToRoot", area: "main" },
      layout,
      layoutEntry(opened("canvas", [page("canvas", 1, "/layout")])),
      memory,
      stepIds(),
    );

    expect(plan).toBeNull();
  });
});
