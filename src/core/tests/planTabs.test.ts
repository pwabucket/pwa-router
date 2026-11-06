import type { Location } from "react-router";
import { describe, expect, it } from "vitest";
import { adoptTabs, planTabsOp, popToStep } from "../planTabs";
import {
  ROUTER_RECORD,
  createArea,
  createRecord,
  readRecord,
  type AreaRecord,
  type StepRecord,
} from "../record";
import type { TabsConfig } from "../tabs";
import { stepIds } from "./helpers";

/** The tabbed area of the tests */
const config: TabsConfig = {
  id: "main",
  defaultTab: "home",
  tabs: [
    { id: "home", root: "/" },
    { id: "search", root: "/search" },
  ],
};

/** A page step, real at a position or virtual */
const page = (
  id: string,
  position: number | null,
  pathname = `/${id}`,
): StepRecord => ({
  id,
  kind: "page",
  position,
  snapshot: {
    pathname,
    search: "",
    hash: "",
    values: {},
    record: { values: {}, areas: [] },
  },
});

/** A tab entry: its location, record and area */
const entry = (pathname: string, area: AreaRecord) => {
  const record = { ...createRecord(), areas: [createRecord().areas[0], area] };
  const location = {
    pathname,
    search: "",
    hash: "",
    key: "k",
    state: { [ROUTER_RECORD]: record },
  } as Location;
  return { location, record, area };
};

/** An empty memory */
const memory = { version: 0, saved: {} };

describe("planTabsOp", () => {
  it("switches with one push, keeping lower pages virtual", () => {
    const area = {
      ...createArea("main", "home", 1, 0),
      steps: [page("feed", 1)],
    };
    const saved = { search: [page("search", 3), page("results", 4)] };
    const plan = planTabsOp(
      { kind: "select", tab: "search" },
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

  it("closes the slot to return to the default tab", () => {
    const area = {
      ...createArea("main", "search", 1, 0),
      steps: [page("search", 3), page("results", 4)],
    };
    const plan = planTabsOp(
      { kind: "select", tab: "home" },
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
      { kind: "popToRoot" },
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
