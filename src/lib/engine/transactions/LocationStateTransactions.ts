import type { Location, NavigateFunction } from "react-router";
import { planChanges, type ValueChange } from "../core/planChanges";
import { createStepId } from "../core/stepIds";
import {
  questionChange,
  type LeaveGuardRegistry,
} from "../../guards/LeaveGuardRegistry";
import {
  planTabsOp,
  type TabsOp,
  type TabsPlan,
} from "../../tabs/core/planTabsOp";
import { type EntryRecord, findArea, readEntry } from "../core/record";
import {
  EMPTY_TABS_MEMORY,
  type TabsConfig,
  type TabsMemory,
} from "../../tabs/core/tabs";
import type { EngineWork } from "../EngineWork";
import {
  writeChanges,
  writeClose,
  writeLanding,
  writeLandingThenEntry,
  writeTabsEntry,
  writeVirtualPop,
} from "../history/historyWrites";
import { IntentQueue } from "./IntentQueue";
import type { HistoryDriver } from "../driver/HistoryDriver";

/** Values on their way to the history, by key */
type LocationStateOverlay = ReadonlyMap<string, unknown>;

/** Queues a change; every change queued in one tick navigates once */
type QueueLocationStateChange = (change: ValueChange) => void;

/** Queues a tab operation; it runs before the location state changes */
type QueueTabsOp = (op: TabsOp) => void;

/** What the transactions need from the tabbed areas */
interface TabsBinding {
  configs: TabsConfig[];
  record: EntryRecord;
  memories: Record<string, TabsMemory>;
  reset: (id: string) => void;
}

/** Sets the location kept on show while the engine crosses other entries */
type ShowLocation = (
  update: (shown: Location | null) => Location | null,
) => void;

/** The latest render's inputs, read when sending */
interface TransactionsInputs {
  location: Location;
  isCorrecting: boolean;
  navigate: NavigateFunction;
  tabs: TabsBinding;
}

/** What the transactions work with: where they publish what screens show, the guards and the work */
interface TransactionsDeps {
  /** The values on their way to the history */
  setOverlay: (overlay: LocationStateOverlay) => void;
  /** The tab operation waiting to run, to show its tab at once */
  setPendingTabsOp: (op: TabsOp | null) => void;
  showLocation: ShowLocation;
  guards: LeaveGuardRegistry;
  work: EngineWork;
  /** Runs the closes that land below the current entry */
  driver: HistoryDriver;
}

/** An empty overlay */
const EMPTY_OVERLAY: LocationStateOverlay = new Map();

/** Runs queued intents (value changes and tab operations) one navigation at a time */
class LocationStateTransactions {
  /* Queued intents, the values of the work in flight, and a flush waiting for the end of the tick */
  #intents = new IntentQueue();
  #sentValues: Map<string, unknown> | null = null;
  #isFlushScheduled = false;

  /* The latest render's inputs, and what the transactions work with */
  #inputs: TransactionsInputs;
  readonly #deps: TransactionsDeps;

  /** Creates the transactions from the first render's inputs and what they work with */
  constructor(inputs: TransactionsInputs, deps: TransactionsDeps) {
    this.#inputs = inputs;
    this.#deps = deps;
  }

  /** Takes the latest render's inputs */
  update(inputs: TransactionsInputs) {
    this.#inputs = inputs;
  }

  /** Queues a change; changes in one tick share one flush, which shows them */
  queueChange: QueueLocationStateChange = (change) => {
    /* The values of the work in flight */
    const sentValues = this.#sentValues;

    /* The value the key has, or is on its way to */
    const baseValue = sentValues?.has(change.key)
      ? sentValues.get(change.key)
      : this.#inputs.location.state?.[change.key];

    /* Queue the change and flush at the end of the tick */
    this.#intents.queueChange(change, baseValue);
    this.#scheduleFlush();
  };

  /** Queues a tab operation; the latest one in a tick wins */
  queueTabsOp: QueueTabsOp = (op) => {
    /* The screen stays on the location from before the first pending operation */
    const { location } = this.#inputs;
    this.#intents.queueTabsOp(op);
    this.#deps.setPendingTabsOp(op);
    this.#deps.showLocation((shown) => shown ?? location);
    this.#scheduleFlush();
  };

  /** Lands the work in flight once a new location settles, then sends what's next */
  settle() {
    /* Wait until the work in flight has landed on the new location */
    const { work, guards } = this.#deps;
    const { location, isCorrecting } = this.#inputs;
    if (isCorrecting) return;
    if (work.isSent && !work.hasLanded(location.key)) return;

    /* Land the work in flight */
    this.#sentValues = null;
    work.land();

    /* Ask the question of a guard whose blocked move was undone */
    const questionGuardId = guards.takePendingQuestion();

    if (questionGuardId) {
      const question = questionChange(questionGuardId);
      this.#intents.queueChange(question, undefined);
    }

    /* Send what's next and show the values on their way */
    this.#flush();

    /* A tab operation is done once nothing of it is left */
    const isTabsOpDone = !work.isSent && !this.#intents.hasTabsWork;
    if (isTabsOpDone && work.isOperating) this.#endTabsOp();
  }

  /** Flushes once at the end of the tick */
  #scheduleFlush() {
    /* Schedule one flush per tick */
    if (this.#isFlushScheduled) return;
    this.#isFlushScheduled = true;
    queueMicrotask(() => this.#flush());
  }

  /** Sends what it can and shows every value on its way */
  #flush() {
    /* Clear the scheduled flush, send, then publish */
    this.#isFlushScheduled = false;
    this.#send();
    this.#publishOverlay();
  }

