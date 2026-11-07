import type { Location } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { RoutingStore } from "../RoutingStore";

/** A view at a path */
const viewAt = (pathname: string) => ({
  resolvedLocation: { pathname } as Location,
  isCorrecting: false,
  isInactive: false,
});

describe("RoutingStore", () => {
  it("shows a written view at once, and tells subscribers only on publish", () => {
    const store = new RoutingStore(viewAt("/a"));
    const listener = vi.fn();
    store.subscribe(listener);

    /* Written: read at once, not yet published */
    const next = viewAt("/b");
    store.write(next);
    expect(store.getView()).toBe(next);
    expect(listener).not.toHaveBeenCalled();

    /* Published once; publishing the same view again tells no one */
    store.publish();
    store.publish();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("stops telling a subscriber once it unsubscribes", () => {
    const store = new RoutingStore(viewAt("/a"));
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.write(viewAt("/b"));
    store.publish();
    expect(listener).not.toHaveBeenCalled();
  });
});
