import type { ValueChange } from "../core/planChanges";
import type { TabsOp } from "../../tabs/core/planTabsOp";

/** The next piece of work the engine sends */
type Intent =
  /** A tab operation */
  | { kind: "tabs"; op: TabsOp }
  /** Every queued value change, sent as one transaction */
  | { kind: "changes"; changes: ValueChange[] };

/** The engine's queued work, taken one intent at a time */
class IntentQueue {
  private tabsOp: TabsOp | null = null;
  private changes = new Map<string, ValueChange>();

  /** Queues a value change; one that sets the value the key has, or is on its way to, cancels the queued one */
  queueChange(change: ValueChange, baseValue: unknown) {
    /* Cancel a change back to the base value; queue any other */
    if (Object.is(change.value, baseValue)) this.changes.delete(change.key);
    else this.changes.set(change.key, change);
  }

  /** Queues changes to apply after the work in flight (a close's follow-ups) */
  requeueChanges(changes: ValueChange[]) {
    for (const change of changes) this.changes.set(change.key, change);
  }

  /** Queues a tab operation; the latest one wins */
  queueTabsOp(op: TabsOp) {
    this.tabsOp = op;
  }

  /** The queued value changes, by key */
  get queuedChanges(): ReadonlyMap<string, ValueChange> {
    return this.changes;
  }

  /** A tab operation is still queued */
  get hasTabsWork() {
    return this.tabsOp !== null;
  }

  /** Takes the next intent: a tab operation, then the value changes */
  takeNext(): Intent | null {
    /* A tab operation first */
    if (this.tabsOp) {
      const op = this.tabsOp;
      this.tabsOp = null;
      return { kind: "tabs", op };
    }

    /* Then every queued value change */
    if (this.changes.size) {
      const changes = [...this.changes.values()];
      this.changes.clear();
      return { kind: "changes", changes };
    }

    /* Nothing queued */
    return null;
  }
}

export { IntentQueue };
export type { Intent };
