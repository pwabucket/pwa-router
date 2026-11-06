import { describe, expect, it } from "vitest";
import { readEntry } from "../legacy";
import { ROUTER_RECORD, createRecord } from "../record";

describe("readEntry", () => {
  it("reads a record written by this version as it is", () => {
    const record = createRecord();
    const state = { a: 1, [ROUTER_RECORD]: record };

    expect(readEntry(state)).toEqual({ state, record });
  });

  it("converts 0.0.25 flags and drops its keys", () => {
    const { state, record } = readEntry({
      dialog: true,
      panel: true,
      plain: "x",
      __router_ephemeral_keys: { dialog: null },
      __router_non_inherited_keys: ["panel"],
      __router_index_dialog: 2,
    });

    expect(state).toEqual({ dialog: true, panel: true, plain: "x" });
    expect(record.values).toEqual({
      dialog: { area: "root", persist: false, inherit: true },
      panel: { area: "root", persist: true, inherit: false },
    });
  });

  it("gives app-only state an empty record", () => {
    expect(readEntry({ from: "/x" }).record).toEqual(createRecord());
    expect(readEntry(null).state).toEqual({});
  });
});
