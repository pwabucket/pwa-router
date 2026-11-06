import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, type Location } from "react-router";
import { planChanges, type ValueChange } from "../../core/planChanges";
import { createStepId } from "../../core/stepIds";
import {
  questionChange,
  type LeaveGuardRegistry,
} from "../../utils/leaveGuards";
import {
  planTabsOp,
  popToStep,
  readWriteLocation,
  type TabsOp,
  type TabsPlan,
  type TabsWrite,
} from "../../core/planTabs";
import {
  type EntryRecord,
  findArea,
  readEntry,
} from "../../core/record";
import type { CloseTarget } from "../../core/steps";
import type { TabsConfig, TabsMemory } from "../../core/tabs";
import type { EngineWork } from "./EngineWork";
import {
  writeChanges,
  writeClose,
  writeLanding,
  writeTabsEntry,
} from "./historyWrites";
import { IntentQueue } from "./IntentQueue";

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

/** Memory of an area before any of its entries has settled */
const EMPTY_MEMORY: TabsMemory = { version: 0, saved: {} };

/** Sets the location kept on show while the engine crosses other entries */
type ShowLocation = (
  update: (shown: Location | null) => Location | null,
) => void;

/** An empty overlay */
const EMPTY_OVERLAY: LocationStateOverlay = new Map();

