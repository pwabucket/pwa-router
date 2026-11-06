import { describe, expect, it } from "vitest";
import { matchTab, type TabsConfig } from "../tabs";
import { layout } from "./helpers";

/** Tabs with nested roots, one written with a trailing slash */
const nested: TabsConfig = {
  id: "main",
  defaultTab: "home",
  deepLinkRoots: true,
  tabs: [
    { id: "home", root: "/" },
    { id: "search", root: "/search/" },
    { id: "saved", root: "/search/saved" },
  ],
};

describe("matchTab", () => {
  it("picks the tab with the longest root the address starts with", () => {
    expect(matchTab(nested, "/search/results")).toBe("search");
    expect(matchTab(nested, "/search/saved/3")).toBe("saved");
    expect(matchTab(nested, "/post/1")).toBe("home");
  });

  it("matches whole segments, with or without a trailing slash", () => {
    expect(matchTab(nested, "/search")).toBe("search");
    expect(matchTab(nested, "/search/")).toBe("search");
    expect(matchTab(nested, "/searching")).toBe("home");
  });

  it("ignores case, like React Router's routes", () => {
    expect(matchTab(nested, "/Search/Results")).toBe("search");
  });
});

describe("tabs without a root", () => {
  it("never match an address", () => {
    expect(matchTab(layout, "/layout")).toBe("canvas");
    expect(matchTab(layout, "/s/deep")).toBe("settings");
  });
});
