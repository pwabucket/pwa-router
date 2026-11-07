import { describe, expect, it } from "vitest";
import {
  planChanges,
  positionPushedStep,
  type ValueChange,
} from "../planChanges";
import { ROUTER_RECORD } from "../../../../constants";
import { createRecord, readRecord } from "../record";
import {
  pushedValue,
  rootRecord,
  step,
  stepIds,
  tabArea,
} from "./helpers";

/** A change with default flags */
const change = (
  key: string,
  value: unknown,
  overrides: Partial<ValueChange> = {},
): ValueChange => ({
  key,
  value,
  persist: true,
  inherit: true,
  replace: false,
  ...overrides,
});

/** A plan entry from app values and a record */
const entry = (
  values: Record<string, unknown>,
  record = createRecord(),
) => ({
  key: "k",
  address: { pathname: "/p", search: "", hash: "" },
  state: { ...values, [ROUTER_RECORD]: record },
  record,
});

describe("planChanges", () => {
  it("does nothing for values the entry already has", () => {
    expect(planChanges(entry({ a: 1 }), [change("a", 1)], stepIds())).toEqual({
      kind: "none",
    });
  });

  it("pushes an opened value onto a new step, positioned once it lands", () => {
    const plan = planChanges(entry({}), [change("dialog", true)], stepIds());

    expect(plan).toMatchObject({
      kind: "write",
      replace: false,
      position: { area: "root", step: "s1" },
    });
    if (plan.kind !== "write") return;

    const record = readRecord(plan.state)!;
    expect(plan.state.dialog).toBe(true);
    expect(record.values.dialog).toMatchObject({ first: "s1", latest: "s1" });
    expect(record.areas[0].steps).toEqual([step("s1", null)]);

    /* Positioned with the history length once pushed */
    const positioned = positionPushedStep(
      plan.state,
      record,
      plan.position!,
      4,
    );
    expect(readRecord(positioned)!.areas[0].steps[0].position).toBe(4);
  });

  it("keeps the first push when a value is pushed again", () => {
    const record = rootRecord([step("a", 3)], { step: pushedValue("a") });
    const plan = planChanges(
      entry({ step: 1 }, record),
      [change("step", 2)],
      stepIds(),
    );

    if (plan.kind !== "write") throw new Error("expected a write");
    expect(readRecord(plan.state)!.values.step).toMatchObject({
      first: "a",
      latest: "s1",
    });
  });

  it("closes a cleared value before its latest push", () => {
    const record = rootRecord([step("a", 3), step("b", 5)], {
      step: pushedValue("a", "b"),
    });
    const plan = planChanges(
      entry({ step: 2 }, record),
      [change("step", undefined)],
      stepIds(),
    );

    expect(plan).toEqual({
      kind: "close",
      keys: ["step"],
      target: { kind: "land", before: 5 },
      followUps: [],
    });
  });

  it("closes the lowest of several, so everything above closes too", () => {
    const record = rootRecord([step("a", 3), step("b", 5)], {
      outer: pushedValue("a"),
      inner: pushedValue("b"),
    });
    const plan = planChanges(
      entry({ outer: true, inner: true }, record),
      [change("inner", undefined), change("outer", undefined)],
      stepIds(),
    );

    expect(plan).toMatchObject({ target: { kind: "land", before: 3 } });
  });

  it("closes first and applies the other changes where it lands", () => {
    const record = rootRecord([step("a", 3)], { menu: pushedValue("a") });
    const open = change("dialog", true);
    const plan = planChanges(
      entry({ menu: true }, record),
      [change("menu", undefined), open],
      stepIds(),
    );

    expect(plan).toMatchObject({ kind: "close", followUps: [open] });
  });

  it("writes an in-place value without a step", () => {
    const plan = planChanges(
      entry({}),
      [change("search", "cats", { replace: true })],
      stepIds(),
    );

    if (plan.kind !== "write") throw new Error("expected a write");
    expect(plan.replace).toBe(true);
    expect(readRecord(plan.state)!.values.search).toEqual({
      area: "root",
      first: undefined,
      latest: undefined,
      persist: true,
      inherit: true,
    });
    expect(readRecord(plan.state)!.areas[0].steps).toEqual([]);
  });

  it("writes in-place values on the current entry before pushing", () => {
    const plan = planChanges(
      entry({}),
      [change("search", "cats", { replace: true }), change("dialog", true)],
      stepIds(),
    );

    if (plan.kind !== "write") throw new Error("expected a write");
    expect(plan.inPlaceState?.search).toBe("cats");
    expect(plan.inPlaceState?.dialog).toBeUndefined();
    expect(plan.state).toMatchObject({ search: "cats", dialog: true });
  });

  it("swaps a non-inherited value's entry for the pushed one", () => {
    const record = rootRecord([step("m", 4)], {
      menu: { ...pushedValue("m"), inherit: false },
    });
    const plan = planChanges(
      entry({ menu: true }, record),
      [change("dialog", true)],
      stepIds(),
    );

    if (plan.kind !== "write") throw new Error("expected a write");
    const pushed = readRecord(plan.state)!;
    expect(plan.replace).toBe(true);
    expect(plan.state.menu).toBeUndefined();
    expect(pushed.values.dialog).toMatchObject({ first: "m", latest: "m" });
    expect(pushed.areas[0].steps).toEqual([step("m", 4)]);
  });

  it("writes on the value's own entry, closing what's above it first", () => {
    const record = rootRecord([step("t", 3), step("d", 4)], {
      tab: pushedValue("t"),
      dialog: pushedValue("d"),
    });
    const select = change("tab", "settings", {
      replace: true,
      options: { onOwnEntry: true },
    });
    const plan = planChanges(
      entry({ tab: "details", dialog: true }, record),
      [select],
      stepIds(),
    );

    /* Land on the tab's entry, then replace the tab there */
    expect(plan).toMatchObject({
      kind: "close",
      target: { kind: "land", before: 4 },
      followUps: [{ key: "tab", options: { onOwnEntry: false } }],
    });
  });

  it("keeps public markers passed in options.state", () => {
    const plan = planChanges(
      entry({}),
      [
        change("selected", 7, {
          replace: true,
          options: { state: { __router_from_position: -1 } },
        }),
      ],
      stepIds(),
    );

    if (plan.kind !== "write") throw new Error("expected a write");
    expect(plan.state.__router_from_position).toBe(-1);
  });

  it("keeps the engine's other keys on the entries it writes", () => {
    const plan = planChanges(
      entry({ __router_tabs: { active: "search" }, __router_guard: "g" }),
      [change("dialog", true)],
      stepIds(),
    );

    if (plan.kind !== "write") throw new Error("expected a write");
    expect(plan.state.__router_tabs).toEqual({ active: "search" });
    expect(plan.state.__router_guard).toBe("g");
  });

  it("drops the record of a value unset through options.state", () => {
    const record = rootRecord([step("a", 3)], { dialog: pushedValue("a") });
    const plan = planChanges(
      entry({ dialog: true }, record),
      [
        change("selected", 1, {
          replace: true,
          options: { state: { dialog: null } },
        }),
      ],
      stepIds(),
    );

    if (plan.kind !== "write") throw new Error("expected a write");
    const written = readRecord(plan.state)!;
    expect(written.values.dialog).toBeUndefined();
    expect(written.areas[0].steps).toEqual([]);
  });

  it("snapshots the step below a push in a tab area", () => {
    const record = {
      ...createRecord(),
      values: {
        item: { ...pushedValue("a"), area: "tabs" },
        popup: { ...pushedValue("a"), area: "tabs", persist: false },
      },
      areas: [
        createRecord().areas[0],
        tabArea([step("p", 1, "page"), step("a", 2)]),
      ],
    };
    const plan = planChanges(
      entry({ item: 4, popup: true }, record),
      [change("panel", true)],
      stepIds(),
    );

    if (plan.kind !== "write") throw new Error("expected a write");
    const [page, below, pushed] = readRecord(plan.state)!.areas[1].steps;

    /* Only the step below keeps the entry, without its dropped values */
    expect(page.snapshot).toBeUndefined();
    expect(below.snapshot).toMatchObject({
      pathname: "/p",
      values: { item: 4 },
    });
    expect(Object.keys(below.snapshot!.record.values)).toEqual(["item"]);
    expect(pushed).toEqual(step("s1", null));
  });

  it("keeps no snapshot for a push in the root area", () => {
    const record = rootRecord([step("a", 3)], { dialog: pushedValue("a") });
    const plan = planChanges(
      entry({ dialog: true }, record),
      [change("panel", true)],
      stepIds(),
    );

    if (plan.kind !== "write") throw new Error("expected a write");
    expect(readRecord(plan.state)!.areas[0].steps[0].snapshot).toBeUndefined();
  });

  it("closes several restored values onto the lowest virtual step", () => {
    const tabValue = (latest: string) => ({
      ...pushedValue(latest),
      area: "tabs",
    });
    const record = {
      ...createRecord(),
      values: { item: tabValue("item"), options: tabValue("options") },
      areas: [
        createRecord().areas[0],
        tabArea([
          step("list", null, "page"),
          step("item", null),
          step("options", 5),
        ]),
      ],
    };
    const plan = planChanges(
      entry({ item: 4, options: true }, record),
      [change("options", undefined), change("item", undefined)],
      stepIds(),
    );

    expect(plan).toMatchObject({
      kind: "close",
      keys: ["options", "item"],
      target: { kind: "virtualPop", step: { id: "list" } },
    });
  });
});