  /** Publishes the values on their way: queued ones over in-flight ones */
  #publishOverlay() {
    /* The in-flight values, with the queued ones over them */
    const values = new Map(this.#sentValues);
    for (const [key, change] of this.#intents.queuedChanges) {
      values.set(key, change.value);
    }

    /* Publish them, or the empty overlay when there are none */
    this.#deps.setOverlay(values.size ? values : EMPTY_OVERLAY);
  }

  /** Sends intents in order until one navigates, when nothing is in flight */
  #send() {
    /* Wait while work is in flight or a correction runs */
    const { location, isCorrecting } = this.#inputs;
    if (this.#deps.work.isSent || isCorrecting) return;

    /* Take the queued intents in order */
    for (
      let intent = this.#intents.takeNext();
      intent;
      intent = this.#intents.takeNext()
    ) {
      /* A tab operation or value changes; stop once one is sent */
      const isSent =
        intent.kind === "tabs"
          ? this.#sendTabsOp(intent.op, location)
          : this.#sendChanges(intent.changes, location);

      if (isSent) return;
    }
  }

  /** Marks work as sent from the given entry, with the values it carries */
  #markSent(values: Map<string, unknown>, location: Location) {
    this.#sentValues = values;
    this.#deps.work.send(location.key);
  }

  /** Ends the running tab operation and releases the location on show */
  #endTabsOp() {
    this.#deps.work.setOperating(false);
    this.#deps.setPendingTabsOp(null);
    this.#deps.showLocation(() => null);
  }

  /** Runs a tab plan: its close then its write as one intent, its close alone, or its write alone */
  #runTabsPlan(plan: TabsPlan, location: Location) {
    /* Mark the tab operation as running and sent */
    const { navigate } = this.#inputs;
    this.#deps.work.setOperating(true);
    this.#markSent(new Map(), location);

    /* Close then write, close alone, or write alone */
    const { driver } = this.#deps;
    if (plan.landing !== undefined && plan.write) {
      writeLandingThenEntry(driver, plan.landing, location, plan.write);
    } else if (plan.landing !== undefined) {
      writeLanding(navigate, driver, plan.landing, location);
    } else if (plan.write) {
      writeTabsEntry(navigate, plan.write);
    }
  }

  /** Sends a tab operation; false when nothing was sent */
  #sendTabsOp(op: TabsOp, location: Location) {
    /* The guards and the tabbed areas */
    const { guards } = this.#deps;
    const { configs, record, memories, reset } = this.#inputs.tabs;

    /* The operation's area: its config, its record and its memory */
    const config = configs.find((candidate) => candidate.id === op.area);
    const area = findArea(record, op.area);
    const memory = memories[op.area] ?? EMPTY_TABS_MEMORY;

    /* Nothing to do: the operation is over */
    const entry = area && { location, record, area };
    const plan =
      config && entry && planTabsOp(op, config, entry, memory, createStepId);
    if (!plan) {
      this.#endTabsOp();
      return false;
    }

    /* A move losing unsaved work waits; its question opens instead */
    const blockedGuardId = guards.findLeavingTabsOp(op, plan, location);

    if (blockedGuardId) {
      const question = questionChange(blockedGuardId);
      guards.block({ kind: "tabs", guardId: blockedGuardId, op });
      this.#intents.queueChange(question, undefined);
      this.#endTabsOp();
      return false;
    }

    /* Leaving the area forgets every tab's steps */
    if (op.kind === "exit") reset(op.area);

    /* Run the plan */
    this.#runTabsPlan(plan, location);
    return true;
  }

  /** Sends value changes as one transaction; false when nothing was sent */
  #sendChanges(queued: ValueChange[], location: Location) {
    /* The guards and the router */
    const { guards } = this.#deps;
    const { navigate } = this.#inputs;

    /* Plan against the current entry */
    const entry = {
      key: location.key,
      address: location,
      ...readEntry(location.state),
    };
    let changes = queued;
    let plan = planChanges(entry, changes, createStepId);

    /* Nothing to change */
    if (plan.kind === "none") return false;

    /* A move leaving a guarded layer waits; its question opens instead */
    const blockedGuardId = guards.findLeavingPlan(entry, plan);

    if (blockedGuardId) {
      guards.block({ kind: "changes", guardId: blockedGuardId, changes });
      changes = [questionChange(blockedGuardId)];
      plan = planChanges(entry, changes, createStepId);

      /* The question is already open */
      if (plan.kind === "none") return false;
    }

    /* A close sends only the closed keys; the rest follow once it lands */
    if (plan.kind === "close") {
      this.#intents.requeueChanges(plan.followUps);

      /* Send the closed keys as cleared */
      const closed = plan.keys.map((key): [string, unknown] => [
        key,
        undefined,
      ]);
      this.#markSent(new Map(closed), location);

      /* Close onto a virtual step, or back to the target */
      if (plan.target.kind === "virtualPop") {
        writeVirtualPop(navigate, this.#deps.driver, plan.target, location);
      } else {
        writeClose(navigate, this.#deps.driver, plan.target, location);
      }
      return true;
    }

    /* A write sends every change */
    const written = changes.map(({ key, value }): [string, unknown] => [
      key,
      value,
    ]);
    this.#markSent(new Map(written), location);
    writeChanges(navigate, plan, location);
    return true;
  }
}

export { LocationStateTransactions };
export type {
  LocationStateOverlay,
  QueueLocationStateChange,
  QueueTabsOp,
  ShowLocation,
  TabsBinding,
};
