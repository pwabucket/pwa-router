import type { NavigateOptions } from "react-router";
import { markEphemeral, unmarkEphemeral } from "./ephemeralState";
import {
  readLayer,
  readLayers,
  writeLayers,
  type LayerStampMap,
} from "./layers";
import type { LocationState } from "./location";
import {
  isNonInheritedEntry,
  markNonInherited,
  readNonInheritedKeys,
  removeNonInheritedValues,
  unmarkNonInherited,
} from "./nonInheritedState";

/** Options for setting a location state value */
interface SetLocationStateOptions extends NavigateOptions {
  /** When clearing, go back to before the value's first push instead of its latest */
  toStart?: boolean;
}

/** A queued change to one location state key */
interface LocationStateChange {
  key: string;
  /** The new value; undefined clears it */
  value: unknown;
  /** Keep the value after a page reload */
  persist: boolean;
  /** Carry the value into entries pushed by other keys */
  inherit: boolean;
  /** Update the current entry in place instead of pushing */
  replace: boolean;
  options?: SetLocationStateOptions;
}

/** Nothing to navigate: every change matches the entry */
interface NonePlan {
  type: "none";
}

/** Go back to before the earliest closed value, then apply the rest there */
interface ClosePlan {
  type: "close";
  /** The closed keys */
  keys: string[];
  /** The stamp to land before; null goes back one entry */
  landing: number | null;
  /** Changes applied once the close has landed */
  followUps: LocationStateChange[];
}

/** One push or replace holding every change */
interface WritePlan {
  type: "write";
  replace: boolean;
  state: Record<string, unknown>;
  /** The current entry's state to write in place before pushing */
  inPlaceState?: Record<string, unknown>;
  /** Keys to stamp with the history length once pushed */
  pushedKeys: string[];
  options: NavigateOptions;
}

/** How a transaction navigates */
type TransactionPlan = NonePlan | ClosePlan | WritePlan;

/** The change updates the current entry in place */
const isInPlace = (change: LocationStateChange) =>
  change.replace || change.options?.replace === true;

/** The stamp to land before when closing a change, null when unstamped */
const readLanding = (state: LocationState, change: LocationStateChange) => {
  const stamp = readLayer(state, change.key);
  if (!stamp) return null;
  return change.options?.toStart ? stamp.start : stamp.latest;
};

/** Plans a close of every cleared layer; the other changes follow it */
const planClose = (
  state: LocationState,
  changes: LocationStateChange[],
  closes: LocationStateChange[],
): ClosePlan => {
  /* The earliest stamped landing wins, as it closes everything above */
  const landings = closes
    .map((change) => readLanding(state, change))
    .filter((landing) => landing !== null);

  return {
    type: "close",
    keys: closes.map((change) => change.key),
    landing: landings.length ? Math.min(...landings) : null,
    followUps: changes.filter((change) => !closes.includes(change)),
  };
};

/** The stamp a push takes when it replaces non-inherited entries (a swap) */
const readReplacedStamp = (state: LocationState) => {
  const latests = readNonInheritedKeys(state)
    .map((key) => readLayer(state, key)?.latest)
    .filter((latest) => latest !== undefined);

  return latests.length ? Math.max(...latests) : undefined;
};

/** Applies changes to a state, with their marks, and collects their navigation options */
const applyChanges = (
  state: LocationState,
  changes: LocationStateChange[],
) => {
  let next: Record<string, unknown> = { ...state };
  let options: NavigateOptions = {};

  for (const change of changes) {
    /* Navigation options, the latest change winning */
    const { state: statePatch, replace: _, toStart: __, ...rest } =
      change.options ?? {};
    options = { ...options, ...rest };

    /* The value with its state patch and marks */
    next = {
      ...next,
      ...(statePatch as Record<string, unknown> | undefined),
      ...(change.persist
        ? unmarkEphemeral(next, change.key)
        : markEphemeral(next, change.key)),
      ...(change.inherit
        ? unmarkNonInherited(next, change.key)
        : markNonInherited(next, change.key)),
      [change.key]: change.value,
    };
  }

  /* Unset values lose their stamps */
  const layers: LayerStampMap = { ...readLayers(next) };
  for (const key of Object.keys(layers)) {
    if (next[key] == null) delete layers[key];
  }

  return { state: { ...next, ...writeLayers(layers) }, options };
};

/** Plans the writes holding every change: in place first, then one push */
const planWrite = (
  state: LocationState,
  changes: LocationStateChange[],
): WritePlan => {
  /* Values that add an entry, and values updated in place */
  const pushes = changes.filter(
    (change) => change.value !== undefined && !isInPlace(change),
  );
  const inPlaceChanges = changes.filter((change) => !pushes.includes(change));

  /* The current entry with the in-place values */
  const current = applyChanges(state, inPlaceChanges);

  if (!pushes.length) {
    return {
      type: "write",
      replace: true,
      state: current.state,
      pushedKeys: [],
      options: current.options,
    };
  }

  /* A push from a non-inherited entry takes its place (a swap) */
  const replacesEntry = isNonInheritedEntry(state);

  /* Pushed entries leave non-inherited values behind */
  const pushed = applyChanges(
    removeNonInheritedValues(current.state),
    pushes,
  );
  const options = { ...current.options, ...pushed.options };

  /* In-place values also stay on the entry below the push */
  const inPlaceState =
    inPlaceChanges.length && !replacesEntry ? current.state : undefined;

  if (!replacesEntry) {
    return {
      type: "write",
      replace: false,
      state: pushed.state,
      inPlaceState,
      pushedKeys: pushes.map((change) => change.key),
      options,
    };
  }

  /* A swap takes the replaced entry's stamp */
  const replacedStamp = readReplacedStamp(state);
  const layers: LayerStampMap = { ...readLayers(pushed.state) };

  if (replacedStamp !== undefined) {
    for (const { key } of pushes) {
      const start = readLayer(state, key)?.start ?? replacedStamp;
      layers[key] = { start, latest: replacedStamp };
    }
  }

  return {
    type: "write",
    replace: true,
    state: { ...pushed.state, ...writeLayers(layers) },
    pushedKeys: [],
    options,
  };
};

/** Plans the single navigation for every change queued in one tick */
const planTransaction = (
  state: LocationState,
  queued: LocationStateChange[],
): TransactionPlan => {
  /* Changes that differ from the entry */
  const changes = queued.filter(
    (change) => !Object.is(change.value, state?.[change.key]),
  );

  if (!changes.length) return { type: "none" };

  /* Cleared layers close first */
  const closes = changes.filter(
    (change) => change.value === undefined && !isInPlace(change),
  );

  return closes.length
    ? planClose(state, changes, closes)
    : planWrite(state, changes);
};

/** State with every pushed key stamped at the given history length */
const stampPushes = (
  previousState: LocationState,
  state: Record<string, unknown>,
  pushedKeys: string[],
  historyLength: number,
) => {
  const layers = { ...readLayers(state) };

  /* An updated value keeps its first push */
  for (const key of pushedKeys) {
    const start = readLayer(previousState, key)?.start ?? historyLength;
    layers[key] = { start, latest: historyLength };
  }

  return { ...state, ...writeLayers(layers) };
};

export { planTransaction, stampPushes };
export type {
  ClosePlan,
  LocationStateChange,
  SetLocationStateOptions,
  TransactionPlan,
  WritePlan,
};
