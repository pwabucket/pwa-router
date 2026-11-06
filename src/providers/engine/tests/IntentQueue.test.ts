import { describe, expect, it } from "vitest";
import type { ValueChange } from "../../../core/planChanges";
import type { TabsWrite } from "../../../core/planTabs";
import { IntentQueue } from "../IntentQueue";

/** A change with default flags */
const change = (key: string, value: unknown): ValueChange => ({
  key,
  value,
  persist: true,
  inherit: true,
  replace: false,
});

/** A tab write */
const write: TabsWrite = {
  to: "/x",
  replace: false,
  buildState: () => undefined,
};

describe("IntentQueue", () => {
  it("takes a finishing write, then a tab operation, then changes", () => {
    const queue = new IntentQueue();
    queue.queueChange(change("a", 1), undefined);
    queue.queueTabsOp({ kind: "popToRoot" });
    queue.continueWith(write);

    expect(queue.takeNext()?.kind).toBe("continue");
    expect(queue.takeNext()?.kind).toBe("tabs");
    expect(queue.takeNext()).toEqual({
      kind: "changes",
      changes: [change("a", 1)],
    });
    expect(queue.takeNext()).toBeNull();
  });

  it("keeps the latest change per key and the latest tab operation", () => {
    const queue = new IntentQueue();
    queue.queueChange(change("a", 1), undefined);
    queue.queueChange(change("a", 2), undefined);
    queue.queueTabsOp({ kind: "select", tab: "x" });
    queue.queueTabsOp({ kind: "select", tab: "y" });

    expect(queue.takeNext()).toEqual({
      kind: "tabs",
      op: { kind: "select", tab: "y" },
    });
    expect(queue.takeNext()).toEqual({
      kind: "changes",
      changes: [change("a", 2)],
    });
  });

  it("cancels a queued change that sets the value back", () => {
    const queue = new IntentQueue();
    queue.queueChange(change("a", 1), undefined);
    queue.queueChange(change("a", undefined), undefined);

    expect(queue.takeNext()).toBeNull();
  });

  it("knows when tab work is still queued", () => {
    const queue = new IntentQueue();
    expect(queue.hasTabsWork).toBe(false);

    queue.continueWith(write);
    expect(queue.hasTabsWork).toBe(true);

    queue.takeNext();
    expect(queue.hasTabsWork).toBe(false);
  });
});