/** Runs queued intents (value changes and tab operations) one navigation at a time */
const useLocationStateTransactions = (
  location: Location,
  isCorrecting: boolean,
  guards: LeaveGuardRegistry,
  tabsBinding: TabsBinding,
  work: EngineWork,
  showLocation: ShowLocation,
) => {
  const navigate = useNavigate();
  const [overlay, setOverlay] = useState(EMPTY_OVERLAY);
  const [pendingTabsOp, setPendingTabsOp] = useState<TabsOp | null>(null);

  /* The latest inputs, read when flushing */
  const latestRef = useRef({ location, isCorrecting, navigate, tabsBinding });

  // oxlint-disable-next-line react/refs
  latestRef.current = { location, isCorrecting, navigate, tabsBinding };

  /* Queued intents, and the values of the work in flight */
  const intentsRef = useRef(new IntentQueue());
  const sentValuesRef = useRef<Map<string, unknown> | null>(null);
  const isFlushScheduledRef = useRef(false);

  /** Publishes the values on their way: queued ones over in-flight ones */
  const publishOverlay = useCallback(() => {
    const values = new Map(sentValuesRef.current);
    for (const [key, change] of intentsRef.current.queuedChanges) {
      values.set(key, change.value);
    }
    setOverlay(values.size ? values : EMPTY_OVERLAY);
  }, []);

  /** Marks work as sent from the given entry, with the values it carries */
  const markSent = useCallback(
    (values: Map<string, unknown>, location: Location) => {
      sentValuesRef.current = values;
      work.send(location.key);
    },
    [work],
  );

  /** Ends the running tab operation and releases the location on show */
  const endTabsOp = useCallback(() => {
    work.setOperating(false);
    setPendingTabsOp(null);
    showLocation(() => null);
  }, [work, showLocation]);

  /** Runs a tab plan: its close (its write continues once it lands), or its write alone */
  const runTabsPlan = useCallback(
    (plan: TabsPlan, location: Location) => {
      const { navigate } = latestRef.current;
      work.setOperating(true);
      markSent(new Map(), location);

      if (plan.landing !== undefined) {
        if (plan.write) intentsRef.current.continueWith(plan.write);
        writeLanding(navigate, plan.landing, location);
      } else if (plan.write) {
        writeTabsEntry(navigate, plan.write);
      }
    },
    [markSent, work],
  );

  /** The guard a tab plan would leave, if any */
  const findTabsBlocker = useCallback(
    (op: TabsOp, plan: TabsPlan, location: Location) => {
      if (op.kind === "exit") return guards.findAnyActive();
      if (op.kind === "select" || !plan.write) return undefined;
      return guards.findLeavingMove(location, readWriteLocation(plan.write));
    },
    [guards],
  );

  /** Sends a tab operation; false when nothing was sent */
  const sendTabsOp = useCallback(
    (op: TabsOp, location: Location) => {
      const { configs, record, memories, reset } =
        latestRef.current.tabsBinding;

      /* The operation's area: its config, its record and its memory */
      const config = configs.find((candidate) => candidate.id === op.area);
      const area = findArea(record, op.area);
      const memory = memories[op.area] ?? EMPTY_MEMORY;

      /* Nothing to do: the operation is over */
      const entry = area && { location, record, area };
      const plan =
        config &&
        entry &&
        planTabsOp(op, config, entry, memory, createStepId);
      if (!plan) {
        endTabsOp();
        return false;
      }

      /* A move losing unsaved work waits; its question opens instead */
      const blockedGuardId = findTabsBlocker(op, plan, location);

      if (blockedGuardId) {
        const question = questionChange(blockedGuardId);
        guards.block({ kind: "tabs", guardId: blockedGuardId, op });
        intentsRef.current.queueChange(question, undefined);
        endTabsOp();
        return false;
      }

      /* Leaving the area forgets every tab's pages */
      if (op.kind === "exit") reset(op.area);

      runTabsPlan(plan, location);
      return true;
    },
    [endTabsOp, findTabsBlocker, guards, runTabsPlan],
  );

  /** Closes onto a virtual step: land on the tab's lowest real entry if needed, then replace it */
  const writeVirtualPop = useCallback(
    (
      target: Extract<CloseTarget, { kind: "virtualPop" }>,
      location: Location,
    ) => {
      const { navigate } = latestRef.current;
      const { record } = readEntry(location.state);
      const area = findArea(record, target.area)!;

      /* The step, shown in the lowest real entry */
      const write: TabsWrite = {
        to: {
          pathname: target.step.snapshot?.pathname ?? location.pathname,
          search: target.step.snapshot?.search ?? "",
          hash: target.step.snapshot?.hash ?? "",
        },
        replace: true,
        stamp: target.position,
        buildState: () =>
          popToStep(area, record, target.step.id, target.position),
      };

      if (target.landBefore === null) {
        writeTabsEntry(navigate, write);
      } else {
        intentsRef.current.continueWith(write);
        writeLanding(navigate, target.landBefore, location);
      }
    },
    [],
  );

  /** Sends value changes as one transaction; false when nothing was sent */
  const sendChanges = useCallback(
    (queued: ValueChange[], location: Location) => {
      const { navigate } = latestRef.current;

      /* Plan against the current entry */
      const entry = { key: location.key, ...readEntry(location.state) };
      let changes = queued;
      let plan = planChanges(entry, changes, createStepId);

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
        intentsRef.current.requeueChanges(plan.followUps);

        const closed = plan.keys.map((key): [string, unknown] => [
          key,
          undefined,
        ]);
        markSent(new Map(closed), location);

        if (plan.target.kind === "virtualPop") {
          writeVirtualPop(plan.target, location);
        } else {
          writeClose(navigate, plan.target, location);
        }
        return true;
      }

      /* A write sends every change */
      const written = changes.map(({ key, value }): [string, unknown] => [
        key,
        value,
      ]);
      markSent(new Map(written), location);
      writeChanges(navigate, plan, location);
      return true;
    },
    [guards, markSent, writeVirtualPop],
  );

  /** Sends intents in order until one navigates, when nothing is in flight */
  const send = useCallback(() => {
    const { location, isCorrecting, navigate } = latestRef.current;
    if (work.isSent || isCorrecting) return;

    for (
      let intent = intentsRef.current.takeNext();
      intent;
      intent = intentsRef.current.takeNext()
    ) {
      /* A running operation's finishing write */
      if (intent.kind === "continue") {
        markSent(new Map(), location);
        writeTabsEntry(navigate, intent.write);
        return;
      }

      const isSent =
        intent.kind === "tabs"
          ? sendTabsOp(intent.op, location)
          : sendChanges(intent.changes, location);

      if (isSent) return;
    }
  }, [work, markSent, sendTabsOp, sendChanges]);

  /** Sends what it can and shows every value on its way */
  const flush = useCallback(() => {
    isFlushScheduledRef.current = false;
    send();
    publishOverlay();
  }, [send, publishOverlay]);

  /** Flushes once at the end of the tick */
  const scheduleFlush = useCallback(() => {
    if (isFlushScheduledRef.current) return;
    isFlushScheduledRef.current = true;
    queueMicrotask(flush);
  }, [flush]);

  /* A new location with the engine idle means the work landed */
  useLayoutEffect(() => {
    if (isCorrecting) return;
    if (work.isSent && !work.hasLanded(location.key)) return;

    sentValuesRef.current = null;
    work.land();

    /* Ask the question of a guard whose blocked move was undone */
    const questionGuardId = guards.takePendingQuestion();

    if (questionGuardId) {
      const question = questionChange(questionGuardId);
      intentsRef.current.queueChange(question, undefined);
    }

    flush();

    /* A tab operation is done once nothing of it is left */
    const isTabsOpDone = !work.isSent && !intentsRef.current.hasTabsWork;
    if (isTabsOpDone && work.isOperating) endTabsOp();
  }, [location.key, isCorrecting, flush, guards, work, endTabsOp]);

  /** Queues a change; changes in one tick share one flush, which shows them */
  const queueChange = useCallback<QueueLocationStateChange>(
    (change) => {
      const sentValues = sentValuesRef.current;

      /* The value the key has, or is on its way to */
      const baseValue = sentValues?.has(change.key)
        ? sentValues.get(change.key)
        : latestRef.current.location.state?.[change.key];

      intentsRef.current.queueChange(change, baseValue);
      scheduleFlush();
    },
    [scheduleFlush],
  );

  /** Queues a tab operation; the latest one in a tick wins */
  const queueTabsOp = useCallback<QueueTabsOp>(
    (op) => {
      /* The screen stays on the location from before the first pending operation */
      const { location } = latestRef.current;
      intentsRef.current.queueTabsOp(op);
      setPendingTabsOp(op);
      showLocation((shown) => shown ?? location);
      scheduleFlush();
    },
    [scheduleFlush, showLocation],
  );

  /* The tab being switched to, shown at once */
  const pendingTab =
    pendingTabsOp?.kind === "select"
      ? { area: pendingTabsOp.area, tab: pendingTabsOp.tab }
      : null;

  return { overlay, pendingTab, queueChange, queueTabsOp };
};

export { useLocationStateTransactions };
export type {
  LocationStateOverlay,
  QueueLocationStateChange,
  QueueTabsOp,
  ShowLocation,
  TabsBinding,
};
