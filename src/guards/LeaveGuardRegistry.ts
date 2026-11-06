import type { Location } from "react-router";

import type {
  ChangesPlan,
  PlanEntry,
  ValueChange,
} from "../engine/core/planChanges";
import { ROUTER_GUARD } from "../constants";
import { readValuePosition } from "../engine/core/queries";
import {
  readWriteLocation,
  type TabsOp,
  type TabsPlan,
} from "../tabs/core/planTabsOp";
import { readActiveTab } from "../tabs/core/tabs";

/** A registered leave guard */
interface LeaveGuard {
  /** The guarded layer's key; without one the guard covers its page */
  key?: string;
  /** The guarded page */
  pathname: string;
  /** The area and tab the guard lives in, when inside a tabbed area */
  tab?: { area: string; tab: string };
  /** There is unsaved work to protect */
  when: boolean;
  /** The user chose to leave; the guard rests until the move lands */
  isLeaving: boolean;
}

/** A blocked move, replayed when the user chooses to leave */
type BlockedAttempt =
  | { kind: "pop"; guardId: string; targetIndex: number }
  | { kind: "navigation"; guardId: string; location: Location }
  | { kind: "changes"; guardId: string; changes: ValueChange[] }
  | { kind: "tabs"; guardId: string; op: TabsOp };

/** The guard's scope holds the location: its tab, then its layer or page */
const isInside = (guard: LeaveGuard, location: Partial<Location>) => {
  const activeTab = guard.tab && readActiveTab(location.state, guard.tab.area);
  if (guard.tab && activeTab && activeTab !== guard.tab.tab) return false;

  return guard.key
    ? location.state?.[guard.key] != null
    : location.pathname === guard.pathname;
};

/** The guard protects unsaved work right now */
const isActive = (guard: LeaveGuard) => guard.when && !guard.isLeaving;

/** The plan unsets the guarded layer */
const planLeavesLayer = (entry: PlanEntry, plan: ChangesPlan, key: string) => {
  if (entry.state[key] == null) return false;

  /* A close removes its keys, and every layer pushed at or after its landing */
  if (plan.kind === "close") {
    if (plan.keys.includes(key)) return true;
    if (plan.target.kind !== "land") return false;

    const latest = readValuePosition(entry.record, key, "latest");
    return latest !== undefined && latest >= plan.target.before;
  }

  /* A write clears it in place */
  return plan.kind === "write" && plan.state[key] == null;
};

/** The change opening (a guard id) or closing (undefined) the question layer */
const questionChange = (guardId?: string): ValueChange => ({
  key: ROUTER_GUARD,
  value: guardId,
  persist: false,
  inherit: false,
  replace: false,
});

/** The leave guards of one router and the move they blocked */
class LeaveGuardRegistry {
  private guards = new Map<string, LeaveGuard>();

  /** The blocked move waiting for an answer */
  private attempt: BlockedAttempt | null = null;

  /** A guard whose question opens once the history is restored */
  private pendingQuestion: string | null = null;

  /** Records a blocked move */
  block(attempt: BlockedAttempt) {
    this.attempt = attempt;
  }

  /** Takes the blocked move, leaving none */
  takeAttempt() {
    const attempt = this.attempt;
    this.attempt = null;
    return attempt;
  }

  /** Asks for a guard's question once the history is restored */
  requestQuestion(guardId: string) {
    this.pendingQuestion = guardId;
  }

  /** Takes the guard whose question should open, leaving none */
  takePendingQuestion() {
    const guardId = this.pendingQuestion;
    this.pendingQuestion = null;
    return guardId;
  }

  /** Registers or updates a guard */
  set(id: string, guard: Omit<LeaveGuard, "isLeaving">) {
    const isLeaving = this.guards.get(id)?.isLeaving ?? false;
    this.guards.set(id, { ...guard, isLeaving });
  }

  /** Removes a guard */
  delete(id: string) {
    this.guards.delete(id);
  }

  /** Lets a guard's move through; it rests until the move lands */
  markLeaving(id: string) {
    const guard = this.guards.get(id);
    if (guard) guard.isLeaving = true;
  }

  /** Wakes guards whose move has landed outside their scope */
  settle(location: Location) {
    for (const guard of this.guards.values()) {
      if (guard.isLeaving && !isInside(guard, location)) {
        guard.isLeaving = false;
      }
    }
  }

  /** The first active guard that a move between two locations leaves */
  findLeavingMove(from: Location, to: Partial<Location>) {
    for (const [id, guard] of this.guards) {
      if (isActive(guard) && isInside(guard, from) && !isInside(guard, to)) {
        return id;
      }
    }
    return undefined;
  }

  /** The first active guard, whatever its scope */
  findAnyActive() {
    for (const [id, guard] of this.guards) {
      if (isActive(guard)) return id;
    }
    return undefined;
  }

  /** The guard a tab operation leaves: any active one on exit, none on a switch, else the one its write leaves */
  findLeavingTabsOp(op: TabsOp, plan: TabsPlan, location: Location) {
    if (op.kind === "exit") return this.findAnyActive();
    if (op.kind === "select" || !plan.write) return undefined;
    return this.findLeavingMove(location, readWriteLocation(plan.write));
  }

  /** The first active layer guard that a transaction plan leaves */
  findLeavingPlan(entry: PlanEntry, plan: ChangesPlan) {
    for (const [id, guard] of this.guards) {
      if (!guard.key || !isActive(guard)) continue;
      if (planLeavesLayer(entry, plan, guard.key)) return id;
    }
    return undefined;
  }
}

export { LeaveGuardRegistry, questionChange };
export type { BlockedAttempt, LeaveGuard };
