import { describe, expect, it } from "vitest";
import { ROOT_AREA, createRecord } from "../record";
import {
  collapseSnapshot,
  collapseSteps,
  findCloseTarget,
  pruneSteps,
  snapshotStep,
} from "../steps";
import { pushedValue, rootRecord, step, tabArea } from "./helpers";

describe("findCloseTarget", () => {
  it("goes back one entry for a value with no record", () => {
    expect(findCloseTarget(createRecord(), "dialog", false)).toEqual({
      kind: "back",
    });
  });

  it("lands before the latest push, or the first with toStart", () => {
    const record = rootRecord([step("a", 3), step("b", 5)], {
      steps: pushedValue("a", "b"),
    });

    expect(findCloseTarget(record, "steps", false)).toEqual({
      kind: "land",
      before: 5,
    });
    expect(findCloseTarget(record, "steps", true)).toEqual({
      kind: "land",
      before: 3,
    });
  });

  it("pops to the virtual step below, in the tab's lowest real entry", () => {
    const area = tabArea([step("v1", null), step("v2", null), step("r", 10)]);
    const record = {
      ...createRecord(),
      areas: [createRecord().areas[0], area],
      values: { panel: { ...pushedValue("r"), area: "tabs" } },
    };

    expect(findCloseTarget(record, "panel", false)).toEqual({
      kind: "virtualPop",
      area: "tabs",
      step: step("v2", null),
      landBefore: null,
      position: 10,
    });
  });

  it("lands on the lowest real entry first when entries sit above it", () => {
    const area = tabArea([step("v", null), step("r1", 10), step("r2", 11)]);
    const record = {
      ...createRecord(),
      areas: [createRecord().areas[0], area],
      values: { panel: { ...pushedValue("r1"), area: "tabs" } },
    };

    expect(findCloseTarget(record, "panel", false)).toMatchObject({
      kind: "virtualPop",
      step: { id: "v" },
      landBefore: 11,
      position: 10,
    });
  });

  it("leaves the tab for a value pushed on its virtual lowest step", () => {
    const area = tabArea([step("v", null), step("r", 10)]);
    const record = {
      ...createRecord(),
      areas: [createRecord().areas[0], area],
      values: { panel: { ...pushedValue("v"), area: "tabs" } },
    };

    expect(findCloseTarget(record, "panel", false)).toEqual({
      kind: "land",
      before: 10,
    });
  });
});

describe("collapse", () => {
  it("gives the top step the entry and makes the rest virtual", () => {
    const steps = collapseSteps([step("a", 3), step("b", 4), step("c", 5)], 9);

    expect(steps.map((candidate) => candidate.position)).toEqual([
      null,
      null,
      9,
    ]);
  });

  it("collapses the areas inside a restored step, every level", () => {
    const inner = tabArea([step("a", 5), step("b", 6)], {
      id: "inner",
      saved: { other: [step("c", 3)] },
    });
    const snapshot = {
      pathname: "/x",
      search: "",
      hash: "",
      values: {},
      record: { values: {}, areas: [inner] },
    };

    const [area] = collapseSnapshot(snapshot, 12).areas;
    expect(area.steps.map((candidate) => candidate.position)).toEqual([
      null,
      12,
    ]);
    expect(area.saved.other[0].position).toBeNull();
    expect(area.start).toBe(12);
  });
});

describe("snapshotStep", () => {
  it("keeps in-place and unrecorded values, and the areas inside", () => {
    const inner = tabArea([], { id: "inner" });
    const record = {
      values: {
        dialog: pushedValue("a"),
        query: { area: ROOT_AREA, persist: true, inherit: true },
      },
      areas: [{ ...createRecord().areas[0], id: "outer" }, inner],
    };
    const state = { dialog: true, query: "cats", note: "x" };

    const snapshot = snapshotStep(
      { pathname: "/p", search: "", hash: "" },
      state,
      record,
      "outer",
    );

    expect(snapshot.values).toEqual({ query: "cats", note: "x" });
    expect(Object.keys(snapshot.record.values)).toEqual(["query"]);
    expect(snapshot.record.areas).toEqual([inner]);
  });
});

describe("pruneSteps", () => {
  it("keeps page steps and the layer steps values point at", () => {
    const area = {
      ...createRecord().areas[0],
      steps: [step("p", 1, "page"), step("a", 2), step("b", 3)],
    };

    const pruned = pruneSteps(area, { dialog: pushedValue("b") });
    expect(pruned.steps.map((candidate) => candidate.id)).toEqual(["p", "b"]);
  });
});
