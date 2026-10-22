import { useCallback, useLayoutEffect, useRef } from "react";

/** queued: flushes this tick; sent: navigating; waiting: goes once the navigation lands */
type PendingStatus = "queued" | "sent" | "waiting";

interface PendingState {
  value: unknown;
  status: PendingStatus;
  /** Navigates to the value, as the latest caller asked */
  apply: () => void;
  /** The value on the current entry */
  readEntryValue: () => unknown;
}

/** Signature of the setter shared by every useLocationState of a key */
type SetPendingState = (
  key: string,
  value: unknown,
  apply: () => void,
  readEntryValue: () => unknown,
) => void;

/** Batches location state updates per key like setState: one navigation for the net change */
const usePendingStates = (locationKey: string, isCorrecting: boolean) => {
  const statesRef = useRef(new Map<string, PendingState>());

  /** Navigates for the latest queued value, or drops it when it matches the entry */
  const flush = useCallback((key: string) => {
    const state = statesRef.current.get(key);
    if (state?.status !== "queued") return;

    if (Object.is(state.value, state.readEntryValue())) {
      statesRef.current.delete(key);
      return;
    }

    statesRef.current.set(key, { ...state, status: "sent" });
    state.apply();
  }, []);

  /* A new location means sent navigations landed */
  useLayoutEffect(() => {
    for (const [key, state] of statesRef.current) {
      if (state.status === "sent") statesRef.current.delete(key);
    }
  }, [locationKey]);

  /* Waiting values go once nothing is in flight and the engine is idle */
  useLayoutEffect(() => {
    if (isCorrecting) return;

    for (const [key, state] of statesRef.current) {
      if (state.status !== "waiting") continue;
      statesRef.current.set(key, { ...state, status: "queued" });
      flush(key);
    }
  }, [locationKey, isCorrecting, flush]);

  return useCallback<SetPendingState>(
    (key, value, apply, readEntryValue) => {
      const state = statesRef.current.get(key);
      const baseValue = state ? state.value : readEntryValue();

      /* Setting the value it already has, or is about to have, does nothing */
      if (Object.is(value, baseValue)) return;

      /* A navigation for this key is still on its way */
      if (state?.status === "sent" || state?.status === "waiting") {
        statesRef.current.set(key, {
          value,
          apply,
          readEntryValue,
          status: "waiting",
        });
        return;
      }

      statesRef.current.set(key, {
        value,
        apply,
        readEntryValue,
        status: "queued",
      });

      /* Calls in the same tick share one flush */
      if (state?.status !== "queued") queueMicrotask(() => flush(key));
    },
    [flush],
  );
};

export { usePendingStates };
export type { SetPendingState };
