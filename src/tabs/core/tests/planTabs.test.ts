import type { Location } from "react-router";
import { describe, expect, it } from "vitest";
import {
  adoptTabs,
  isDefaultCollapsed,
  planBackfill,
  planTabsOp,
  popToStep,
} from "../planTabs";
import {
  ROUTER_RECORD,
  createArea,
  createRecord,
  readRecord,
  type AreaRecord,
  type StepRecord,
} from "../../../engine/core/record";
import { matchTab, type TabsConfig } from "../tabs";
import { stepIds } from "../../../engine/core/tests/helpers";

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

/** A layer step at a position */
const layer = (id: string, position: number): StepRecord => ({
  id,
  kind: "layer",
  position,
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

describe("a restored area's default tab", () => {
  /** An area restored into the entry at 7, on search, with home saved */
  const restored = {
    ...createArea("main", "search", 7, 2, "home"),
    steps: [page("search", 7)],
    saved: { home: [page("feed", null), page("post", null)] },
  };

  it("is collapsed when the area starts at the active tab's entry", () => {
    expect(isDefaultCollapsed(restored, 7)).toBe(true);
    expect(isDefaultCollapsed({ ...restored, start: 3 }, 7)).toBe(false);
  });

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
  /** Tabs sharing the address of the page they're on */
  const layout: TabsConfig = {
    id: "main",
    defaultTab: "canvas",
    tabs: [{ id: "canvas" }, { id: "items" }, { id: "settings", root: "/s" }],
  };

  /** The area opened on /layout?doc=5, on the given tab */
  const opened = (active: string, steps: StepRecord[]) => ({
    ...createArea("main", active, 1, 0, "canvas"),
    address: { pathname: "/layout", search: "?doc=5", hash: "" },
    steps,
  });

  /** An entry on /layout?doc=5 */
  const layoutEntry = (area: AreaRecord) => {
    const tabEntry = entry("/layout", area);
    tabEntry.location.search = "?doc=5";
    return tabEntry;
  };

  it("never match an address", () => {
    expect(matchTab(layout, "/layout")).toBe("canvas");
    expect(matchTab(layout, "/s/deep")).toBe("settings");
  });

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

  it("put nothing under a first entry when the default has no root", () => {
    const backfill = planBackfill(
      layout,
      layoutEntry(opened("canvas", [page("canvas", 1, "/layout")])),
      stepIds(),
    );

    expect(backfill).toBeNull();
  });
});
