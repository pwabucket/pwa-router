import { describe, expect, it } from "vitest";
import { matchTab } from "../tabs";
import { layout } from "./helpers";

describe("tabs without a root", () => {
  it("never match an address", () => {
    expect(matchTab(layout, "/layout")).toBe("canvas");
    expect(matchTab(layout, "/s/deep")).toBe("settings");
  });
});
