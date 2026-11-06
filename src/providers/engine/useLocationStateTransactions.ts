import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, type Location } from "react-router";
import { routerState } from "../../constants";
import {
  questionChange,
  type LeaveGuardRegistry,
} from "../../utils/leaveGuards";
import { getLocationPath } from "../../utils/location";
import {
  planTransaction,
  stampPushes,
  type ClosePlan,
  type LocationStateChange,
  type WritePlan,
} from "../../utils/transaction";

/** Values on their way to the history, by key */
type LocationStateOverlay = ReadonlyMap<string, unknown>;

/** Queues a change; every change queued in one tick navigates once */
type QueueLocationStateChange = (change: LocationStateChange) => void;

/** Changes sent to the history and the entry they were sent from */
interface InFlightTransaction {
  values: Map<string, unknown>;
  locationKey: string;
}

/** An empty overlay */
const EMPTY_OVERLAY: LocationStateOverlay = new Map();

/** Runs location state changes as transactions, one navigation at a time */
const useLocationStateTransactions = (
  location: Location,
  isCorrecting: boolean,
  guards: LeaveGuardRegistry,
) => {
  const navigate = useNavigate();
  const [overlay, setOverlay] = useState(EMPTY_OVERLAY);

  /* The latest location, engine status and navigate, read when flushing */
  const latestRef = useRef({ location, isCorrecting, navigate });

  // oxlint-disable-next-line react/refs
  latestRef.current = { location, isCorrecting, navigate };

  /* Changes waiting for the next flush, and those sent but not landed */
  const queuedRef = useRef(new Map<string, LocationStateChange>());
  const inFlightRef = useRef<InFlightTransaction | null>(null);
  const isFlushScheduledRef = useRef(false);

  /** Publishes the values on their way: queued ones over in-flight ones */
  const publishOverlay = useCallback(() => {
    const values = new Map(inFlightRef.current?.values);
    for (const [key, change] of queuedRef.current) {
      values.set(key, change.value);
    }
    setOverlay(values.size ? values : EMPTY_OVERLAY);
  }, []);

  /** Navigates for a plan from the given location */
  const execute = useCallback(
    (plan: ClosePlan | WritePlan, location: Location) => {
      const { navigate } = latestRef.current;
      const path = getLocationPath(location);

      /* Close: land before the stamp, skipping entries made since (iframes) */
      if (plan.type === "close") {
        if (plan.landing !== null && plan.landing < window.history.length) {
          navigate(path, {
            replace: true,
            state: { ...location.state, ...routerState.destroy(plan.landing) },
          });
        } else if (plan.landing !== null || location.key !== "default") {
          navigate(-1);
        } else {
          /* Landed here directly, nothing to go back to */
          navigate("/", { replace: true });
        }
        return;
      }

      /* Write the in-place values on the current entry first */
      if (plan.inPlaceState) {
        navigate(path, {
          ...plan.options,
          replace: true,
          state: plan.inPlaceState,
        });
      }

      /* Write every change in one entry */
      navigate(path, {
        ...plan.options,
        replace: plan.replace,
        state: plan.state,
      });

      /* Stamp the pushed values with the entry's place in history */
      if (plan.pushedKeys.length) {
        navigate(path, {
          ...plan.options,
          replace: true,
          state: stampPushes(
            location.state,
            plan.state,
            plan.pushedKeys,
            window.history.length,
          ),
        });
      }
    },
    [],
  );

  /** Sends every queued change as one transaction, when nothing is in flight */
  const send = useCallback(() => {
    const { location, isCorrecting } = latestRef.current;
    const queued = queuedRef.current;
    if (inFlightRef.current || isCorrecting || !queued.size) return;

    /* Plan against the current entry */
    let changes = [...queued.values()];
    let plan = planTransaction(location.state, changes);
    queued.clear();

    if (plan.type === "none") return;

    /* A move leaving a guarded layer waits; its question opens instead */
    const blockedGuardId = guards.findLeavingPlan(location.state, plan);

    if (blockedGuardId) {
      guards.block({ kind: "changes", guardId: blockedGuardId, changes });
      changes = [questionChange(blockedGuardId)];
      plan = planTransaction(location.state, changes);

      /* The question is already open */
      if (plan.type === "none") return;
    }

    /* A close sends only the closed keys; the rest follow once it lands */
    if (plan.type === "close") {
      for (const change of plan.followUps) queued.set(change.key, change);
    }

    /* Track what was sent until the location changes */
    const sent =
      plan.type === "close"
        ? plan.keys.map((key): [string, unknown] => [key, undefined])
        : changes.map(({ key, value }): [string, unknown] => [key, value]);

    inFlightRef.current = { values: new Map(sent), locationKey: location.key };
    guards.setSending(true);
    execute(plan, location);
  }, [execute, guards]);

  /** Sends what it can and shows every value on its way */
  const flush = useCallback(() => {
    isFlushScheduledRef.current = false;
    send();
    publishOverlay();
  }, [send, publishOverlay]);

  /* A new location with the engine idle means the transaction landed */
  useLayoutEffect(() => {
    if (isCorrecting) return;

    const inFlight = inFlightRef.current;
    if (inFlight?.locationKey === location.key) return;

    inFlightRef.current = null;
    guards.setSending(false);

    /* Ask the question of a guard whose blocked move was undone */
    const questionGuardId = guards.takePendingQuestion();

    if (questionGuardId) {
      const change = questionChange(questionGuardId);
      queuedRef.current.set(change.key, change);
    }

    flush();
  }, [location.key, isCorrecting, flush, guards]);

  /** Queues a change; changes in one tick share one flush, which shows them */
  const queueChange = useCallback<QueueLocationStateChange>(
    (change) => {
      const queued = queuedRef.current;
      const inFlight = inFlightRef.current;

      /* The value the key has, or is on its way to */
      const baseValue = inFlight?.values.has(change.key)
        ? inFlight.values.get(change.key)
        : latestRef.current.location.state?.[change.key];

      /* Setting the value it has, or is on its way to, cancels the queued one */
      if (Object.is(change.value, baseValue)) queued.delete(change.key);
      else queued.set(change.key, change);

      /* Calls in the same tick share one flush */
      if (!isFlushScheduledRef.current) {
        isFlushScheduledRef.current = true;
        queueMicrotask(flush);
      }
    },
    [flush],
  );

  return { overlay, queueChange };
};

export { useLocationStateTransactions };
export type { LocationStateOverlay, QueueLocationStateChange };
